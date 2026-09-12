update storage.buckets set public = false where id = 'listing-media';

create policy listing_media_visible_sign
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'listing-media'
  and exists (
    select 1
    from public.listing_assets asset
    join public.listings listing on listing.listing_id = asset.listing_id
    where name = listing.owner_id::text || '/' || asset.asset_id::text || '.webp'
      and ((listing.lifecycle = 'active' and listing.hidden_at is null) or listing.owner_id = (select auth.uid()))
  )
);

create or replace function private.get_my_listing_command(p_listing_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_result jsonb;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  select jsonb_build_object(
    'sourceLifecycle', l.lifecycle,
    'listingId', l.listing_id,
    'expectedVersion', l.version,
    'publisher', jsonb_build_object('kind', 'personal'),
    'modes', coalesce((select jsonb_agg(m.mode order by m.mode) from public.listing_modes m where m.listing_id = l.listing_id), '[]'::jsonb),
    'fulfillment', l.fulfillment_kind,
    'categoryId', coalesce(l.category_id, ''),
    'title', l.title,
    'description', l.description,
    'condition', l.condition,
    'defects', l.defects,
    'negotiable', l.negotiable,
    'barter', case when exists (select 1 from public.listing_modes m where m.listing_id = l.listing_id and m.mode = 'barter') then jsonb_build_object('openToOffers', coalesce(l.barter_open_to_offers, false), 'wantedDescription', coalesce(l.barter_wanted_description, '')) else null end,
    'basePriceRupiah', l.base_price_rupiah::text,
    'variants', coalesce((select jsonb_agg(jsonb_build_object('clientId', v.variant_id, 'label', v.label, 'unit', v.unit, 'priceRupiah', v.price_rupiah::text, 'quota', v.quota::text) order by v.variant_id) from public.listing_variants v where v.listing_id = l.listing_id), '[]'::jsonb),
    'assetIds', coalesce((select jsonb_agg(a.asset_id order by a.position) from public.listing_assets a where a.listing_id = l.listing_id), '[]'::jsonb),
    'handoverMethods', coalesce((select jsonb_agg(f.method order by f.method) from public.listing_fulfillment_options f where f.listing_id = l.listing_id), '[]'::jsonb),
    'preorder', (select jsonb_build_object(
      'orderClosesAt', to_char(p.order_closes_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI'),
      'fulfillmentAt', to_char(p.fulfillment_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI'),
      'minimumQty', p.minimum_qty::text, 'quotaMode', p.quota_mode, 'sharedQuota', p.shared_quota::text, 'dpPercent', p.dp_percent::text
    ) from public.preorder_batches p where p.listing_id = l.listing_id and p.state = 'open' order by p.created_at desc limit 1),
    'catering', (select jsonb_build_object('minimumQty', c.minimum_qty::text, 'unit', c.unit, 'leadTimeHours', c.lead_time_hours::text, 'serviceAreaIds', to_jsonb(c.service_area_ids), 'availabilityNotes', c.availability_notes) from public.catering_terms c where c.listing_id = l.listing_id)
  ) into v_result
  from public.listings l
  where l.listing_id = p_listing_id and l.owner_id = v_actor;
  return v_result;
end
$$;

create or replace function public.get_my_listing(p_listing_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.get_my_listing_command(p_listing_id)
$$;

create or replace function private.listing_price_min(p_listing_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select min(price) from (
    select l.base_price_rupiah as price from public.listings l where l.listing_id = p_listing_id and l.base_price_rupiah is not null
    union all
    select v.price_rupiah from public.listing_variants v where v.listing_id = p_listing_id and v.active
  ) prices
$$;

create or replace function private.listing_price_max(p_listing_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select max(price) from (
    select l.base_price_rupiah as price from public.listings l where l.listing_id = p_listing_id and l.base_price_rupiah is not null
    union all
    select v.price_rupiah from public.listing_variants v where v.listing_id = p_listing_id and v.active
  ) prices
$$;

create or replace function private.listing_distance_km(p_listing_area text, p_origin_area text, p_actor uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_origin extensions.geography(point, 4326); v_target extensions.geography(point, 4326);
begin
  if p_actor is not null then select exact_point into v_origin from private.user_locations where user_id = p_actor; end if;
  if v_origin is null then
    select extensions.st_centroid(boundary)::extensions.geography into v_origin from private.service_area_boundaries where area_id = p_origin_area;
  end if;
  select extensions.st_centroid(boundary)::extensions.geography into v_target from private.service_area_boundaries where area_id = p_listing_area;
  if v_origin is null or v_target is null then return case when p_listing_area = p_origin_area then 0 else null end; end if;
  return greatest(0, round(extensions.st_distance(v_origin, v_target) / 1000.0)::integer);
end
$$;

create or replace function private.public_listing_dto(p_listing_id uuid, p_distance integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.listing_id,
    'title', l.title,
    'description', l.description,
    'modes', coalesce((select jsonb_agg(m.mode order by m.mode) from public.listing_modes m where m.listing_id = l.listing_id), '[]'::jsonb),
    'fulfillment', l.fulfillment_kind,
    'category', l.category_id,
    'condition', case l.condition when 'new' then 'Baru' when 'like_new' then 'Seperti baru' when 'good' then 'Baik' when 'fair' then 'Cukup' when 'needs_repair' then 'Perlu perbaikan' else 'Tidak berlaku' end,
    'defects', l.defects,
    'priceMin', private.listing_price_min(l.listing_id)::text,
    'priceMax', private.listing_price_max(l.listing_id)::text,
    'unit', coalesce((select c.unit from public.catering_terms c where c.listing_id = l.listing_id), (select v.unit from public.listing_variants v where v.listing_id = l.listing_id and v.active order by v.variant_id limit 1), 'barang'),
    'negotiable', l.negotiable,
    'barterPreferences', case when l.barter_open_to_offers then 'Terbuka untuk semua tawaran' else l.barter_wanted_description end,
    'area', jsonb_build_object('id', l.area_id, 'name', l.area_label, 'distanceKm', coalesce(p_distance, 0)),
    'publisher', jsonb_build_object(
      'id', l.owner_id, 'name', p.display_name, 'storeSlug', null,
      'phoneVerified', exists (select 1 from private.phone_claims pc where pc.user_id = l.owner_id and pc.revoked_at is null),
      'rating', null, 'reviewCount', 0
    ),
    'images', coalesce((select jsonb_agg(jsonb_build_object('path', l.owner_id::text || '/' || a.asset_id::text || '.webp', 'alt', a.alt_text) order by a.position) from public.listing_assets a where a.listing_id = l.listing_id), '[]'::jsonb),
    'variants', coalesce((select jsonb_agg(jsonb_build_object('id', v.variant_id, 'name', v.label, 'price', v.price_rupiah::text, 'unit', v.unit) order by v.variant_id) from public.listing_variants v where v.listing_id = l.listing_id and v.active), '[]'::jsonb),
    'preorder', (select jsonb_build_object(
      'closesAt', to_char(b.order_closes_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'availableAt', to_char(b.fulfillment_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'minimumQty', b.minimum_qty,
      'remainingQty', case b.quota_mode when 'shared' then b.shared_quota when 'per_variant' then (select sum(v.quota)::integer from public.listing_variants v where v.listing_id = l.listing_id and v.active) else null end,
      'dpPercent', nullif(b.dp_percent, 0)
    ) from public.preorder_batches b where b.listing_id = l.listing_id and b.state = 'open' order by b.created_at desc limit 1),
    'catering', (select jsonb_build_object(
      'minimumQty', c.minimum_qty, 'leadTimeHours', c.lead_time_hours,
      'serviceAreas', coalesce((select jsonb_agg(a.name order by a.name) from public.service_areas a where a.area_id = any(c.service_area_ids) and a.enabled), '[]'::jsonb),
      'notes', c.availability_notes
    ) from public.catering_terms c where c.listing_id = l.listing_id),
    'handoverMethods', coalesce((select jsonb_agg(f.method order by f.method) from public.listing_fulfillment_options f where f.listing_id = l.listing_id), '[]'::jsonb),
    'availability', l.availability,
    'promoted', false,
    'createdAt', to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  from public.listings l join public.profiles p on p.id = l.owner_id
  where l.listing_id = p_listing_id and l.lifecycle = 'active' and l.hidden_at is null
$$;

create or replace function private.search_listings_command(p_query jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_text text := btrim(coalesce(p_query->>'query', ''));
  v_area text := nullif(p_query->>'areaId', '');
  v_radius integer;
  v_category text := nullif(p_query->>'category', '');
  v_mode text := nullif(p_query->>'mode', '');
  v_fulfillment text := nullif(p_query->>'fulfillment', '');
  v_sort text := coalesce(nullif(p_query->>'sort', ''), 'newest');
  v_min numeric(19,0); v_max numeric(19,0);
  v_offset integer := 0; v_total integer; v_items jsonb; v_next text;
  v_fingerprint text; v_cursor_text text;
begin
  if jsonb_typeof(p_query) <> 'object' then raise exception using errcode = '22023', message = 'DISCOVERY_QUERY_INVALID'; end if;
  begin v_radius := (p_query->>'radiusKm')::integer; exception when others then raise exception using errcode = '22023', message = 'DISCOVERY_QUERY_INVALID'; end;
  if char_length(v_text) > 120 or v_area is null or v_radius is null or v_radius not in (5, 10, 20, 50)
     or not exists (select 1 from public.service_areas where area_id = v_area and enabled)
     or (v_category is not null and not exists (select 1 from public.categories where category_id = v_category and active))
     or (v_mode is not null and v_mode not in ('sale', 'barter', 'free'))
     or (v_fulfillment is not null and v_fulfillment not in ('ready_stock', 'preorder', 'catering'))
     or v_sort not in ('newest', 'nearest', 'relevance') then raise exception using errcode = '22023', message = 'DISCOVERY_QUERY_INVALID'; end if;
  if p_query->>'minPrice' is not null then if p_query->>'minPrice' !~ '^(0|[1-9][0-9]{0,18})$' then raise exception using errcode = '22023', message = 'DISCOVERY_QUERY_INVALID'; end if; v_min := (p_query->>'minPrice')::numeric; end if;
  if p_query->>'maxPrice' is not null then if p_query->>'maxPrice' !~ '^(0|[1-9][0-9]{0,18})$' then raise exception using errcode = '22023', message = 'DISCOVERY_QUERY_INVALID'; end if; v_max := (p_query->>'maxPrice')::numeric; end if;
  if v_min is not null and v_max is not null and v_min > v_max then raise exception using errcode = '22023', message = 'DISCOVERY_QUERY_INVALID'; end if;
  v_fingerprint := encode(extensions.digest(convert_to((p_query - 'cursor')::text, 'UTF8'), 'sha256'), 'hex');
  if p_query->>'cursor' is not null then
    begin v_cursor_text := convert_from(decode(p_query->>'cursor', 'base64'), 'UTF8'); exception when others then raise exception using errcode = '22023', message = 'DISCOVERY_CURSOR_INVALID'; end;
    if v_cursor_text !~ '^[0-9]+:[a-f0-9]{64}$' or split_part(v_cursor_text, ':', 2) <> v_fingerprint then raise exception using errcode = '22023', message = 'DISCOVERY_CURSOR_INVALID'; end if;
    v_offset := split_part(v_cursor_text, ':', 1)::integer;
    if v_offset > 2400 then raise exception using errcode = '22023', message = 'DISCOVERY_CURSOR_INVALID'; end if;
  end if;
  with candidates as (
    select l.listing_id, l.created_at,
      private.listing_distance_km(l.area_id, v_area, auth.uid()) as distance_km,
      case when v_text = '' then 0 when lower(l.title) = lower(v_text) then 3 when strpos(lower(l.title), lower(v_text)) = 1 then 2 when strpos(lower(l.title), lower(v_text)) > 0 then 1 else 0 end as relevance
    from public.listings l
    where l.lifecycle = 'active' and l.hidden_at is null and l.availability = 'available'
      and (v_category is null or l.category_id = v_category)
      and (v_fulfillment is null or l.fulfillment_kind = v_fulfillment)
      and (v_mode is null or exists (select 1 from public.listing_modes m where m.listing_id = l.listing_id and m.mode = v_mode))
      and (v_text = '' or strpos(lower(l.title), lower(v_text)) > 0 or strpos(lower(l.description), lower(v_text)) > 0)
      and (v_min is null or private.listing_price_min(l.listing_id) >= v_min)
      and (v_max is null or private.listing_price_max(l.listing_id) <= v_max)
  ), nearby as (select * from candidates where distance_km is not null and distance_km <= v_radius), paged as (
    select * from nearby order by
      case when v_sort = 'nearest' then distance_km end asc nulls last,
      case when v_sort = 'relevance' then relevance end desc,
      created_at desc, listing_id desc offset v_offset limit 24
  )
  select coalesce(jsonb_agg(private.public_listing_dto(listing_id, distance_km) order by
    case when v_sort = 'nearest' then distance_km end asc nulls last,
    case when v_sort = 'relevance' then relevance end desc,
    created_at desc, listing_id desc), '[]'::jsonb) into v_items from paged;
  select count(*) into v_total from public.listings l
  where l.lifecycle = 'active' and l.hidden_at is null and l.availability = 'available'
    and (v_category is null or l.category_id = v_category)
    and (v_fulfillment is null or l.fulfillment_kind = v_fulfillment)
    and (v_mode is null or exists (select 1 from public.listing_modes m where m.listing_id = l.listing_id and m.mode = v_mode))
    and (v_text = '' or strpos(lower(l.title), lower(v_text)) > 0 or strpos(lower(l.description), lower(v_text)) > 0)
    and (v_min is null or private.listing_price_min(l.listing_id) >= v_min)
    and (v_max is null or private.listing_price_max(l.listing_id) <= v_max)
    and private.listing_distance_km(l.area_id, v_area, auth.uid()) between 0 and v_radius;
  if v_offset + 24 < v_total then v_next := encode(convert_to((v_offset + 24)::text || ':' || v_fingerprint, 'UTF8'), 'base64'); end if;
  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end
$$;

create or replace function private.get_listing_command(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.public_listing_dto(l.listing_id, private.listing_distance_km(l.area_id, l.area_id, auth.uid()))
  from public.listings l where l.listing_id = p_id and l.lifecycle = 'active' and l.hidden_at is null
$$;

create or replace function public.search_listings(p_query jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.search_listings_command(p_query) $$;
create or replace function public.get_listing(p_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.get_listing_command(p_id) $$;
create or replace function public.search_stores(p_query jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$ select jsonb_build_object('items', '[]'::jsonb, 'nextCursor', null) $$;
create or replace function public.get_store(p_slug text)
returns jsonb language sql stable security invoker set search_path = '' as $$ select null::jsonb $$;
create or replace function public.get_store_listings(p_slug text, p_query jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$ select jsonb_build_object('items', '[]'::jsonb, 'nextCursor', null) $$;

grant usage on schema private to anon;
revoke all on function private.get_my_listing_command(uuid), private.listing_price_min(uuid), private.listing_price_max(uuid), private.listing_distance_km(text, text, uuid), private.public_listing_dto(uuid, integer), private.search_listings_command(jsonb), private.get_listing_command(uuid) from public, anon, authenticated;
revoke all on function public.get_my_listing(uuid), public.search_listings(jsonb), public.get_listing(uuid), public.search_stores(jsonb), public.get_store(text), public.get_store_listings(text, jsonb) from public, anon, authenticated;
grant execute on function private.get_my_listing_command(uuid), public.get_my_listing(uuid) to authenticated;
grant execute on function private.listing_price_min(uuid), private.listing_price_max(uuid), private.listing_distance_km(text, text, uuid), private.public_listing_dto(uuid, integer), private.search_listings_command(jsonb), private.get_listing_command(uuid) to anon, authenticated;
grant execute on function public.search_listings(jsonb), public.get_listing(uuid), public.search_stores(jsonb), public.get_store(text), public.get_store_listings(text, jsonb) to anon, authenticated;
