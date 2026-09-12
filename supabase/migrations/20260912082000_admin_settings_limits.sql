alter table private.listing_plan_settings
  add column if not exists store_product_active_limit integer not null default 100;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conname = 'listing_plan_store_active_limit') then
    alter table private.listing_plan_settings add constraint listing_plan_store_active_limit check (store_product_active_limit between 1 and 5000);
  end if;
end
$$;

create table if not exists private.plan_settings_versions (
  version integer primary key,
  personal_active_limit integer not null,
  store_product_active_limit integer not null,
  actor_id uuid references auth.users(id) on delete restrict,
  reason text not null,
  before_snapshot jsonb,
  after_snapshot jsonb not null,
  effective_at timestamptz not null default statement_timestamp(),
  constraint plan_settings_version_limits check (personal_active_limit between 1 and 1000 and store_product_active_limit between 1 and 5000),
  constraint plan_settings_version_reason check (char_length(reason) between 10 and 3000)
);
alter table private.plan_settings_versions enable row level security;
revoke all on private.plan_settings_versions from public, anon, authenticated;

insert into private.plan_settings_versions(version, personal_active_limit, store_product_active_limit, reason, after_snapshot)
select settings.version, settings.personal_active_limit, settings.store_product_active_limit, 'Baseline konfigurasi platform.', jsonb_build_object('personalActiveLimit', settings.personal_active_limit, 'storeProductActiveLimit', settings.store_product_active_limit)
from private.listing_plan_settings settings
where settings.singleton
  and not exists (select 1 from private.plan_settings_versions history where history.version = settings.version);

create or replace function private.plan_settings_dto()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'version', settings.version,
    'personalActiveLimit', settings.personal_active_limit,
    'storeProductActiveLimit', settings.store_product_active_limit,
    'maxStores', 3,
    'plusPriceRupiah', '20000',
    'personalActiveCount', (select count(*) from public.listings listing where listing.owner_id = auth.uid() and listing.store_id is null and listing.lifecycle = 'active'),
    'storeProductActiveCount', (select count(*) from public.listings listing join public.stores store on store.store_id = listing.store_id where store.owner_id = auth.uid() and listing.lifecycle = 'active')
  )
  from private.listing_plan_settings settings
  where settings.singleton
$$;

create or replace function private.can_manage_plan_limits(p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admin_roles where user_id = p_actor and role = 'admin' and active)
$$;

create or replace function public.get_plan_settings()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.plan_settings_dto()
$$;

create or replace function public.admin_get_plan_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_settings private.listing_plan_settings%rowtype; v_result jsonb;
begin
  if not private.can_manage_plan_limits(v_actor) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  select * into strict v_settings from private.listing_plan_settings where singleton;
  v_result := private.plan_settings_dto();
  return v_result || jsonb_build_object(
    'personalOverLimitOwners', (select count(*) from (select owner_id from public.listings where store_id is null and lifecycle = 'active' group by owner_id having count(*) > v_settings.personal_active_limit) owners),
    'storeOverLimitStores', (select count(*) from (select listing.store_id from public.listings listing where listing.store_id is not null and listing.lifecycle = 'active' group by listing.store_id having count(*) > v_settings.store_product_active_limit) stores)
  );
end
$$;

create or replace function public.update_plan_limits(p_expected_version integer, p_personal_active_limit integer, p_store_product_active_limit integer, p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_current private.listing_plan_settings%rowtype; v_receipt jsonb; v_payload jsonb; v_result jsonb; v_before jsonb; v_after jsonb;
begin
  if not private.can_manage_plan_limits(v_actor) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  if p_idempotency_key is null then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  if p_personal_active_limit is null or p_personal_active_limit not between 1 and 1000 or p_store_product_active_limit is null or p_store_product_active_limit not between 1 and 5000 or char_length(btrim(coalesce(p_reason, ''))) not between 10 and 3000 then raise exception using errcode = '22023', message = 'PLAN_LIMITS_INVALID'; end if;
  v_payload := jsonb_build_object('expectedVersion', p_expected_version, 'personalActiveLimit', p_personal_active_limit, 'storeProductActiveLimit', p_store_product_active_limit, 'reason', btrim(p_reason));
  v_receipt := private.begin_command(v_actor, 'update_plan_limits', p_idempotency_key, v_payload);
  if v_receipt is not null then return v_receipt; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('barter-plan-settings', 1));
  select * into strict v_current from private.listing_plan_settings where singleton for update;
  if v_current.version <> p_expected_version then raise exception using errcode = 'P0001', message = 'SETTINGS_VERSION_CONFLICT'; end if;
  v_before := jsonb_build_object('personalActiveLimit', v_current.personal_active_limit, 'storeProductActiveLimit', v_current.store_product_active_limit);
  v_after := jsonb_build_object('personalActiveLimit', p_personal_active_limit, 'storeProductActiveLimit', p_store_product_active_limit);
  update private.listing_plan_settings set personal_active_limit = p_personal_active_limit, store_product_active_limit = p_store_product_active_limit, version = version + 1;
  insert into private.plan_settings_versions(version, personal_active_limit, store_product_active_limit, actor_id, reason, before_snapshot, after_snapshot)
  values (v_current.version + 1, p_personal_active_limit, p_store_product_active_limit, v_actor, btrim(p_reason), v_before, v_after);
  v_result := public.admin_get_plan_settings();
  perform private.finish_command(v_actor, 'update_plan_limits', p_idempotency_key, v_payload, v_result);
  return v_result;
end
$$;

create or replace function public.list_settings_history(p_cursor integer default null, p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50)); v_items jsonb; v_next integer;
begin
  if not private.can_manage_plan_limits(v_actor) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('version', history.version, 'personalActiveLimit', history.personal_active_limit, 'storeProductActiveLimit', history.store_product_active_limit, 'reason', history.reason, 'actorName', profile.display_name, 'effectiveAt', to_char(history.effective_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by history.version desc), '[]'::jsonb), case when count(*) = v_limit then min(history.version) else null end
  into v_items, v_next
  from (select * from private.plan_settings_versions where (p_cursor is null or version < p_cursor) order by version desc limit v_limit) history
  left join public.profiles profile on profile.id = history.actor_id;
  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end
$$;

create or replace function private.enforce_store_product_active_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_limit integer; v_count integer;
begin
  if new.lifecycle = 'active' and new.store_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('barter-plan-settings', 1));
    select store_product_active_limit into strict v_limit from private.listing_plan_settings where singleton;
    select count(*) into v_count from public.listings listing where listing.store_id = new.store_id and listing.lifecycle = 'active' and listing.listing_id <> new.listing_id;
    if v_count >= v_limit then raise exception using errcode = 'P0001', message = 'STORE_PRODUCT_ACTIVE_LIMIT'; end if;
  end if;
  return new;
end
$$;

drop trigger if exists listings_store_product_limit on public.listings;
create trigger listings_store_product_limit before insert or update of store_id, lifecycle on public.listings for each row execute function private.enforce_store_product_active_limit();

revoke all on function private.plan_settings_dto(), private.can_manage_plan_limits(uuid), private.enforce_store_product_active_limit(), public.get_plan_settings(), public.admin_get_plan_settings(), public.update_plan_limits(integer, integer, integer, text, uuid), public.list_settings_history(integer, integer) from public, anon, authenticated;
grant execute on function public.get_plan_settings() to authenticated;
grant execute on function public.admin_get_plan_settings(), public.update_plan_limits(integer, integer, integer, text, uuid), public.list_settings_history(integer, integer) to authenticated;
