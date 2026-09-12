create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete restrict,
  plan text not null default 'plus',
  paid_through timestamptz not null,
  source text not null default 'dummy',
  last_billing_order_id uuid,
  updated_at timestamptz not null default statement_timestamp(),
  constraint subscriptions_plan check (plan = 'plus'),
  constraint subscriptions_source check (source = 'dummy')
);
create table public.billing_orders (
  billing_order_id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  amount_rupiah bigint not null default 20000,
  currency text not null default 'IDR',
  method text not null,
  mode text not null default 'dummy',
  status text not null default 'pending',
  expires_at timestamptz not null default (statement_timestamp() + interval '30 minutes'),
  activated_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint billing_amount check (amount_rupiah = 20000 and currency = 'IDR'),
  constraint billing_method check (method in ('qris', 'virtual_account')),
  constraint billing_mode check (mode = 'dummy'),
  constraint billing_status check (status in ('pending', 'succeeded', 'failed', 'expired'))
);
create index billing_orders_buyer_recent_idx on public.billing_orders(buyer_id, created_at desc);

create table public.stores (
  store_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  area_id text not null references public.service_areas(area_id),
  area_label text not null,
  operating_hours text not null default '',
  handover_methods text[] not null default array['meetup']::text[],
  public_address text,
  public_address_consent boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint stores_slug check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$'),
  constraint stores_name check (char_length(name) between 2 and 120),
  constraint stores_description check (char_length(description) <= 2000),
  constraint stores_category check (char_length(category) between 2 and 80),
  constraint stores_area check (char_length(area_label) between 2 and 120),
  constraint stores_handover check (cardinality(handover_methods) > 0 and handover_methods <@ array['pickup','meetup','delivery']::text[]),
  constraint stores_status check (status in ('active', 'hidden'))
);
create index stores_owner_idx on public.stores(owner_id, created_at desc);
alter table public.listings add constraint listings_store_owner_fk foreign key (store_id) references public.stores(store_id) on delete restrict;

alter table public.subscriptions enable row level security;
alter table public.billing_orders enable row level security;
alter table public.stores enable row level security;
create or replace function private.plus_active(p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.subscriptions where user_id = p_actor and paid_through > statement_timestamp()) $$;
create or replace function private.store_public_visible(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.stores store where store.store_id = p_store_id and store.status = 'active' and private.plus_active(store.owner_id)) $$;
create policy subscriptions_owner_read on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy billing_owner_read on public.billing_orders for select to authenticated using (buyer_id = (select auth.uid()));
create policy stores_public_read on public.stores for select to anon, authenticated using (private.store_public_visible(store_id) or owner_id = (select auth.uid()));
revoke all on public.subscriptions, public.billing_orders, public.stores from public, anon, authenticated;
grant select on public.subscriptions, public.billing_orders, public.stores to authenticated;
grant select on public.stores to anon;

create or replace function public.get_plus_status()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('priceRupiah', '20000', 'maxStores', 3, 'active', private.plus_active(auth.uid()), 'paidThrough', (select paid_through from public.subscriptions where user_id = auth.uid()), 'storeCount', (select count(*) from public.stores where owner_id = auth.uid()))
$$;
create or replace function public.create_plus_billing_order(p_method text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if p_method not in ('qris', 'virtual_account') then raise exception using errcode = '22023', message = 'BILLING_METHOD_INVALID'; end if;
  insert into public.billing_orders(buyer_id, method) values (v_actor, p_method) returning billing_order_id into v_id;
  return jsonb_build_object('id', v_id, 'amountRupiah', '20000', 'method', p_method, 'mode', 'dummy', 'status', 'pending', 'expiresAt', to_char(statement_timestamp() + interval '30 minutes' at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
end
$$;
create or replace function public.simulate_plus_billing(p_billing_order_id uuid, p_result text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.billing_orders%rowtype; v_expiry timestamptz;
begin
  perform private.assert_active_account(v_actor);
  select * into strict v_order from public.billing_orders where billing_order_id = p_billing_order_id and buyer_id = v_actor for update;
  if p_result not in ('succeeded', 'failed', 'expired') then raise exception using errcode = '22023', message = 'BILLING_RESULT_INVALID'; end if;
  if v_order.status <> 'pending' then return jsonb_build_object('id', v_order.billing_order_id, 'status', v_order.status, 'active', private.plus_active(v_actor)); end if;
  update public.billing_orders set status = p_result, activated_at = case when p_result = 'succeeded' then statement_timestamp() else null end where billing_order_id = v_order.billing_order_id;
  if p_result = 'succeeded' then
    select greatest(coalesce((select paid_through from public.subscriptions where user_id = v_actor), statement_timestamp()), statement_timestamp()) + interval '1 month' into v_expiry;
    insert into public.subscriptions(user_id, paid_through, source, last_billing_order_id) values (v_actor, v_expiry, 'dummy', v_order.billing_order_id) on conflict (user_id) do update set paid_through = excluded.paid_through, source = excluded.source, last_billing_order_id = excluded.last_billing_order_id, updated_at = statement_timestamp();
  end if;
  return jsonb_build_object('id', v_order.billing_order_id, 'status', p_result, 'active', private.plus_active(v_actor));
end
$$;

create or replace function public.create_store(p_slug text, p_name text, p_description text, p_category text, p_area_id text, p_area_label text, p_operating_hours text, p_handover_methods text[], p_public_address text, p_public_address_consent boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if not private.plus_active(v_actor) then raise exception using errcode = 'P0001', message = 'PLUS_REQUIRED'; end if;
  if (select count(*) from public.stores where owner_id = v_actor) >= 3 then raise exception using errcode = 'P0001', message = 'STORE_LIMIT_REACHED'; end if;
  if p_public_address_consent = false then p_public_address := null; end if;
  insert into public.stores(owner_id, slug, name, description, category, area_id, area_label, operating_hours, handover_methods, public_address, public_address_consent)
  values (v_actor, lower(btrim(p_slug)), btrim(p_name), left(btrim(coalesce(p_description, '')), 2000), btrim(p_category), p_area_id, btrim(p_area_label), left(btrim(coalesce(p_operating_hours, '')), 500), p_handover_methods, p_public_address, p_public_address_consent) returning store_id into v_id;
  return (select jsonb_build_object('id', store_id, 'slug', slug, 'name', name, 'description', description, 'category', category, 'areaLabel', area_label, 'status', status) from public.stores where store_id = v_id);
exception when unique_violation then raise exception using errcode = 'P0001', message = 'STORE_SLUG_TAKEN';
end
$$;
create or replace function public.get_my_stores()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', store_id, 'slug', slug, 'name', name, 'description', description, 'category', category, 'areaLabel', area_label, 'status', status, 'updatedAt', updated_at) order by created_at), '[]'::jsonb) from public.stores where owner_id = auth.uid()
$$;

create or replace function private.write_store_listing_command(p_payload jsonb, p_publish boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_store_id uuid; v_result jsonb; v_payload jsonb;
begin
  perform private.assert_active_account(v_actor);
  begin v_store_id := (p_payload#>>'{publisher,storeId}')::uuid; exception when others then raise exception using errcode = '22023', message = 'STORE_ID_INVALID'; end;
  if not private.plus_active(v_actor) or not exists (select 1 from public.stores where store_id = v_store_id and owner_id = v_actor and status = 'active') then raise exception using errcode = 'P0001', message = 'STORE_PUBLISHER_NOT_AVAILABLE'; end if;
  v_payload := jsonb_set(p_payload, '{publisher}', '{"kind":"personal"}'::jsonb, true);
  v_result := private.write_listing_command(v_payload, p_publish);
  update public.listings set store_id = v_store_id where listing_id = (v_result->>'listingId')::uuid and owner_id = v_actor;
  return v_result;
end
$$;
create or replace function public.save_store_listing_draft(p_payload jsonb) returns jsonb language sql security invoker set search_path = '' as $$ select private.write_store_listing_command(p_payload, false) $$;
create or replace function public.publish_store_listing(p_payload jsonb) returns jsonb language sql security invoker set search_path = '' as $$ select private.write_store_listing_command(p_payload, true) $$;

create or replace function public.search_stores(p_query jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('items', coalesce(jsonb_agg(jsonb_build_object('id', store.store_id, 'slug', store.slug, 'name', store.name, 'description', store.description, 'category', store.category, 'area', jsonb_build_object('id', store.area_id, 'name', store.area_label, 'distanceKm', 0), 'hours', store.operating_hours, 'handoverMethods', store.handover_methods, 'publicAddress', case when store.public_address_consent then store.public_address else null end, 'publicAddressConsent', store.public_address_consent, 'rating', null, 'reviewCount', 0, 'image', null) order by store.created_at desc), '[]'::jsonb), 'nextCursor', null)
  from public.stores store where private.store_public_visible(store.store_id) and (coalesce(p_query->>'query', '') = '' or store.name ilike '%' || (p_query->>'query') || '%')
$$;
create or replace function public.get_store(p_slug text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id', store.store_id, 'slug', store.slug, 'name', store.name, 'description', store.description, 'category', store.category, 'area', jsonb_build_object('id', store.area_id, 'name', store.area_label, 'distanceKm', 0), 'hours', store.operating_hours, 'handoverMethods', store.handover_methods, 'publicAddress', case when store.public_address_consent then store.public_address else null end, 'publicAddressConsent', store.public_address_consent, 'rating', null, 'reviewCount', 0, 'image', null) from public.stores store where store.slug = p_slug and private.store_public_visible(store.store_id)
$$;
create or replace function public.get_store_listings(p_slug text, p_query jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('items', coalesce(jsonb_agg(private.public_listing_dto(listing.listing_id, 0) order by listing.published_at desc), '[]'::jsonb), 'nextCursor', null)
  from public.listings listing join public.stores store on store.store_id = listing.store_id
  where store.slug = p_slug and private.store_public_visible(store.store_id) and listing.lifecycle = 'active' and listing.hidden_at is null
    and (coalesce(p_query->>'query', '') = '' or listing.title ilike '%' || (p_query->>'query') || '%')
$$;

revoke all on function private.plus_active(uuid), private.store_public_visible(uuid) from public, anon, authenticated;
revoke all on function public.get_plus_status(), public.create_plus_billing_order(text), public.simulate_plus_billing(uuid, text), public.create_store(text, text, text, text, text, text, text, text[], text, boolean), public.get_my_stores() from public, anon, authenticated;
grant execute on function public.get_plus_status(), public.create_plus_billing_order(text), public.simulate_plus_billing(uuid, text), public.create_store(text, text, text, text, text, text, text, text[], text, boolean), public.get_my_stores() to authenticated;
grant execute on function public.save_store_listing_draft(jsonb), public.publish_store_listing(jsonb) to authenticated;
grant execute on function public.search_stores(jsonb), public.get_store(text) to anon, authenticated;
grant execute on function public.get_store_listings(text, jsonb) to anon, authenticated;
