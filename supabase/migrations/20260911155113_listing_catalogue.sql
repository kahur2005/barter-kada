create table public.categories (
  category_id text primary key,
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  schema_version integer not null default 1,
  constraint categories_id_format check (category_id ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  constraint categories_name_length check (char_length(name) between 2 and 80),
  constraint categories_schema_version check (schema_version > 0)
);
insert into public.categories(category_id, slug, name) values
  ('food', 'makanan', 'Makanan'),
  ('clothing', 'pakaian', 'Pakaian'),
  ('home', 'rumah-furnitur', 'Rumah & furnitur'),
  ('vehicles', 'kendaraan', 'Kendaraan'),
  ('garden', 'hasil-kebun', 'Hasil kebun'),
  ('other', 'lainnya', 'Lainnya');

create table private.listing_plan_settings (
  singleton boolean primary key default true,
  personal_active_limit integer not null default 20,
  max_images smallint not null default 8,
  max_image_bytes integer not null default 5242880,
  version integer not null default 1,
  constraint listing_plan_singleton check (singleton),
  constraint listing_plan_active_limit check (personal_active_limit between 1 and 1000),
  constraint listing_plan_images check (max_images between 1 and 20),
  constraint listing_plan_image_bytes check (max_image_bytes between 1024 and 20971520),
  constraint listing_plan_version check (version > 0)
);
insert into private.listing_plan_settings(singleton) values (true);

create table private.listing_assets (
  asset_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'quarantined',
  quarantine_path text,
  processed_path text,
  mime_type text not null,
  byte_size integer not null,
  width integer,
  height integer,
  content_hash text,
  created_at timestamptz not null default statement_timestamp(),
  processed_at timestamptz,
  constraint listing_assets_state check (state in ('quarantined', 'processing', 'processed', 'rejected')),
  constraint listing_assets_mime check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint listing_assets_size check (byte_size between 1 and 5242880),
  constraint listing_assets_dimensions check ((width is null and height is null) or (width between 1 and 12000 and height between 1 and 12000)),
  constraint listing_assets_hash check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
  constraint listing_assets_processed_fields check (state <> 'processed' or (processed_path is not null and width is not null and height is not null and content_hash is not null))
);
create index listing_assets_owner_state_idx on private.listing_assets(owner_id, state);

create table public.listings (
  listing_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  store_id uuid,
  category_id text references public.categories(category_id),
  title text not null default '',
  description text not null default '',
  condition text,
  defects text not null default '',
  negotiable boolean not null default false,
  barter_open_to_offers boolean,
  barter_wanted_description text,
  fulfillment_kind text not null default 'ready_stock',
  base_price_rupiah numeric(19,0),
  lifecycle text not null default 'draft',
  availability text not null default 'available',
  reserved boolean not null default false,
  version integer not null default 0,
  area_id text references public.service_areas(area_id),
  area_label text,
  hidden_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint listings_title_length check (char_length(title) <= 120),
  constraint listings_description_length check (char_length(description) <= 5000),
  constraint listings_condition check (condition is null or condition in ('new', 'like_new', 'good', 'fair', 'needs_repair')),
  constraint listings_defects_length check (char_length(defects) <= 1000),
  constraint listings_barter_wanted_length check (barter_wanted_description is null or char_length(barter_wanted_description) <= 500),
  constraint listings_fulfillment check (fulfillment_kind in ('ready_stock', 'preorder', 'catering')),
  constraint listings_price check (base_price_rupiah is null or base_price_rupiah > 0),
  constraint listings_lifecycle check (lifecycle in ('draft', 'active', 'archived', 'completed')),
  constraint listings_availability check (availability in ('available', 'reserved', 'sold', 'closed')),
  constraint listings_version check (version >= 0)
);
create index listings_lifecycle_created_idx on public.listings(lifecycle, created_at desc, listing_id);
create index listings_owner_lifecycle_idx on public.listings(owner_id, lifecycle);
create index listings_store_lifecycle_idx on public.listings(store_id, lifecycle) where store_id is not null;
create index listings_category_lifecycle_idx on public.listings(category_id, lifecycle);

create table public.listing_modes (
  listing_id uuid not null references public.listings(listing_id) on delete cascade,
  mode text not null,
  primary key (listing_id, mode),
  constraint listing_modes_mode check (mode in ('sale', 'barter', 'free'))
);

create table public.listing_variants (
  variant_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(listing_id) on delete cascade,
  label text not null,
  unit text not null,
  price_rupiah numeric(19,0) not null,
  quota integer,
  active boolean not null default true,
  constraint listing_variants_label_length check (char_length(label) between 1 and 80),
  constraint listing_variants_unit_length check (char_length(unit) between 1 and 30),
  constraint listing_variants_price check (price_rupiah > 0),
  constraint listing_variants_quota check (quota is null or quota > 0),
  unique (listing_id, label)
);
create index listing_variants_listing_idx on public.listing_variants(listing_id);

create table public.listing_assets (
  listing_id uuid not null references public.listings(listing_id) on delete cascade,
  asset_id uuid not null references private.listing_assets(asset_id) on delete restrict,
  position smallint not null,
  alt_text text not null default '',
  primary key (listing_id, asset_id),
  unique (listing_id, position),
  constraint listing_asset_position check (position between 0 and 7),
  constraint listing_asset_alt_length check (char_length(alt_text) <= 200)
);

create table public.listing_fulfillment_options (
  listing_id uuid not null references public.listings(listing_id) on delete cascade,
  method text not null,
  primary key (listing_id, method),
  constraint listing_fulfillment_method check (method in ('pickup', 'meetup', 'delivery'))
);

create table public.preorder_batches (
  batch_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(listing_id) on delete restrict,
  order_closes_at timestamptz not null,
  fulfillment_at timestamptz not null,
  minimum_qty integer not null,
  quota_mode text not null,
  shared_quota integer,
  dp_percent smallint not null default 0,
  state text not null default 'open',
  created_at timestamptz not null default statement_timestamp(),
  constraint preorder_time_order check (fulfillment_at > order_closes_at),
  constraint preorder_minimum check (minimum_qty > 0),
  constraint preorder_quota_mode check (quota_mode in ('unlimited', 'shared', 'per_variant')),
  constraint preorder_shared_quota check ((quota_mode = 'shared' and shared_quota > 0) or (quota_mode <> 'shared' and shared_quota is null)),
  constraint preorder_dp check (dp_percent between 0 and 100),
  constraint preorder_state check (state in ('open', 'closed', 'cancelled'))
);
create unique index preorder_one_open_batch_uidx on public.preorder_batches(listing_id) where state = 'open';

create table public.catering_terms (
  listing_id uuid primary key references public.listings(listing_id) on delete cascade,
  minimum_qty integer not null,
  unit text not null,
  lead_time_hours integer not null,
  service_area_ids text[] not null,
  availability_notes text not null default '',
  constraint catering_minimum check (minimum_qty > 0),
  constraint catering_unit_length check (char_length(unit) between 1 and 30),
  constraint catering_lead_time check (lead_time_hours > 0),
  constraint catering_service_areas check (cardinality(service_area_ids) > 0),
  constraint catering_notes_length check (char_length(availability_notes) <= 500)
);

create table private.listing_versions (
  listing_id uuid not null references public.listings(listing_id) on delete restrict,
  version integer not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  lifecycle text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (listing_id, version)
);

alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_modes enable row level security;
alter table public.listing_variants enable row level security;
alter table public.listing_assets enable row level security;
alter table public.listing_fulfillment_options enable row level security;
alter table public.preorder_batches enable row level security;
alter table public.catering_terms enable row level security;
alter table private.listing_plan_settings enable row level security;
alter table private.listing_assets enable row level security;
alter table private.listing_versions enable row level security;

create policy categories_public_read on public.categories for select to anon, authenticated using (active);
create policy listings_public_or_owner_read on public.listings for select to anon, authenticated using ((lifecycle = 'active' and hidden_at is null) or owner_id = (select auth.uid()));
create policy listing_modes_visible_read on public.listing_modes for select to anon, authenticated using (exists (select 1 from public.listings l where l.listing_id = listing_modes.listing_id));
create policy listing_variants_visible_read on public.listing_variants for select to anon, authenticated using (exists (select 1 from public.listings l where l.listing_id = listing_variants.listing_id));
create policy listing_assets_visible_read on public.listing_assets for select to anon, authenticated using (exists (select 1 from public.listings l where l.listing_id = listing_assets.listing_id));
create policy listing_fulfillment_visible_read on public.listing_fulfillment_options for select to anon, authenticated using (exists (select 1 from public.listings l where l.listing_id = listing_fulfillment_options.listing_id));
create policy preorder_batches_visible_read on public.preorder_batches for select to anon, authenticated using (exists (select 1 from public.listings l where l.listing_id = preorder_batches.listing_id));
create policy catering_terms_visible_read on public.catering_terms for select to anon, authenticated using (exists (select 1 from public.listings l where l.listing_id = catering_terms.listing_id));
create policy listing_assets_owner_read on private.listing_assets for select to authenticated using (owner_id = (select auth.uid()));
create policy listing_versions_owner_read on private.listing_versions for select to authenticated using (exists (select 1 from public.listings l where l.listing_id = listing_versions.listing_id and l.owner_id = (select auth.uid())));

revoke all on public.categories, public.listings, public.listing_modes, public.listing_variants, public.listing_assets, public.listing_fulfillment_options, public.preorder_batches, public.catering_terms from public, anon, authenticated;
grant select on public.categories, public.listings, public.listing_modes, public.listing_variants, public.listing_assets, public.listing_fulfillment_options, public.preorder_batches, public.catering_terms to anon, authenticated;
revoke all on private.listing_plan_settings, private.listing_assets, private.listing_versions from public, anon, authenticated;
grant select on private.listing_versions to authenticated;

create or replace function private.write_listing_command(p_payload jsonb, p_publish boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_listing_id uuid;
  v_existing public.listings%rowtype;
  v_expected integer;
  v_version integer;
  v_modes text[];
  v_fulfillment text := coalesce(p_payload->>'fulfillment', 'ready_stock');
  v_category text := nullif(p_payload->>'categoryId', '');
  v_price numeric(19,0);
  v_now timestamptz := statement_timestamp();
  v_active_limit integer;
  v_asset_count integer;
  v_variant_count integer;
  v_preorder jsonb := p_payload->'preorder';
  v_catering jsonb := p_payload->'catering';
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception using errcode = '22023', message = 'LISTING_PAYLOAD_INVALID'; end if;
  if coalesce(p_payload#>>'{publisher,kind}', 'personal') <> 'personal' then raise exception using errcode = 'P0001', message = 'STORE_PUBLISHER_NOT_AVAILABLE'; end if;
  begin v_listing_id := nullif(p_payload->>'listingId', '')::uuid; exception when others then raise exception using errcode = '22023', message = 'LISTING_ID_INVALID'; end;
  if v_listing_id is null then v_listing_id := gen_random_uuid(); end if;
  begin v_expected := nullif(p_payload->>'expectedVersion', '')::integer; exception when others then raise exception using errcode = '22023', message = 'LISTING_VERSION_INVALID'; end;
  select * into v_existing from public.listings where listing_id = v_listing_id for update;
  if found then
    if v_existing.owner_id <> v_actor then raise exception using errcode = 'P0001', message = 'LISTING_NOT_OWNED'; end if;
    if v_expected is null or v_expected <> v_existing.version then raise exception using errcode = 'P0001', message = 'LISTING_VERSION_CONFLICT'; end if;
    if v_existing.reserved and v_fulfillment = 'ready_stock' then raise exception using errcode = 'P0001', message = 'LISTING_RESERVED'; end if;
    v_version := v_existing.version + 1;
  else
    if v_expected is not null then raise exception using errcode = 'P0001', message = 'LISTING_VERSION_CONFLICT'; end if;
    v_version := 1;
    insert into public.listings(listing_id, owner_id) values (v_listing_id, v_actor);
  end if;

  select coalesce(array_agg(value), array[]::text[]) into v_modes from jsonb_array_elements_text(coalesce(p_payload->'modes', '[]'::jsonb));
  if cardinality(v_modes) = 0 or cardinality(v_modes) > 2 or cardinality(v_modes) <> (select count(distinct mode) from unnest(v_modes) mode)
     or ('free' = any(v_modes) and cardinality(v_modes) <> 1)
     or exists (select 1 from unnest(v_modes) mode where mode not in ('sale', 'barter', 'free')) then
    raise exception using errcode = 'P0001', message = 'LISTING_MODES_INVALID';
  end if;
  if v_fulfillment not in ('ready_stock', 'preorder', 'catering') or (v_fulfillment <> 'ready_stock' and v_modes <> array['sale']::text[]) then
    raise exception using errcode = 'P0001', message = 'LISTING_FULFILLMENT_INVALID';
  end if;
  if p_payload->>'basePriceRupiah' is not null then
    if p_payload->>'basePriceRupiah' !~ '^[1-9][0-9]{0,18}$' then raise exception using errcode = 'P0001', message = 'LISTING_PRICE_INVALID'; end if;
    v_price := (p_payload->>'basePriceRupiah')::numeric(19,0);
  end if;
  if 'free' = any(v_modes) and v_price is not null then raise exception using errcode = 'P0001', message = 'LISTING_MODES_INVALID'; end if;
  if v_category is not null and not exists (select 1 from public.categories where category_id = v_category and active) then raise exception using errcode = 'P0001', message = 'LISTING_CATEGORY_INVALID'; end if;

  update public.listings set
    category_id = v_category,
    title = btrim(coalesce(p_payload->>'title', '')),
    description = btrim(coalesce(p_payload->>'description', '')),
    condition = nullif(p_payload->>'condition', ''),
    defects = btrim(coalesce(p_payload->>'defects', '')),
    negotiable = case when 'sale' = any(v_modes) then coalesce((p_payload->>'negotiable')::boolean, false) else false end,
    barter_open_to_offers = case when 'barter' = any(v_modes) then coalesce((p_payload#>>'{barter,openToOffers}')::boolean, false) else null end,
    barter_wanted_description = case when 'barter' = any(v_modes) then nullif(btrim(coalesce(p_payload#>>'{barter,wantedDescription}', '')), '') else null end,
    fulfillment_kind = v_fulfillment,
    base_price_rupiah = v_price,
    lifecycle = case when p_publish then 'active' else 'draft' end,
    availability = 'available', version = v_version,
    published_at = case when p_publish then coalesce(published_at, v_now) else published_at end,
    archived_at = null,
    updated_at = v_now
  where listing_id = v_listing_id;

  delete from public.listing_modes where listing_id = v_listing_id;
  insert into public.listing_modes(listing_id, mode) select v_listing_id, unnest(v_modes);
  delete from public.listing_variants where listing_id = v_listing_id;
  insert into public.listing_variants(listing_id, label, unit, price_rupiah, quota)
    select v_listing_id, btrim(item->>'label'), btrim(item->>'unit'), (item->>'priceRupiah')::numeric(19,0), nullif(item->>'quota', '')::integer
    from jsonb_array_elements(coalesce(p_payload->'variants', '[]'::jsonb)) item;
  get diagnostics v_variant_count = row_count;

  delete from public.listing_assets where listing_id = v_listing_id;
  if exists (
    select 1 from jsonb_array_elements_text(coalesce(p_payload->'assetIds', '[]'::jsonb)) asset(value)
    left join private.listing_assets owned on owned.asset_id = asset.value::uuid and owned.owner_id = v_actor and owned.state = 'processed'
    where owned.asset_id is null
  ) then raise exception using errcode = 'P0001', message = 'LISTING_ASSET_INVALID'; end if;
  insert into public.listing_assets(listing_id, asset_id, position, alt_text)
    select v_listing_id, value::uuid, (ordinality - 1)::smallint, coalesce(nullif(btrim(p_payload->>'title'), ''), 'Foto penawaran')
    from jsonb_array_elements_text(coalesce(p_payload->'assetIds', '[]'::jsonb)) with ordinality asset(value, ordinality);
  get diagnostics v_asset_count = row_count;

  delete from public.listing_fulfillment_options where listing_id = v_listing_id;
  insert into public.listing_fulfillment_options(listing_id, method)
    select v_listing_id, value from jsonb_array_elements_text(coalesce(p_payload->'handoverMethods', '[]'::jsonb));

  delete from public.preorder_batches where listing_id = v_listing_id and state = 'open';
  if v_fulfillment = 'preorder' and jsonb_typeof(v_preorder) = 'object' then
    if coalesce(v_preorder->>'quotaMode', '') not in ('unlimited', 'shared', 'per_variant') then
      raise exception using errcode = 'P0001', message = 'LISTING_PREORDER_INVALID';
    end if;
    insert into public.preorder_batches(
      listing_id, order_closes_at, fulfillment_at, minimum_qty, quota_mode, shared_quota, dp_percent
    ) values (
      v_listing_id,
      (v_preorder->>'orderClosesAt')::timestamptz,
      (v_preorder->>'fulfillmentAt')::timestamptz,
      (v_preorder->>'minimumQty')::integer,
      v_preorder->>'quotaMode',
      case when v_preorder->>'quotaMode' = 'shared' then (v_preorder->>'sharedQuota')::integer else null end,
      (v_preorder->>'dpPercent')::smallint
    );
    if v_preorder->>'quotaMode' = 'per_variant'
       and (v_variant_count = 0 or exists (select 1 from public.listing_variants where listing_id = v_listing_id and quota is null)) then
      raise exception using errcode = 'P0001', message = 'LISTING_PREORDER_VARIANT_QUOTA_REQUIRED';
    end if;
  elsif v_preorder is not null and v_preorder <> 'null'::jsonb then
    raise exception using errcode = 'P0001', message = 'LISTING_PREORDER_INVALID';
  end if;

  delete from public.catering_terms where listing_id = v_listing_id;
  if v_fulfillment = 'catering' and jsonb_typeof(v_catering) = 'object' then
    if exists (
      select 1
      from unnest(array(select jsonb_array_elements_text(coalesce(v_catering->'serviceAreaIds', '[]'::jsonb)))) candidate(area_id)
      left join public.service_areas area on area.area_id = candidate.area_id and area.enabled
      where area.area_id is null
    ) then raise exception using errcode = 'P0001', message = 'LISTING_CATERING_AREA_INVALID'; end if;
    insert into public.catering_terms(listing_id, minimum_qty, unit, lead_time_hours, service_area_ids, availability_notes)
    values (
      v_listing_id,
      (v_catering->>'minimumQty')::integer,
      btrim(v_catering->>'unit'),
      (v_catering->>'leadTimeHours')::integer,
      array(select jsonb_array_elements_text(coalesce(v_catering->'serviceAreaIds', '[]'::jsonb))),
      btrim(coalesce(v_catering->>'availabilityNotes', ''))
    );
  elsif v_catering is not null and v_catering <> 'null'::jsonb then
    raise exception using errcode = 'P0001', message = 'LISTING_CATERING_INVALID';
  end if;

  if p_publish then
    if not exists (select 1 from private.account_state where user_id = v_actor and account_status = 'active' and onboarding_step = 'complete') then raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_ACTIVE'; end if;
    if char_length(btrim(coalesce(p_payload->>'title', ''))) not between 3 and 120 or char_length(btrim(coalesce(p_payload->>'description', ''))) not between 10 and 5000 then raise exception using errcode = 'P0001', message = 'LISTING_DETAILS_INVALID'; end if;
    if v_category is null or v_asset_count not between 1 and 8 or not exists (select 1 from public.listing_fulfillment_options where listing_id = v_listing_id) then raise exception using errcode = 'P0001', message = 'LISTING_REQUIRED_FIELDS'; end if;
    if 'sale' = any(v_modes) and v_price is null and v_variant_count = 0 then raise exception using errcode = 'P0001', message = 'LISTING_PRICE_REQUIRED'; end if;
    if 'barter' = any(v_modes) and not coalesce((p_payload#>>'{barter,openToOffers}')::boolean, false) and char_length(btrim(coalesce(p_payload#>>'{barter,wantedDescription}', ''))) < 3 then raise exception using errcode = 'P0001', message = 'LISTING_BARTER_PREFERENCE_REQUIRED'; end if;
    if v_fulfillment = 'ready_stock' and v_category not in ('food', 'garden') and (p_payload->>'condition' is null or char_length(btrim(coalesce(p_payload->>'defects', ''))) < 3) then raise exception using errcode = 'P0001', message = 'LISTING_CONDITION_REQUIRED'; end if;
    if v_fulfillment = 'preorder' and not exists (
      select 1 from public.preorder_batches
      where listing_id = v_listing_id and state = 'open' and order_closes_at > v_now and fulfillment_at > order_closes_at
    ) then raise exception using errcode = 'P0001', message = 'LISTING_PREORDER_REQUIRED'; end if;
    if v_fulfillment = 'catering' and not exists (select 1 from public.catering_terms where listing_id = v_listing_id) then
      raise exception using errcode = 'P0001', message = 'LISTING_CATERING_REQUIRED';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text, 1));
    select personal_active_limit into strict v_active_limit from private.listing_plan_settings where singleton;
    if coalesce(v_existing.lifecycle, 'draft') <> 'active' and (select count(*) from public.listings where owner_id = v_actor and store_id is null and lifecycle = 'active' and listing_id <> v_listing_id) >= v_active_limit then raise exception using errcode = 'P0001', message = 'LISTING_ACTIVE_LIMIT'; end if;
    update public.listings l set area_id = location.area_id, area_label = area.name
      from private.user_locations location join public.service_areas area on area.area_id = location.area_id
      where l.listing_id = v_listing_id and location.user_id = v_actor and area.enabled;
    if not found then raise exception using errcode = 'P0001', message = 'LISTING_LOCATION_REQUIRED'; end if;
  end if;

  insert into private.listing_versions(listing_id, version, actor_id, lifecycle, snapshot)
  values (v_listing_id, v_version, v_actor, case when p_publish then 'active' else 'draft' end, p_payload);
  return jsonb_build_object('listingId', v_listing_id, 'version', v_version, 'lifecycle', case when p_publish then 'active' else 'draft' end);
exception when check_violation or unique_violation or invalid_text_representation or numeric_value_out_of_range then
  raise exception using errcode = 'P0001', message = 'LISTING_PAYLOAD_INVALID';
end;
$$;

create or replace function public.save_listing_draft(p_payload jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select private.write_listing_command(p_payload, false) $$;
create or replace function public.publish_listing(p_payload jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select private.write_listing_command(p_payload, true) $$;

create or replace function private.archive_listing_command(p_listing_id uuid, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_listing public.listings%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  select * into v_listing from public.listings where listing_id = p_listing_id for update;
  if not found or v_listing.owner_id <> v_actor then raise exception using errcode = 'P0001', message = 'LISTING_NOT_OWNED'; end if;
  if v_listing.version <> p_expected_version then raise exception using errcode = 'P0001', message = 'LISTING_VERSION_CONFLICT'; end if;
  if v_listing.reserved then raise exception using errcode = 'P0001', message = 'LISTING_RESERVED'; end if;
  update public.listings set lifecycle = 'archived', availability = 'closed', version = version + 1, archived_at = statement_timestamp(), updated_at = statement_timestamp() where listing_id = p_listing_id;
  insert into private.listing_versions(listing_id, version, actor_id, lifecycle, snapshot) values (p_listing_id, v_listing.version + 1, v_actor, 'archived', jsonb_build_object('archivedFromVersion', v_listing.version));
  return jsonb_build_object('listingId', p_listing_id, 'version', v_listing.version + 1, 'lifecycle', 'archived');
end $$;
create or replace function public.archive_listing(p_listing_id uuid, p_expected_version integer)
returns jsonb language sql security invoker set search_path = '' as $$ select private.archive_listing_command(p_listing_id, p_expected_version) $$;

create or replace function private.get_my_listings_command(p_lifecycle text default 'active')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_limit integer;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_lifecycle not in ('draft', 'active', 'archived', 'completed') then raise exception using errcode = '22023', message = 'LISTING_LIFECYCLE_INVALID'; end if;
  select personal_active_limit into strict v_limit from private.listing_plan_settings where singleton;
  return jsonb_build_object(
    'activeCount', (select count(*) from public.listings where owner_id = v_actor and store_id is null and lifecycle = 'active'),
    'activeLimit', v_limit,
    'items', coalesce((select jsonb_agg(jsonb_build_object('listingId', listing_id, 'title', title, 'lifecycle', lifecycle, 'version', version, 'reserved', reserved, 'updatedAt', updated_at) order by updated_at desc) from public.listings where owner_id = v_actor and lifecycle = p_lifecycle), '[]'::jsonb)
  );
end $$;
create or replace function public.get_my_listings(p_lifecycle text default 'active')
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.get_my_listings_command(p_lifecycle)
$$;

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on function private.write_listing_command(jsonb, boolean), private.archive_listing_command(uuid, integer), private.get_my_listings_command(text) from public, anon, authenticated;
grant execute on function public.get_my_onboarding(), public.complete_profile(text, text), public.set_location(text, double precision, double precision, text) to authenticated;
grant execute on function public.save_listing_draft(jsonb), public.publish_listing(jsonb), public.archive_listing(uuid, integer), public.get_my_listings(text) to authenticated;
grant execute on function private.write_listing_command(jsonb, boolean), private.archive_listing_command(uuid, integer), private.get_my_listings_command(text) to authenticated;
grant execute on function public.otp_create_challenge(uuid, uuid, text, text, text, text), public.otp_record_delivery(uuid, text, text), public.otp_get_challenge_context(uuid, uuid), public.otp_verify_challenge(uuid, uuid, text) to service_role;
