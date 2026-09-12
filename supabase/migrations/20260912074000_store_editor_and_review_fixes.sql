create or replace function private.get_my_listing_command(p_listing_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_result jsonb;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  select jsonb_build_object(
    'sourceLifecycle', l.lifecycle, 'listingId', l.listing_id, 'expectedVersion', l.version,
    'publisher', case when l.store_id is null then jsonb_build_object('kind', 'personal') else jsonb_build_object('kind', 'store', 'storeId', l.store_id) end,
    'modes', coalesce((select jsonb_agg(m.mode order by m.mode) from public.listing_modes m where m.listing_id = l.listing_id), '[]'::jsonb),
    'fulfillment', l.fulfillment_kind, 'categoryId', coalesce(l.category_id, ''), 'title', l.title, 'description', l.description,
    'condition', l.condition, 'defects', l.defects, 'negotiable', l.negotiable,
    'barter', case when exists (select 1 from public.listing_modes m where m.listing_id = l.listing_id and m.mode = 'barter') then jsonb_build_object('openToOffers', coalesce(l.barter_open_to_offers, false), 'wantedDescription', coalesce(l.barter_wanted_description, '')) else null end,
    'basePriceRupiah', l.base_price_rupiah::text,
    'variants', coalesce((select jsonb_agg(jsonb_build_object('clientId', v.variant_id, 'label', v.label, 'unit', v.unit, 'priceRupiah', v.price_rupiah::text, 'quota', v.quota::text) order by v.variant_id) from public.listing_variants v where v.listing_id = l.listing_id), '[]'::jsonb),
    'assetIds', coalesce((select jsonb_agg(a.asset_id order by a.position) from public.listing_assets a where a.listing_id = l.listing_id), '[]'::jsonb),
    'handoverMethods', coalesce((select jsonb_agg(f.method order by f.method) from public.listing_fulfillment_options f where f.listing_id = l.listing_id), '[]'::jsonb),
    'preorder', (select jsonb_build_object('orderClosesAt', to_char(p.order_closes_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI'), 'fulfillmentAt', to_char(p.fulfillment_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI'), 'minimumQty', p.minimum_qty::text, 'quotaMode', p.quota_mode, 'sharedQuota', p.shared_quota::text, 'dpPercent', p.dp_percent::text) from public.preorder_batches p where p.listing_id = l.listing_id and p.state = 'open' order by p.created_at desc limit 1),
    'catering', (select jsonb_build_object('minimumQty', c.minimum_qty::text, 'unit', c.unit, 'leadTimeHours', c.lead_time_hours::text, 'serviceAreaIds', to_jsonb(c.service_area_ids), 'availabilityNotes', c.availability_notes) from public.catering_terms c where c.listing_id = l.listing_id)
  ) into v_result
  from public.listings l where l.listing_id = p_listing_id and l.owner_id = v_actor;
  return v_result;
end
$$;
