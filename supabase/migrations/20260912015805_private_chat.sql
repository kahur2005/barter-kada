create table public.conversations (
  conversation_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(listing_id) on delete restrict,
  user_low uuid not null references auth.users(id) on delete restrict,
  user_high uuid not null references auth.users(id) on delete restrict,
  next_seq bigint not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  last_message_at timestamptz not null default statement_timestamp(),
  constraint conversations_distinct_users check (user_low <> user_high),
  constraint conversations_canonical_users check (user_low::text < user_high::text),
  constraint conversations_sequence_nonnegative check (next_seq >= 0),
  constraint conversations_listing_pair_unique unique (listing_id, user_low, user_high)
);
create index conversations_user_low_recent_idx on public.conversations(user_low, last_message_at desc);
create index conversations_user_high_recent_idx on public.conversations(user_high, last_message_at desc);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(conversation_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  last_read_seq bigint not null default 0,
  joined_at timestamptz not null default statement_timestamp(),
  primary key (conversation_id, user_id),
  constraint conversation_members_cursor_nonnegative check (last_read_seq >= 0)
);
create index conversation_members_user_idx on public.conversation_members(user_id, conversation_id);

create table public.messages (
  message_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(conversation_id) on delete restrict,
  sender_id uuid references auth.users(id) on delete restrict,
  seq bigint not null,
  client_message_id uuid,
  type text not null,
  transaction_id uuid,
  body jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint messages_sequence_positive check (seq > 0),
  constraint messages_type check (type in ('text', 'image', 'listing', 'transaction', 'system')),
  constraint messages_body_object check (jsonb_typeof(body) = 'object'),
  constraint messages_client_id_for_sender check ((sender_id is null and client_message_id is null) or (sender_id is not null and client_message_id is not null)),
  constraint messages_conversation_sequence_unique unique (conversation_id, seq)
);
create unique index messages_sender_client_uidx on public.messages(sender_id, client_message_id) where sender_id is not null and client_message_id is not null;
create index messages_conversation_recent_idx on public.messages(conversation_id, seq desc);

create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default statement_timestamp(),
  primary key (blocker_id, blocked_id),
  constraint blocks_distinct_users check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks(blocked_id, blocker_id);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;

create or replace function private.is_conversation_member(p_conversation_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = p_actor
  )
$$;

create policy conversations_participant_read on public.conversations
for select to authenticated
using (private.is_conversation_member(conversation_id, (select auth.uid())));

create policy conversation_members_participant_read on public.conversation_members
for select to authenticated
using (private.is_conversation_member(conversation_id, (select auth.uid())));

create policy messages_participant_read on public.messages
for select to authenticated
using (private.is_conversation_member(conversation_id, (select auth.uid())));

create policy blocks_actor_read on public.blocks
for select to authenticated
using (blocker_id = (select auth.uid()));

revoke all on public.conversations, public.conversation_members, public.messages, public.blocks from public, anon, authenticated;
grant select on public.conversations, public.conversation_members, public.messages to authenticated;

create or replace function private.assert_active_account(p_actor uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from private.account_state
    where user_id = p_actor and account_status = 'active' and onboarding_step = 'complete'
  ) then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_ACTIVE';
  end if;
end;
$$;

create or replace function private.is_chat_blocked(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_first and blocked_id = p_second)
       or (blocker_id = p_second and blocked_id = p_first)
  )
$$;

create or replace function private.message_dto(p_message public.messages)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_message.message_id,
    'seq', p_message.seq,
    'senderId', p_message.sender_id,
    'type', p_message.type,
    'transactionId', p_message.transaction_id,
    'body', p_message.body,
    'sentAt', to_char(p_message.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
$$;

create or replace function private.open_conversation_command(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_low uuid;
  v_high uuid;
  v_conversation uuid;
begin
  perform private.assert_active_account(v_actor);

  select owner_id into v_owner
  from public.listings
  where listing_id = p_listing_id
    and lifecycle = 'active'
    and hidden_at is null
    and availability = 'available';
  if v_owner is null then raise exception using errcode = 'P0001', message = 'LISTING_NOT_AVAILABLE'; end if;
  if v_owner = v_actor then raise exception using errcode = '22023', message = 'OWN_LISTING_CONVERSATION'; end if;
  if private.is_chat_blocked(v_actor, v_owner) then raise exception using errcode = 'P0001', message = 'CHAT_BLOCKED'; end if;

  if v_actor::text < v_owner::text then v_low := v_actor; v_high := v_owner; else v_low := v_owner; v_high := v_actor; end if;

  insert into public.conversations(listing_id, user_low, user_high)
  values (p_listing_id, v_low, v_high)
  on conflict (listing_id, user_low, user_high) do nothing
  returning conversation_id into v_conversation;

  if v_conversation is null then
    select conversation_id into strict v_conversation
    from public.conversations
    where listing_id = p_listing_id and user_low = v_low and user_high = v_high;
  end if;

  insert into public.conversation_members(conversation_id, user_id)
  values (v_conversation, v_low), (v_conversation, v_high)
  on conflict do nothing;

  return jsonb_build_object('conversationId', v_conversation);
end;
$$;

create or replace function private.list_conversations_command()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_items jsonb;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;

  select coalesce(jsonb_agg(item order by recent_at desc, conversation_id desc), '[]'::jsonb)
  into v_items
  from (
    select c.conversation_id, c.last_message_at as recent_at, jsonb_build_object(
      'id', c.conversation_id,
      'listing', jsonb_build_object(
        'id', l.listing_id,
        'title', l.title,
        'imagePath', (
          select l.owner_id::text || '/' || asset.asset_id::text || '.webp'
          from public.listing_assets asset
          where asset.listing_id = l.listing_id
          order by asset.position, asset.asset_id
          limit 1
        )
      ),
      'counterpart', jsonb_build_object(
        'id', counterpart.id,
        'name', counterpart.display_name,
        'storeName', null
      ),
      'lastMessage', case when last_message.message_id is null then null else jsonb_build_object(
        'text', case last_message.type
          when 'text' then coalesce(last_message.body->>'text', '')
          when 'image' then 'Mengirim foto'
          when 'listing' then 'Membagikan listing'
          when 'transaction' then 'Status transaksi diperbarui'
          else coalesce(last_message.body->>'text', 'Status percakapan diperbarui')
        end,
        'sentAt', to_char(last_message.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'senderId', last_message.sender_id
      ) end,
      'unreadCount', (
        select count(*)::integer
        from public.messages unread
        where unread.conversation_id = c.conversation_id
          and unread.seq > member.last_read_seq
          and unread.sender_id is distinct from v_actor
      )
    ) as item
    from public.conversations c
    join public.conversation_members member on member.conversation_id = c.conversation_id and member.user_id = v_actor
    join public.listings l on l.listing_id = c.listing_id
    join public.profiles counterpart on counterpart.id = case when c.user_low = v_actor then c.user_high else c.user_low end
    left join lateral (
      select message.* from public.messages message
      where message.conversation_id = c.conversation_id
      order by message.seq desc limit 1
    ) last_message on true
  ) summaries;

  return v_items;
end;
$$;

create or replace function private.list_messages_command(p_conversation_id uuid, p_before_seq bigint, p_limit integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_limit integer := coalesce(p_limit, 50);
  v_items jsonb;
  v_count integer;
  v_counterpart_read bigint;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if v_limit not between 1 and 100 or (p_before_seq is not null and p_before_seq <= 0) then
    raise exception using errcode = '22023', message = 'MESSAGE_PAGE_INVALID';
  end if;
  if not exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = v_actor
  ) then raise insufficient_privilege using message = 'CONVERSATION_FORBIDDEN'; end if;

  with page as (
    select message.*
    from public.messages message
    where message.conversation_id = p_conversation_id
      and (p_before_seq is null or message.seq < p_before_seq)
    order by message.seq desc
    limit v_limit + 1
  ), kept as (
    select * from page order by seq desc limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', kept.message_id,
           'seq', kept.seq,
           'senderId', kept.sender_id,
           'type', kept.type,
           'transactionId', kept.transaction_id,
           'body', kept.body,
           'sentAt', to_char(kept.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
         ) order by kept.seq), '[]'::jsonb),
         (select count(*) from page)
  into v_items, v_count
  from kept;

  select coalesce(last_read_seq, 0) into v_counterpart_read
  from public.conversation_members
  where conversation_id = p_conversation_id and user_id <> v_actor
  limit 1;

  return jsonb_build_object(
    'items', v_items,
    'hasMore', v_count > v_limit,
    'counterpartLastRead', coalesce(v_counterpart_read, 0)
  );
end;
$$;

create or replace function private.send_message_command(
  p_conversation_id uuid,
  p_client_message_id uuid,
  p_type text,
  p_body jsonb,
  p_transaction_id uuid
)
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
  v_text text;
begin
  perform private.assert_active_account(v_actor);
  if p_client_message_id is null then raise exception using errcode = '22023', message = 'CLIENT_MESSAGE_ID_REQUIRED'; end if;
  if p_type <> 'text' or p_transaction_id is not null or jsonb_typeof(p_body) <> 'object' then
    raise exception using errcode = '22023', message = 'MESSAGE_INVALID';
  end if;
  v_text := btrim(coalesce(p_body->>'text', ''));
  if char_length(v_text) not between 1 and 2000 or p_body - 'text' <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'MESSAGE_INVALID';
  end if;
  p_body := jsonb_build_object('text', v_text);

  select member.user_id into v_counterpart
  from public.conversation_members actor_member
  join public.conversation_members member on member.conversation_id = actor_member.conversation_id and member.user_id <> v_actor
  where actor_member.conversation_id = p_conversation_id and actor_member.user_id = v_actor;
  if v_counterpart is null then raise insufficient_privilege using message = 'CONVERSATION_FORBIDDEN'; end if;
  if private.is_chat_blocked(v_actor, v_counterpart) then raise exception using errcode = 'P0001', message = 'CHAT_BLOCKED'; end if;

  select next_seq + 1 into v_seq
  from public.conversations
  where conversation_id = p_conversation_id
  for update;
  if v_seq is null then raise exception using errcode = 'P0001', message = 'CONVERSATION_NOT_FOUND'; end if;

  select * into v_existing from public.messages
  where sender_id = v_actor and client_message_id = p_client_message_id;
  if found then
    if v_existing.conversation_id <> p_conversation_id or v_existing.type <> p_type
       or v_existing.body <> p_body or v_existing.transaction_id is distinct from p_transaction_id then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return private.message_dto(v_existing);
  end if;

  update public.conversations
  set next_seq = v_seq, last_message_at = statement_timestamp()
  where conversation_id = p_conversation_id;

  insert into public.messages(conversation_id, sender_id, seq, client_message_id, type, transaction_id, body)
  values (p_conversation_id, v_actor, v_seq, p_client_message_id, p_type, p_transaction_id, p_body)
  returning * into v_message;

  return private.message_dto(v_message);
end;
$$;

create or replace function private.mark_conversation_read_command(p_conversation_id uuid, p_last_read_seq bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_max_seq bigint;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_last_read_seq is null or p_last_read_seq < 0 then raise exception using errcode = '22023', message = 'READ_CURSOR_INVALID'; end if;

  select next_seq into v_max_seq from public.conversations where conversation_id = p_conversation_id for update;
  if v_max_seq is null then raise exception using errcode = 'P0001', message = 'CONVERSATION_NOT_FOUND'; end if;
  if p_last_read_seq > v_max_seq then raise exception using errcode = '22023', message = 'READ_CURSOR_INVALID'; end if;

  update public.conversation_members
  set last_read_seq = greatest(last_read_seq, p_last_read_seq)
  where conversation_id = p_conversation_id and user_id = v_actor;
  if not found then raise insufficient_privilege using message = 'CONVERSATION_FORBIDDEN'; end if;
end;
$$;

create or replace function private.block_user_command(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_blocked_id is null or p_blocked_id = v_actor or not exists (select 1 from auth.users where id = p_blocked_id) then
    raise exception using errcode = '22023', message = 'BLOCK_TARGET_INVALID';
  end if;
  insert into public.blocks(blocker_id, blocked_id) values (v_actor, p_blocked_id) on conflict do nothing;
end;
$$;

create or replace function private.unblock_user_command(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_blocked_id is null or p_blocked_id = v_actor then raise exception using errcode = '22023', message = 'BLOCK_TARGET_INVALID'; end if;
  delete from public.blocks where blocker_id = v_actor and blocked_id = p_blocked_id;
end;
$$;

create or replace function public.open_conversation(p_listing_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.open_conversation_command(p_listing_id) $$;
create or replace function public.list_conversations()
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.list_conversations_command() $$;
create or replace function public.list_messages(p_conversation_id uuid, p_before_seq bigint default null, p_limit integer default 50)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.list_messages_command(p_conversation_id, p_before_seq, p_limit) $$;
create or replace function public.send_message(p_conversation_id uuid, p_client_message_id uuid, p_type text, p_body jsonb, p_transaction_id uuid default null)
returns jsonb language sql security invoker set search_path = '' as $$ select private.send_message_command(p_conversation_id, p_client_message_id, p_type, p_body, p_transaction_id) $$;
create or replace function public.mark_conversation_read(p_conversation_id uuid, p_last_read_seq bigint)
returns void language sql security invoker set search_path = '' as $$ select private.mark_conversation_read_command(p_conversation_id, p_last_read_seq) $$;
create or replace function public.block_user(p_blocked_id uuid)
returns void language sql security invoker set search_path = '' as $$ select private.block_user_command(p_blocked_id) $$;
create or replace function public.unblock_user(p_blocked_id uuid)
returns void language sql security invoker set search_path = '' as $$ select private.unblock_user_command(p_blocked_id) $$;

revoke all on function private.is_conversation_member(uuid, uuid), private.assert_active_account(uuid), private.is_chat_blocked(uuid, uuid), private.message_dto(public.messages), private.open_conversation_command(uuid), private.list_conversations_command(), private.list_messages_command(uuid, bigint, integer), private.send_message_command(uuid, uuid, text, jsonb, uuid), private.mark_conversation_read_command(uuid, bigint), private.block_user_command(uuid), private.unblock_user_command(uuid) from public, anon, authenticated;
revoke all on function public.open_conversation(uuid), public.list_conversations(), public.list_messages(uuid, bigint, integer), public.send_message(uuid, uuid, text, jsonb, uuid), public.mark_conversation_read(uuid, bigint), public.block_user(uuid), public.unblock_user(uuid) from public, anon, authenticated;
grant execute on function private.is_conversation_member(uuid, uuid), private.assert_active_account(uuid), private.is_chat_blocked(uuid, uuid), private.message_dto(public.messages), private.open_conversation_command(uuid), private.list_conversations_command(), private.list_messages_command(uuid, bigint, integer), private.send_message_command(uuid, uuid, text, jsonb, uuid), private.mark_conversation_read_command(uuid, bigint), private.block_user_command(uuid), private.unblock_user_command(uuid) to authenticated;
grant execute on function public.open_conversation(uuid), public.list_conversations(), public.list_messages(uuid, bigint, integer), public.send_message(uuid, uuid, text, jsonb, uuid), public.mark_conversation_read(uuid, bigint), public.block_user(uuid), public.unblock_user(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_catalog.pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
