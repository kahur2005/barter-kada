create or replace function private.get_my_listings_command(p_lifecycle text default 'active')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_limit integer;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_lifecycle not in ('draft', 'active', 'archived', 'completed') then raise exception using errcode = '22023', message = 'LISTING_LIFECYCLE_INVALID'; end if;
  select personal_active_limit into strict v_limit from private.listing_plan_settings where singleton;
  return jsonb_build_object(
    'activeCount', (select count(*) from public.listings where owner_id = v_actor and store_id is null and lifecycle = 'active'),
    'activeLimit', v_limit,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'listingId', listing.listing_id,
      'title', listing.title,
      'lifecycle', listing.lifecycle,
      'version', listing.version,
      'reserved', listing.reserved,
      'updatedAt', listing.updated_at,
      'publisher', case when listing.store_id is null then jsonb_build_object('kind', 'personal') else jsonb_build_object('kind', 'store', 'storeId', listing.store_id, 'storeName', store.name, 'storeSlug', store.slug) end
    ) order by listing.updated_at desc) from public.listings listing left join public.stores store on store.store_id = listing.store_id where listing.owner_id = v_actor and listing.lifecycle = p_lifecycle), '[]'::jsonb)
  );
end
$$;
