alter table private.listing_assets add column processing_started_at timestamptz;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-quarantine', 'listing-quarantine', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('listing-media', 'listing-media', false, 5242880, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy listing_quarantine_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-quarantine'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and storage.filename(name) = 'source'
);

create or replace function private.reserve_listing_asset_command(p_mime_type text, p_byte_size integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_asset_id uuid := gen_random_uuid();
  v_path text;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') or p_byte_size not between 1 and 5242880 then
    raise exception using errcode = 'P0001', message = 'LISTING_ASSET_INVALID';
  end if;
  if (select count(*) from private.listing_assets where owner_id = v_actor and state in ('quarantined', 'processing') and created_at > statement_timestamp() - interval '1 hour') >= 20 then
    raise exception using errcode = 'P0001', message = 'LISTING_ASSET_RATE_LIMIT';
  end if;
  v_path := v_actor::text || '/' || v_asset_id::text || '/source';
  insert into private.listing_assets(asset_id, owner_id, quarantine_path, mime_type, byte_size)
  values (v_asset_id, v_actor, v_path, p_mime_type, p_byte_size);
  return jsonb_build_object('assetId', v_asset_id, 'quarantinePath', v_path);
end
$$;

create or replace function public.reserve_listing_asset(p_mime_type text, p_byte_size integer)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.reserve_listing_asset_command(p_mime_type, p_byte_size)
$$;

create or replace function private.get_listing_asset_processing_context_command(p_asset_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_asset private.listing_assets%rowtype;
begin
  perform private.assert_service_role();
  update private.listing_assets
  set state = 'processing', processing_started_at = statement_timestamp()
  where asset_id = p_asset_id and owner_id = p_actor_id
    and (state = 'quarantined' or (state = 'processing' and processing_started_at < statement_timestamp() - interval '5 minutes'))
  returning * into v_asset;
  if not found then return null; end if;
  return jsonb_build_object(
    'quarantinePath', v_asset.quarantine_path,
    'processedPath', p_actor_id::text || '/' || p_asset_id::text || '.webp',
    'claimedMimeType', v_asset.mime_type,
    'claimedByteSize', v_asset.byte_size
  );
end
$$;
create or replace function public.get_listing_asset_processing_context(p_asset_id uuid, p_actor_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.get_listing_asset_processing_context_command(p_asset_id, p_actor_id)
$$;

create or replace function private.mark_listing_asset_processed_command(
  p_asset_id uuid, p_actor_id uuid, p_processed_path text, p_width integer, p_height integer, p_content_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_service_role();
  if p_processed_path <> (p_actor_id::text || '/' || p_asset_id::text || '.webp') then
    raise exception using errcode = 'P0001', message = 'LISTING_ASSET_PATH_INVALID';
  end if;
  update private.listing_assets set
    state = 'processed', processed_path = p_processed_path, width = p_width, height = p_height,
    content_hash = p_content_hash, processed_at = statement_timestamp(), processing_started_at = null,
    quarantine_path = null, mime_type = 'image/webp'
  where asset_id = p_asset_id and owner_id = p_actor_id and state = 'processing';
  if not found then raise exception using errcode = 'P0001', message = 'LISTING_ASSET_STATE_CONFLICT'; end if;
end
$$;
create or replace function public.mark_listing_asset_processed(
  p_asset_id uuid, p_actor_id uuid, p_processed_path text, p_width integer, p_height integer, p_content_hash text
)
returns void language sql security invoker set search_path = '' as $$
  select private.mark_listing_asset_processed_command(p_asset_id, p_actor_id, p_processed_path, p_width, p_height, p_content_hash)
$$;

create or replace function private.reject_listing_asset_command(p_asset_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_service_role();
  update private.listing_assets set state = 'rejected', processing_started_at = null, quarantine_path = null
  where asset_id = p_asset_id and owner_id = p_actor_id and state in ('quarantined', 'processing');
end
$$;
create or replace function public.reject_listing_asset(p_asset_id uuid, p_actor_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.reject_listing_asset_command(p_asset_id, p_actor_id)
$$;

revoke all on function private.reserve_listing_asset_command(text, integer), private.get_listing_asset_processing_context_command(uuid, uuid), private.mark_listing_asset_processed_command(uuid, uuid, text, integer, integer, text), private.reject_listing_asset_command(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reserve_listing_asset(text, integer), public.get_listing_asset_processing_context(uuid, uuid), public.mark_listing_asset_processed(uuid, uuid, text, integer, integer, text), public.reject_listing_asset(uuid, uuid) from public, anon, authenticated;
grant execute on function private.reserve_listing_asset_command(text, integer), public.reserve_listing_asset(text, integer) to authenticated;
grant execute on function private.get_listing_asset_processing_context_command(uuid, uuid), private.mark_listing_asset_processed_command(uuid, uuid, text, integer, integer, text), private.reject_listing_asset_command(uuid, uuid) to service_role;
grant execute on function public.get_listing_asset_processing_context(uuid, uuid), public.mark_listing_asset_processed(uuid, uuid, text, integer, integer, text), public.reject_listing_asset(uuid, uuid) to service_role;
