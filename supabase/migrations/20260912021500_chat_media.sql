create table private.chat_assets (
  asset_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(conversation_id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  message_id uuid references public.messages(message_id) on delete restrict,
  state text not null default 'quarantined',
  quarantine_path text,
  processed_path text,
  mime_type text not null,
  byte_size integer not null,
  width integer,
  height integer,
  content_hash text,
  processing_started_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint chat_assets_state check (state in ('quarantined', 'processing', 'processed', 'rejected')),
  constraint chat_assets_mime check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint chat_assets_size check (byte_size between 1 and 5242880),
  constraint chat_assets_dimensions check ((width is null and height is null) or (width > 0 and height > 0)),
  constraint chat_assets_hash check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$')
);
create index chat_assets_owner_recent_idx on private.chat_assets(owner_id, created_at desc);
create index chat_assets_conversation_idx on private.chat_assets(conversation_id, message_id);
alter table private.chat_assets enable row level security;
revoke all on private.chat_assets from public, anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('chat-quarantine', 'chat-quarantine', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('chat-media', 'chat-media', false, 5242880, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.chat_asset_upload_allowed(p_actor uuid, p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.chat_assets asset
    where asset.owner_id = p_actor
      and asset.state = 'quarantined'
      and asset.quarantine_path = p_path
  )
$$;

create or replace function private.chat_asset_read_allowed(p_actor uuid, p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.chat_assets asset
    where asset.processed_path = p_path
      and asset.state = 'processed'
      and asset.message_id is not null
      and private.is_conversation_member(asset.conversation_id, p_actor)
  )
$$;

create policy chat_quarantine_reserved_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-quarantine'
  and private.chat_asset_upload_allowed((select auth.uid()), name)
);

create policy chat_media_participant_sign
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-media'
  and private.chat_asset_read_allowed((select auth.uid()), name)
);

create or replace function private.reserve_chat_asset_command(p_conversation_id uuid, p_mime_type text, p_byte_size integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_counterpart uuid;
  v_asset uuid := gen_random_uuid();
  v_path text;
begin
  perform private.assert_active_account(v_actor);
  select member.user_id into v_counterpart
  from public.conversation_members actor_member
  join public.conversation_members member on member.conversation_id = actor_member.conversation_id and member.user_id <> v_actor
  where actor_member.conversation_id = p_conversation_id and actor_member.user_id = v_actor;
  if v_counterpart is null then raise insufficient_privilege using message = 'CONVERSATION_FORBIDDEN'; end if;
  if private.is_chat_blocked(v_actor, v_counterpart) then raise exception using errcode = 'P0001', message = 'CHAT_BLOCKED'; end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') or p_byte_size not between 1 and 5242880 then
    raise exception using errcode = '22023', message = 'CHAT_ASSET_INVALID';
  end if;
  if (select count(*) from private.chat_assets where owner_id = v_actor and state in ('quarantined', 'processing') and created_at > statement_timestamp() - interval '1 hour') >= 20 then
    raise exception using errcode = 'P0001', message = 'CHAT_ASSET_RATE_LIMIT';
  end if;
  v_path := v_actor::text || '/' || v_asset::text || '/source';
  insert into private.chat_assets(asset_id, conversation_id, owner_id, quarantine_path, mime_type, byte_size)
  values (v_asset, p_conversation_id, v_actor, v_path, p_mime_type, p_byte_size);
  return jsonb_build_object('assetId', v_asset, 'quarantinePath', v_path);
end;
$$;

create or replace function private.get_chat_asset_processing_context_command(p_asset_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_asset private.chat_assets%rowtype;
begin
  perform private.assert_service_role();
  update private.chat_assets set state = 'processing', processing_started_at = statement_timestamp()
  where asset_id = p_asset_id and owner_id = p_actor_id
    and (state = 'quarantined' or (state = 'processing' and processing_started_at < statement_timestamp() - interval '5 minutes'))
  returning * into v_asset;
  if not found then return null; end if;
  return jsonb_build_object(
    'quarantinePath', v_asset.quarantine_path,
    'processedPath', p_actor_id::text || '/' || p_asset_id::text || '.webp'
  );
end;
$$;

create or replace function private.mark_chat_asset_processed_command(p_asset_id uuid, p_actor_id uuid, p_processed_path text, p_width integer, p_height integer, p_content_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_service_role();
  if p_processed_path <> (p_actor_id::text || '/' || p_asset_id::text || '.webp')
     or p_width <= 0 or p_height <= 0 or p_content_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'CHAT_ASSET_OUTPUT_INVALID';
  end if;
  update private.chat_assets set
    state = 'processed', processed_path = p_processed_path, width = p_width, height = p_height,
    content_hash = p_content_hash, processed_at = statement_timestamp(), processing_started_at = null,
    quarantine_path = null, mime_type = 'image/webp'
  where asset_id = p_asset_id and owner_id = p_actor_id and state = 'processing';
  if not found then raise exception using errcode = 'P0001', message = 'CHAT_ASSET_STATE_CONFLICT'; end if;
end;
$$;

create or replace function private.reject_chat_asset_command(p_asset_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_service_role();
  update private.chat_assets set state = 'rejected', processing_started_at = null, quarantine_path = null
  where asset_id = p_asset_id and owner_id = p_actor_id and state in ('quarantined', 'processing');
end;
$$;

create or replace function private.send_chat_images_command(p_conversation_id uuid, p_client_message_id uuid, p_asset_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_counterpart uuid;
  v_existing public.messages%rowtype;
  v_message public.messages%rowtype;
  v_seq bigint;
  v_count integer;
  v_paths jsonb;
begin
  perform private.assert_active_account(v_actor);
  if p_client_message_id is null or coalesce(array_length(p_asset_ids, 1), 0) not between 1 and 4
     or (select count(distinct asset_id) from unnest(p_asset_ids) as requested(asset_id)) <> array_length(p_asset_ids, 1) then
    raise exception using errcode = '22023', message = 'CHAT_IMAGE_MESSAGE_INVALID';
  end if;
  select member.user_id into v_counterpart
  from public.conversation_members actor_member
  join public.conversation_members member on member.conversation_id = actor_member.conversation_id and member.user_id <> v_actor
  where actor_member.conversation_id = p_conversation_id and actor_member.user_id = v_actor;
  if v_counterpart is null then raise insufficient_privilege using message = 'CONVERSATION_FORBIDDEN'; end if;
  if private.is_chat_blocked(v_actor, v_counterpart) then raise exception using errcode = 'P0001', message = 'CHAT_BLOCKED'; end if;

  select next_seq + 1 into v_seq from public.conversations where conversation_id = p_conversation_id for update;
  if v_seq is null then raise exception using errcode = 'P0001', message = 'CONVERSATION_NOT_FOUND'; end if;
  select * into v_existing from public.messages where sender_id = v_actor and client_message_id = p_client_message_id;
  if v_existing.message_id is not null and (v_existing.conversation_id <> p_conversation_id or v_existing.type <> 'image' or v_existing.transaction_id is not null) then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end if;

  perform 1 from private.chat_assets where asset_id = any(p_asset_ids) order by asset_id for update;
  select count(*), jsonb_agg(asset.processed_path order by requested.ordinality)
  into v_count, v_paths
  from unnest(p_asset_ids) with ordinality requested(asset_id, ordinality)
  join private.chat_assets asset on asset.asset_id = requested.asset_id
  where asset.conversation_id = p_conversation_id and asset.owner_id = v_actor and asset.state = 'processed'
    and (asset.message_id is null or asset.message_id = v_existing.message_id);
  if v_count <> array_length(p_asset_ids, 1) then raise exception using errcode = 'P0001', message = 'CHAT_ASSET_NOT_READY'; end if;

  if v_existing.message_id is not null then
    if v_existing.body <> jsonb_build_object('imagePaths', v_paths) then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return private.message_dto(v_existing);
  end if;

  update public.conversations set next_seq = v_seq, last_message_at = statement_timestamp() where conversation_id = p_conversation_id;
  insert into public.messages(conversation_id, sender_id, seq, client_message_id, type, body)
  values (p_conversation_id, v_actor, v_seq, p_client_message_id, 'image', jsonb_build_object('imagePaths', v_paths))
  returning * into v_message;
  update private.chat_assets set message_id = v_message.message_id where asset_id = any(p_asset_ids);
  return private.message_dto(v_message);
end;
$$;

create or replace function public.reserve_chat_asset(p_conversation_id uuid, p_mime_type text, p_byte_size integer)
returns jsonb language sql security invoker set search_path = '' as $$ select private.reserve_chat_asset_command(p_conversation_id, p_mime_type, p_byte_size) $$;
create or replace function public.get_chat_asset_processing_context(p_asset_id uuid, p_actor_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.get_chat_asset_processing_context_command(p_asset_id, p_actor_id) $$;
create or replace function public.mark_chat_asset_processed(p_asset_id uuid, p_actor_id uuid, p_processed_path text, p_width integer, p_height integer, p_content_hash text)
returns void language sql security invoker set search_path = '' as $$ select private.mark_chat_asset_processed_command(p_asset_id, p_actor_id, p_processed_path, p_width, p_height, p_content_hash) $$;
create or replace function public.reject_chat_asset(p_asset_id uuid, p_actor_id uuid)
returns void language sql security invoker set search_path = '' as $$ select private.reject_chat_asset_command(p_asset_id, p_actor_id) $$;
create or replace function public.send_chat_images(p_conversation_id uuid, p_client_message_id uuid, p_asset_ids uuid[])
returns jsonb language sql security invoker set search_path = '' as $$ select private.send_chat_images_command(p_conversation_id, p_client_message_id, p_asset_ids) $$;

revoke all on function private.chat_asset_upload_allowed(uuid, text), private.chat_asset_read_allowed(uuid, text), private.reserve_chat_asset_command(uuid, text, integer), private.get_chat_asset_processing_context_command(uuid, uuid), private.mark_chat_asset_processed_command(uuid, uuid, text, integer, integer, text), private.reject_chat_asset_command(uuid, uuid), private.send_chat_images_command(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reserve_chat_asset(uuid, text, integer), public.get_chat_asset_processing_context(uuid, uuid), public.mark_chat_asset_processed(uuid, uuid, text, integer, integer, text), public.reject_chat_asset(uuid, uuid), public.send_chat_images(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function private.chat_asset_upload_allowed(uuid, text), private.chat_asset_read_allowed(uuid, text), private.reserve_chat_asset_command(uuid, text, integer), private.send_chat_images_command(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.reserve_chat_asset(uuid, text, integer), public.send_chat_images(uuid, uuid, uuid[]) to authenticated;
grant execute on function private.get_chat_asset_processing_context_command(uuid, uuid), private.mark_chat_asset_processed_command(uuid, uuid, text, integer, integer, text), private.reject_chat_asset_command(uuid, uuid) to service_role;
grant execute on function public.get_chat_asset_processing_context(uuid, uuid), public.mark_chat_asset_processed(uuid, uuid, text, integer, integer, text), public.reject_chat_asset(uuid, uuid) to service_role;
