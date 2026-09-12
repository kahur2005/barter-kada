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
    'status', store.status,
    'updatedAt', store.updated_at
  ) order by store.created_at), '[]'::jsonb)
  from public.stores store
  where store.owner_id = auth.uid()
$$;

create or replace function public.update_store(
  p_store_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_area_id text,
  p_area_label text,
  p_operating_hours text,
  p_handover_methods text[],
  p_public_address text,
  p_public_address_consent boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_store public.stores%rowtype;
  v_area_label text;
  v_address text := nullif(btrim(coalesce(p_public_address, '')), '');
begin
  perform private.assert_active_account(v_actor);
  if not private.plus_active(v_actor) then raise exception using errcode = 'P0001', message = 'PLUS_REQUIRED'; end if;
  if p_store_id is null or char_length(btrim(coalesce(p_name, ''))) not between 2 and 120 or char_length(coalesce(p_description, '')) > 2000 or char_length(btrim(coalesce(p_category, ''))) not between 2 and 80 or char_length(coalesce(p_operating_hours, '')) > 500 or p_handover_methods is null or cardinality(p_handover_methods) = 0 or not (p_handover_methods <@ array['pickup', 'meetup', 'delivery']::text[]) then
    raise exception using errcode = '22023', message = 'STORE_PROFILE_INVALID';
  end if;
  select area.name into v_area_label from public.service_areas area where area.area_id = p_area_id and area.enabled;
  if not found then raise exception using errcode = 'P0001', message = 'STORE_AREA_INVALID'; end if;
  select * into v_store from public.stores where store_id = p_store_id and owner_id = v_actor for update;
  if not found then raise exception using errcode = 'P0001', message = 'STORE_NOT_FOUND'; end if;
  if not coalesce(p_public_address_consent, false) then v_address := null; end if;
  update public.stores
  set name = btrim(p_name), description = left(btrim(coalesce(p_description, '')), 2000), category = btrim(p_category), area_id = p_area_id, area_label = v_area_label, operating_hours = left(btrim(coalesce(p_operating_hours, '')), 500), handover_methods = p_handover_methods, public_address = v_address, public_address_consent = coalesce(p_public_address_consent, false), updated_at = statement_timestamp()
  where store_id = v_store.store_id;
  return jsonb_build_object('id', v_store.store_id, 'slug', v_store.slug, 'name', btrim(p_name), 'description', left(btrim(coalesce(p_description, '')), 2000), 'category', btrim(p_category), 'areaId', p_area_id, 'areaLabel', v_area_label, 'operatingHours', left(btrim(coalesce(p_operating_hours, '')), 500), 'handoverMethods', p_handover_methods, 'publicAddress', v_address, 'publicAddressConsent', coalesce(p_public_address_consent, false), 'status', v_store.status, 'updatedAt', statement_timestamp());
end
$$;

revoke all on function public.update_store(uuid, text, text, text, text, text, text, text[], text, boolean) from public, anon, authenticated;
grant execute on function public.update_store(uuid, text, text, text, text, text, text, text[], text, boolean) to authenticated;
