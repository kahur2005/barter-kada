alter function private.write_listing_command(jsonb, boolean) rename to write_listing_command_legacy;

create or replace function private.write_listing_command(p_payload jsonb, p_publish boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_payload jsonb;
  v_result jsonb;
  v_listing public.listings%rowtype;
  v_limit integer;
  v_asset_count integer;
  v_variant_count integer;
  v_modes text[];
  v_now timestamptz := statement_timestamp();
begin
  if not (p_payload ? '__storeId') then
    return private.write_listing_command_legacy(p_payload, p_publish);
  end if;
  begin v_store_id := nullif(p_payload->>'__storeId', '')::uuid; exception when others then raise exception using errcode = '22023', message = 'STORE_ID_INVALID'; end;
  if v_store_id is null then raise exception using errcode = '22023', message = 'STORE_ID_INVALID'; end if;
  perform private.assert_active_account(auth.uid());
  if not private.plus_active(auth.uid()) or not exists (select 1 from public.stores where store_id = v_store_id and owner_id = auth.uid() and status = 'active') then raise exception using errcode = 'P0001', message = 'STORE_PUBLISHER_NOT_AVAILABLE'; end if;
  v_payload := jsonb_set(p_payload - '__storeId', '{publisher}', '{"kind":"personal"}'::jsonb, true);
  v_result := private.write_listing_command_legacy(v_payload, false);
  update public.listings set store_id = v_store_id where listing_id = (v_result->>'listingId')::uuid and owner_id = auth.uid();
  if not p_publish then return v_result; end if;

  select * into strict v_listing from public.listings where listing_id = (v_result->>'listingId')::uuid and owner_id = auth.uid() for update;
  select coalesce(array_agg(mode order by mode), array[]::text[]) into v_modes from public.listing_modes where listing_id = v_listing.listing_id;
  select count(*) into v_asset_count from public.listing_assets where listing_id = v_listing.listing_id;
  select count(*) into v_variant_count from public.listing_variants where listing_id = v_listing.listing_id and active;
  if char_length(v_listing.title) not between 3 and 120 or char_length(v_listing.description) not between 10 and 5000 or v_listing.category_id is null or v_asset_count not between 1 and 8 or not exists (select 1 from public.listing_fulfillment_options where listing_id = v_listing.listing_id) then raise exception using errcode = 'P0001', message = 'LISTING_REQUIRED_FIELDS'; end if;
  if 'sale' = any(v_modes) and v_listing.base_price_rupiah is null and v_variant_count = 0 then raise exception using errcode = 'P0001', message = 'LISTING_PRICE_REQUIRED'; end if;
  if 'barter' = any(v_modes) and not coalesce(v_listing.barter_open_to_offers, false) and char_length(coalesce(v_listing.barter_wanted_description, '')) < 3 then raise exception using errcode = 'P0001', message = 'LISTING_BARTER_PREFERENCE_REQUIRED'; end if;
  if v_listing.fulfillment_kind = 'ready_stock' and v_listing.category_id not in ('food', 'garden') and (v_listing.condition is null or char_length(btrim(v_listing.defects)) < 3) then raise exception using errcode = 'P0001', message = 'LISTING_CONDITION_REQUIRED'; end if;
  if v_listing.fulfillment_kind = 'preorder' and not exists (select 1 from public.preorder_batches where listing_id = v_listing.listing_id and state = 'open' and order_closes_at > v_now and fulfillment_at > order_closes_at) then raise exception using errcode = 'P0001', message = 'LISTING_PREORDER_REQUIRED'; end if;
  if v_listing.fulfillment_kind = 'catering' and not exists (select 1 from public.catering_terms where listing_id = v_listing.listing_id) then raise exception using errcode = 'P0001', message = 'LISTING_CATERING_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('barter-plan-settings', 1));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_store_id::text, 1));
  select store_product_active_limit into strict v_limit from private.listing_plan_settings where singleton;
  if v_listing.lifecycle <> 'active' and (select count(*) from public.listings where store_id = v_store_id and lifecycle = 'active' and listing_id <> v_listing.listing_id) >= v_limit then raise exception using errcode = 'P0001', message = 'STORE_PRODUCT_ACTIVE_LIMIT'; end if;
  update public.listings listing set lifecycle = 'active', availability = 'available', published_at = coalesce(listing.published_at, v_now), archived_at = null, version = listing.version + 1, updated_at = v_now, area_id = location.area_id, area_label = area.name
    from private.user_locations location join public.service_areas area on area.area_id = location.area_id
    where listing.listing_id = v_listing.listing_id and location.user_id = auth.uid() and area.enabled;
  if not found then raise exception using errcode = 'P0001', message = 'LISTING_LOCATION_REQUIRED'; end if;
  insert into private.listing_versions(listing_id, version, actor_id, lifecycle, snapshot)
  select listing_id, version, auth.uid(), 'active', v_payload from public.listings where listing_id = v_listing.listing_id;
  return (select jsonb_build_object('listingId', listing_id, 'version', version, 'lifecycle', 'active') from public.listings where listing_id = v_listing.listing_id);
end
$$;

create or replace function private.write_store_listing_command(p_payload jsonb, p_publish boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_store_id uuid; v_payload jsonb;
begin
  perform private.assert_active_account(v_actor);
  begin v_store_id := (p_payload#>>'{publisher,storeId}')::uuid; exception when others then raise exception using errcode = '22023', message = 'STORE_ID_INVALID'; end;
  if not private.plus_active(v_actor) or not exists (select 1 from public.stores where store_id = v_store_id and owner_id = v_actor and status = 'active') then raise exception using errcode = 'P0001', message = 'STORE_PUBLISHER_NOT_AVAILABLE'; end if;
  v_payload := jsonb_set(p_payload, '{__storeId}', to_jsonb(v_store_id), true);
  return private.write_listing_command(v_payload, p_publish);
end
$$;

revoke all on function private.write_listing_command_legacy(jsonb, boolean), private.write_listing_command(jsonb, boolean), private.write_store_listing_command(jsonb, boolean) from public, anon, authenticated;
grant execute on function private.write_listing_command(jsonb, boolean), private.write_store_listing_command(jsonb, boolean) to authenticated;
