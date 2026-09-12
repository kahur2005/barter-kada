create or replace function public.get_my_stores()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', store.store_id,
    'slug', store.slug,
    'name', store.name,
    'description', store.description,
    'category', store.category,
    'areaId', store.area_id,
    'areaLabel', store.area_label,
    'operatingHours', store.operating_hours,
    'handoverMethods', store.handover_methods,
    'publicAddress', store.public_address,
    'publicAddressConsent', store.public_address_consent,
    'activeProductCount', (select count(*) from public.listings listing where listing.store_id = store.store_id and listing.lifecycle = 'active'),
    'status', store.status,
    'updatedAt', store.updated_at
  ) order by store.created_at), '[]'::jsonb)
  from public.stores store
  where store.owner_id = auth.uid()
$$;

revoke all on function public.get_my_stores() from public, anon, authenticated;
grant execute on function public.get_my_stores() to authenticated;
