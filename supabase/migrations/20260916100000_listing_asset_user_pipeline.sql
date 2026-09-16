-- Alternative listing asset pipeline functions for authenticated users.
-- These mirror the service_role-gated functions but use auth.uid() for ownership
-- verification, allowing the Vite dev middleware (or any trusted caller with a
-- valid user JWT) to process images without requiring a service_role JWT claim.

-- get_my_listing_asset_context: atomically transitions the asset from 'quarantined'
-- to 'processing' and returns the paths needed to download/upload the image.
create or replace function private.get_my_listing_asset_context_command(p_asset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_asset private.listing_assets%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  update private.listing_assets
  set state = 'processing', processing_started_at = statement_timestamp()
  where asset_id = p_asset_id and owner_id = v_actor
    and (state = 'quarantined' or (state = 'processing' and processing_started_at < statement_timestamp() - interval '5 minutes'))
  returning * into v_asset;
  if not found then return null; end if;
  return jsonb_build_object(
    'quarantinePath', v_asset.quarantine_path,
    'processedPath', v_actor::text || '/' || p_asset_id::text || '.webp',
    'claimedMimeType', v_asset.mime_type,
    'claimedByteSize', v_asset.byte_size
  );
end
$$;

create or replace function public.get_my_listing_asset_context(p_asset_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.get_my_listing_asset_context_command(p_asset_id)
$$;

-- mark_my_listing_asset_processed: marks a user's own asset as processed.
-- Path validation ensures users cannot reference another user's storage path.
create or replace function private.mark_my_listing_asset_processed_command(
  p_asset_id uuid, p_processed_path text, p_width integer, p_height integer, p_content_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_processed_path <> (v_actor::text || '/' || p_asset_id::text || '.webp') then
    raise exception using errcode = 'P0001', message = 'LISTING_ASSET_PATH_INVALID';
  end if;
  update private.listing_assets set
    state = 'processed', processed_path = p_processed_path, width = p_width, height = p_height,
    content_hash = p_content_hash, processed_at = statement_timestamp(), processing_started_at = null,
    quarantine_path = null, mime_type = 'image/webp'
  where asset_id = p_asset_id and owner_id = v_actor and state = 'processing';
  if not found then raise exception using errcode = 'P0001', message = 'LISTING_ASSET_STATE_CONFLICT'; end if;
end
$$;

create or replace function public.mark_my_listing_asset_processed(
  p_asset_id uuid, p_processed_path text, p_width integer, p_height integer, p_content_hash text
)
returns void language sql security invoker set search_path = '' as $$
  select private.mark_my_listing_asset_processed_command(p_asset_id, p_processed_path, p_width, p_height, p_content_hash)
$$;

-- reject_my_listing_asset: marks a user's own asset as rejected.
create or replace function private.reject_my_listing_asset_command(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  update private.listing_assets set state = 'rejected', processing_started_at = null, quarantine_path = null
  where asset_id = p_asset_id and owner_id = v_actor and state in ('quarantined', 'processing');
end
$$;

create or replace function public.reject_my_listing_asset(p_asset_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.reject_my_listing_asset_command(p_asset_id)
$$;

-- Grant execute permissions to authenticated users only (not anon).
revoke all on function
  private.get_my_listing_asset_context_command(uuid),
  private.mark_my_listing_asset_processed_command(uuid, text, integer, integer, text),
  private.reject_my_listing_asset_command(uuid),
  public.get_my_listing_asset_context(uuid),
  public.mark_my_listing_asset_processed(uuid, text, integer, integer, text),
  public.reject_my_listing_asset(uuid)
from public, anon;

grant execute on function
  private.get_my_listing_asset_context_command(uuid),
  private.mark_my_listing_asset_processed_command(uuid, text, integer, integer, text),
  private.reject_my_listing_asset_command(uuid),
  public.get_my_listing_asset_context(uuid),
  public.mark_my_listing_asset_processed(uuid, text, integer, integer, text),
  public.reject_my_listing_asset(uuid)
to authenticated, service_role;
