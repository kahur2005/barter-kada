create table public.transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(conversation_id) on delete restrict,
  kind text not null,
  party_a uuid not null references auth.users(id) on delete restrict,
  party_b uuid not null references auth.users(id) on delete restrict,
  lifecycle text not null default 'negotiating',
  current_revision integer not null default 1,
  accepted_revision integer,
  row_version integer not null default 1,
  event_seq bigint not null default 0,
  cancellation_reason text,
  agreed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint transactions_kind check (kind = 'barter'),
  constraint transactions_parties_distinct check (party_a <> party_b),
  constraint transactions_lifecycle check (lifecycle in ('negotiating', 'agreed', 'completed', 'cancelled')),
  constraint transactions_revision_positive check (current_revision > 0 and (accepted_revision is null or accepted_revision > 0)),
  constraint transactions_versions_nonnegative check (row_version > 0 and event_seq >= 0)
);
create index transactions_party_a_recent_idx on public.transactions(party_a, updated_at desc);
create index transactions_party_b_recent_idx on public.transactions(party_b, updated_at desc);
create index transactions_conversation_idx on public.transactions(conversation_id, created_at desc);

create table public.transaction_revisions (
  revision_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(transaction_id) on delete restrict,
  revision integer not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  reason text,
  topup_payer_id uuid references auth.users(id) on delete restrict,
  topup_payee_id uuid references auth.users(id) on delete restrict,
  topup_amount_rupiah bigint,
  supersedes_revision integer,
  created_at timestamptz not null default statement_timestamp(),
  constraint transaction_revisions_unique unique (transaction_id, revision),
  constraint transaction_revisions_topup check (
    (topup_payer_id is null and topup_payee_id is null and topup_amount_rupiah is null)
    or (topup_payer_id is not null and topup_payee_id is not null and topup_payer_id <> topup_payee_id and topup_amount_rupiah between 1 and 1000000000000000)
  )
);

create table public.transaction_items (
  item_id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.transaction_revisions(revision_id) on delete restrict,
  offered_by uuid not null references auth.users(id) on delete restrict,
  listing_id uuid references public.listings(listing_id) on delete restrict,
  source_listing_version integer,
  client_key text not null,
  name text not null,
  details text not null,
  quantity integer not null,
  asset_refs jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint transaction_items_name check (char_length(name) between 2 and 120),
  constraint transaction_items_details check (char_length(details) between 2 and 1000),
  constraint transaction_items_quantity check (quantity between 1 and 999),
  constraint transaction_items_assets check (jsonb_typeof(asset_refs) = 'array' and jsonb_array_length(asset_refs) between 1 and 4),
  constraint transaction_items_listing_snapshot check ((listing_id is null and source_listing_version is null) or (listing_id is not null and source_listing_version is not null))
);
create unique index transaction_items_revision_client_uidx on public.transaction_items(revision_id, client_key);
create unique index transaction_items_revision_listing_uidx on public.transaction_items(revision_id, listing_id) where listing_id is not null;

create table public.transaction_consents (
  transaction_id uuid not null references public.transactions(transaction_id) on delete restrict,
  revision integer not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  ready_at timestamptz,
  approved_at timestamptz,
  primary key (transaction_id, revision, user_id),
  constraint transaction_consents_approval_order check (approved_at is null or (ready_at is not null and approved_at >= ready_at))
);

create table public.inventory_pools (
  pool_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.listings(listing_id) on delete restrict,
  capacity integer not null default 1,
  held integer not null default 0,
  consumed integer not null default 0,
  is_exclusive boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  constraint inventory_pool_capacity check (capacity > 0 and held >= 0 and consumed >= 0 and held + consumed <= capacity),
  constraint inventory_pool_exclusive check (not is_exclusive or capacity = 1),
  constraint inventory_pool_id_exclusive_unique unique (pool_id, is_exclusive)
);

create table public.reservations (
  reservation_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(transaction_id) on delete restrict,
  pool_id uuid not null,
  is_exclusive boolean not null,
  quantity integer not null,
  revision integer not null,
  state text not null default 'held',
  created_at timestamptz not null default statement_timestamp(),
  released_at timestamptz,
  consumed_at timestamptz,
  constraint reservations_pool_fk foreign key (pool_id, is_exclusive) references public.inventory_pools(pool_id, is_exclusive) on delete restrict,
  constraint reservations_quantity check (quantity > 0),
  constraint reservations_state check (state in ('held', 'released', 'consumed')),
  constraint reservations_exclusive_quantity check (not is_exclusive or quantity = 1)
);
create unique index reservations_transaction_pool_active_uidx on public.reservations(transaction_id, pool_id) where state = 'held';
create unique index reservations_exclusive_pool_active_uidx on public.reservations(pool_id) where state = 'held' and is_exclusive;

create table public.fulfillments (
  transaction_id uuid primary key references public.transactions(transaction_id) on delete restrict,
  party_a_received_at timestamptz,
  party_b_received_at timestamptz,
  first_received_at timestamptz,
  updated_at timestamptz not null default statement_timestamp()
);

create table public.payment_obligations (
  obligation_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(transaction_id) on delete restrict,
  revision integer not null,
  kind text not null,
  payer_id uuid not null references auth.users(id) on delete restrict,
  payee_id uuid not null references auth.users(id) on delete restrict,
  amount_rupiah bigint not null,
  state text not null default 'due',
  created_at timestamptz not null default statement_timestamp(),
  constraint payment_obligations_kind check (kind in ('topup', 'dp', 'balance', 'shipping')),
  constraint payment_obligations_parties check (payer_id <> payee_id),
  constraint payment_obligations_amount check (amount_rupiah > 0),
  constraint payment_obligations_state check (state in ('due', 'acknowledged', 'cancelled')),
  constraint payment_obligations_unique unique (transaction_id, revision, kind)
);

create table public.payment_acknowledgements (
  acknowledgement_id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null unique references public.payment_obligations(obligation_id) on delete restrict,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  amount_rupiah bigint not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint payment_acknowledgements_amount check (amount_rupiah > 0)
);

create table public.transaction_events (
  event_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(transaction_id) on delete restrict,
  seq bigint not null,
  actor_id uuid references auth.users(id) on delete restrict,
  type text not null,
  revision integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint transaction_events_sequence check (seq > 0),
  constraint transaction_events_metadata check (jsonb_typeof(metadata) = 'object'),
  constraint transaction_events_unique unique (transaction_id, seq)
);
create index transaction_events_recent_idx on public.transaction_events(transaction_id, seq desc);

create table private.command_receipts (
  actor_id uuid not null references auth.users(id) on delete cascade,
  command text not null,
  idempotency_key uuid not null,
  request_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (actor_id, command, idempotency_key),
  constraint command_receipts_hash check (request_hash ~ '^[a-f0-9]{64}$')
);

create table private.trade_asset_bindings (
  asset_id uuid not null references private.chat_assets(asset_id) on delete restrict,
  transaction_id uuid not null references public.transactions(transaction_id) on delete restrict,
  revision integer not null,
  item_id uuid not null references public.transaction_items(item_id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (asset_id, transaction_id, revision)
);

alter table public.transactions enable row level security;
alter table public.transaction_revisions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.transaction_consents enable row level security;
alter table public.inventory_pools enable row level security;
alter table public.reservations enable row level security;
alter table public.fulfillments enable row level security;
alter table public.payment_obligations enable row level security;
alter table public.payment_acknowledgements enable row level security;
alter table public.transaction_events enable row level security;
alter table private.command_receipts enable row level security;
alter table private.trade_asset_bindings enable row level security;

create or replace function private.is_trade_participant(p_transaction_id uuid, p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.transactions where transaction_id = p_transaction_id and p_actor in (party_a, party_b))
$$;

create policy transactions_participant_read on public.transactions for select to authenticated using (private.is_trade_participant(transaction_id, (select auth.uid())));
create policy transaction_revisions_participant_read on public.transaction_revisions for select to authenticated using (private.is_trade_participant(transaction_id, (select auth.uid())));
create policy transaction_items_participant_read on public.transaction_items for select to authenticated using (exists (select 1 from public.transaction_revisions revision where revision.revision_id = transaction_items.revision_id and private.is_trade_participant(revision.transaction_id, (select auth.uid()))));
create policy transaction_consents_participant_read on public.transaction_consents for select to authenticated using (private.is_trade_participant(transaction_id, (select auth.uid())));
create policy reservations_participant_read on public.reservations for select to authenticated using (private.is_trade_participant(transaction_id, (select auth.uid())));
create policy fulfillments_participant_read on public.fulfillments for select to authenticated using (private.is_trade_participant(transaction_id, (select auth.uid())));
create policy payment_obligations_participant_read on public.payment_obligations for select to authenticated using (private.is_trade_participant(transaction_id, (select auth.uid())));
create policy payment_acknowledgements_participant_read on public.payment_acknowledgements for select to authenticated using (exists (select 1 from public.payment_obligations obligation where obligation.obligation_id = payment_acknowledgements.obligation_id and private.is_trade_participant(obligation.transaction_id, (select auth.uid()))));
create policy transaction_events_participant_read on public.transaction_events for select to authenticated using (private.is_trade_participant(transaction_id, (select auth.uid())));

revoke all on public.transactions, public.transaction_revisions, public.transaction_items, public.transaction_consents, public.inventory_pools, public.reservations, public.fulfillments, public.payment_obligations, public.payment_acknowledgements, public.transaction_events from public, anon, authenticated;
grant select on public.transactions, public.transaction_revisions, public.transaction_items, public.transaction_consents, public.reservations, public.fulfillments, public.payment_obligations, public.payment_acknowledgements, public.transaction_events to authenticated;
revoke all on private.command_receipts, private.trade_asset_bindings from public, anon, authenticated;

create or replace function private.begin_command(p_actor uuid, p_command text, p_key uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hash text; v_existing private.command_receipts%rowtype;
begin
  if p_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_key is null then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  v_hash := encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text || ':' || p_command || ':' || p_key::text, 0));
  select * into v_existing from private.command_receipts where actor_id = p_actor and command = p_command and idempotency_key = p_key;
  if found then
    if v_existing.request_hash <> v_hash then raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return v_existing.result;
  end if;
  return null;
end
$$;

create or replace function private.finish_command(p_actor uuid, p_command text, p_key uuid, p_payload jsonb, p_result jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into private.command_receipts(actor_id, command, idempotency_key, request_hash, result)
  values (p_actor, p_command, p_key, encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex'), p_result);
end
$$;

create or replace function private.append_transaction_message(p_conversation_id uuid, p_transaction_id uuid, p_event text, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_seq bigint;
begin
  select next_seq + 1 into strict v_seq from public.conversations where conversation_id = p_conversation_id for update;
  update public.conversations set next_seq = v_seq, last_message_at = statement_timestamp() where conversation_id = p_conversation_id;
  insert into public.messages(conversation_id, sender_id, seq, client_message_id, type, transaction_id, body)
  values (p_conversation_id, null, v_seq, null, 'transaction', p_transaction_id, jsonb_build_object('event', p_event, 'text', p_text));
end
$$;

create or replace function private.record_trade_event(p_transaction_id uuid, p_actor uuid, p_type text, p_revision integer, p_metadata jsonb, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_seq bigint; v_conversation uuid;
begin
  update public.transactions set event_seq = event_seq + 1, updated_at = statement_timestamp()
  where transaction_id = p_transaction_id returning event_seq, conversation_id into strict v_seq, v_conversation;
  insert into public.transaction_events(transaction_id, seq, actor_id, type, revision, metadata)
  values (p_transaction_id, v_seq, p_actor, p_type, p_revision, coalesce(p_metadata, '{}'::jsonb));
  perform private.append_transaction_message(v_conversation, p_transaction_id, p_type, p_text);
end
$$;

create or replace function private.materialize_trade_items(p_revision_id uuid, p_transaction_id uuid, p_conversation_id uuid, p_actor uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb; v_source text; v_listing uuid; v_listing_row public.listings%rowtype; v_refs jsonb;
  v_asset_ids uuid[]; v_asset_count integer; v_item_id uuid; v_name text; v_details text; v_quantity integer; v_client text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 10 then
    raise exception using errcode = '22023', message = 'TRADE_ITEMS_INVALID';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_source := v_item->>'source'; v_client := btrim(coalesce(v_item->>'clientId', ''));
    if char_length(v_client) not between 1 and 80 then raise exception using errcode = '22023', message = 'TRADE_ITEMS_INVALID'; end if;
    if v_source = 'listing' then
      begin v_listing := (v_item->>'listingId')::uuid; exception when others then raise exception using errcode = '22023', message = 'TRADE_ITEMS_INVALID'; end;
      select * into v_listing_row from public.listings where listing_id = v_listing and owner_id = p_actor and lifecycle = 'active' and hidden_at is null and availability = 'available' and fulfillment_kind = 'ready_stock';
      if not found or not exists (select 1 from public.listing_modes where listing_id = v_listing and mode = 'barter') then raise exception using errcode = 'P0001', message = 'TRADE_LISTING_NOT_AVAILABLE'; end if;
      select jsonb_agg(jsonb_build_object('assetId', photo.asset_id, 'bucket', 'listing-media', 'path', photo.path) order by photo.position)
      into v_refs from (
        select asset.position, asset.asset_id, v_listing_row.owner_id::text || '/' || asset.asset_id::text || '.webp' as path
        from public.listing_assets asset where asset.listing_id = v_listing order by asset.position limit 4
      ) photo;
      if v_refs is null then raise exception using errcode = 'P0001', message = 'TRADE_ITEM_PHOTO_REQUIRED'; end if;
      insert into public.transaction_items(revision_id, offered_by, listing_id, source_listing_version, client_key, name, details, quantity, asset_refs)
      values (p_revision_id, p_actor, v_listing, v_listing_row.version, v_client, v_listing_row.title, left(v_listing_row.description || case when btrim(v_listing_row.defects) = '' then '' else E'\nKekurangan: ' || v_listing_row.defects end, 1000), 1, v_refs);
    elsif v_source = 'direct' then
      v_name := btrim(coalesce(v_item->>'name', '')); v_details := btrim(coalesce(v_item->>'details', ''));
      begin v_quantity := (v_item->>'quantity')::integer; exception when others then raise exception using errcode = '22023', message = 'TRADE_ITEMS_INVALID'; end;
      if char_length(v_name) not between 2 and 120 or char_length(v_details) not between 2 and 1000 or v_quantity not between 1 and 999 or jsonb_typeof(v_item->'assetIds') <> 'array' or jsonb_array_length(v_item->'assetIds') not between 1 and 4 then
        raise exception using errcode = '22023', message = 'TRADE_ITEMS_INVALID';
      end if;
      begin select array_agg(requested.value::uuid order by requested.ordinality) into v_asset_ids from jsonb_array_elements_text(v_item->'assetIds') with ordinality as requested(value, ordinality); exception when others then raise exception using errcode = '22023', message = 'TRADE_ITEMS_INVALID'; end;
      if (select count(distinct asset_id) from unnest(v_asset_ids) as ids(asset_id)) <> array_length(v_asset_ids, 1) then raise exception using errcode = '22023', message = 'TRADE_ITEMS_INVALID'; end if;
      perform 1 from private.chat_assets where asset_id = any(v_asset_ids) order by asset_id for update;
      select count(*), jsonb_agg(jsonb_build_object('assetId', asset.asset_id, 'bucket', 'chat-media', 'path', asset.processed_path) order by requested.ordinality)
      into v_asset_count, v_refs
      from unnest(v_asset_ids) with ordinality requested(asset_id, ordinality)
      join private.chat_assets asset on asset.asset_id = requested.asset_id
      where asset.owner_id = p_actor and asset.conversation_id = p_conversation_id and asset.state = 'processed';
      if v_asset_count <> array_length(v_asset_ids, 1) then raise exception using errcode = 'P0001', message = 'TRADE_ASSET_NOT_READY'; end if;
      insert into public.transaction_items(revision_id, offered_by, client_key, name, details, quantity, asset_refs)
      values (p_revision_id, p_actor, v_client, v_name, v_details, v_quantity, v_refs) returning item_id into v_item_id;
      insert into private.trade_asset_bindings(asset_id, transaction_id, revision, item_id)
      select assets.asset_id, p_transaction_id, revision.revision, v_item_id from unnest(v_asset_ids) as assets(asset_id) cross join public.transaction_revisions revision where revision.revision_id = p_revision_id;
    else
      raise exception using errcode = '22023', message = 'TRADE_ITEMS_INVALID';
    end if;
  end loop;
end
$$;

create or replace function private.trade_dto(p_transaction_id uuid, p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tx public.transactions%rowtype; v_revision_id uuid; v_counterpart uuid; v_result jsonb;
begin
  select * into v_tx from public.transactions where transaction_id = p_transaction_id and p_actor in (party_a, party_b);
  if not found then return null; end if;
  v_counterpart := case when v_tx.party_a = p_actor then v_tx.party_b else v_tx.party_a end;
  select revision_id into strict v_revision_id from public.transaction_revisions where transaction_id = p_transaction_id and revision = v_tx.current_revision;
  select jsonb_build_object(
    'id', v_tx.transaction_id, 'conversationId', v_tx.conversation_id, 'lifecycle', v_tx.lifecycle,
    'revision', v_tx.current_revision, 'acceptedRevision', v_tx.accepted_revision, 'rowVersion', v_tx.row_version,
    'actor', jsonb_build_object('id', p_actor, 'name', actor_profile.display_name),
    'counterpart', jsonb_build_object('id', v_counterpart, 'name', counterpart_profile.display_name),
    'ownItems', coalesce((select jsonb_agg(jsonb_build_object('id', item_id, 'offeredBy', offered_by, 'source', case when listing_id is null then 'direct' else 'listing' end, 'listingId', listing_id, 'name', name, 'details', details, 'quantity', quantity, 'photos', asset_refs) order by created_at, item_id) from public.transaction_items where revision_id = v_revision_id and offered_by = p_actor), '[]'::jsonb),
    'counterpartItems', coalesce((select jsonb_agg(jsonb_build_object('id', item_id, 'offeredBy', offered_by, 'source', case when listing_id is null then 'direct' else 'listing' end, 'listingId', listing_id, 'name', name, 'details', details, 'quantity', quantity, 'photos', asset_refs) order by created_at, item_id) from public.transaction_items where revision_id = v_revision_id and offered_by = v_counterpart), '[]'::jsonb),
    'topup', (select case when revision.topup_amount_rupiah is null then null else jsonb_build_object('payerId', revision.topup_payer_id, 'payeeId', revision.topup_payee_id, 'amountRupiah', revision.topup_amount_rupiah::text, 'acknowledged', exists (select 1 from public.payment_obligations obligation where obligation.transaction_id = p_transaction_id and obligation.revision = revision.revision and obligation.kind = 'topup' and obligation.state = 'acknowledged')) end from public.transaction_revisions revision where revision.revision_id = v_revision_id),
    'readiness', jsonb_build_object('actor', exists (select 1 from public.transaction_consents where transaction_id = p_transaction_id and revision = v_tx.current_revision and user_id = p_actor and ready_at is not null), 'counterpart', exists (select 1 from public.transaction_consents where transaction_id = p_transaction_id and revision = v_tx.current_revision and user_id = v_counterpart and ready_at is not null)),
    'approvals', jsonb_build_object('actor', exists (select 1 from public.transaction_consents where transaction_id = p_transaction_id and revision = v_tx.current_revision and user_id = p_actor and approved_at is not null), 'counterpart', exists (select 1 from public.transaction_consents where transaction_id = p_transaction_id and revision = v_tx.current_revision and user_id = v_counterpart and approved_at is not null)),
    'receipts', jsonb_build_object('actorReceived', case when v_tx.party_a = p_actor then fulfillment.party_a_received_at is not null else fulfillment.party_b_received_at is not null end, 'counterpartReceived', case when v_tx.party_a = p_actor then fulfillment.party_b_received_at is not null else fulfillment.party_a_received_at is not null end),
    'cancellationReason', v_tx.cancellation_reason,
    'updatedAt', to_char(v_tx.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) into v_result
  from public.profiles actor_profile cross join public.profiles counterpart_profile
  left join public.fulfillments fulfillment on fulfillment.transaction_id = p_transaction_id
  where actor_profile.id = p_actor and counterpart_profile.id = v_counterpart;
  return v_result;
end
$$;

create or replace function private.create_trade_command(p_listing_id uuid, p_items jsonb, p_topup jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_owner uuid; v_conversation uuid; v_tx uuid := gen_random_uuid(); v_revision_id uuid := gen_random_uuid();
  v_payer uuid; v_payee uuid; v_amount bigint; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('listingId', p_listing_id, 'items', p_items, 'topup', p_topup);
  v_receipt := private.begin_command(v_actor, 'create_trade', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select owner_id into v_owner from public.listings where listing_id = p_listing_id and lifecycle = 'active' and hidden_at is null and availability = 'available' and fulfillment_kind = 'ready_stock' and exists (select 1 from public.listing_modes where listing_id = p_listing_id and mode = 'barter') for update;
  if v_owner is null then raise exception using errcode = 'P0001', message = 'TRADE_LISTING_NOT_AVAILABLE'; end if;
  if v_owner = v_actor then raise exception using errcode = '22023', message = 'OWN_LISTING_TRADE'; end if;
  if private.is_chat_blocked(v_actor, v_owner) then raise exception using errcode = 'P0001', message = 'CHAT_BLOCKED'; end if;
  select conversation_id into v_conversation from public.conversations where listing_id = p_listing_id and ((user_low = v_actor and user_high = v_owner) or (user_low = v_owner and user_high = v_actor));
  if v_conversation is null then v_conversation := (private.open_conversation_command(p_listing_id)->>'conversationId')::uuid; end if;
  if p_topup is not null then
    if jsonb_typeof(p_topup) <> 'object' or coalesce(p_topup->>'amountRupiah', '') !~ '^[1-9][0-9]{0,15}$' then raise exception using errcode = '22023', message = 'TRADE_TOPUP_INVALID'; end if;
    begin v_payer := (p_topup->>'payerId')::uuid; v_amount := (p_topup->>'amountRupiah')::bigint; exception when others then raise exception using errcode = '22023', message = 'TRADE_TOPUP_INVALID'; end;
    if v_payer not in (v_actor, v_owner) then raise exception using errcode = '22023', message = 'TRADE_TOPUP_INVALID'; end if;
    v_payee := case when v_payer = v_actor then v_owner else v_actor end;
  end if;
  insert into public.transactions(transaction_id, conversation_id, kind, party_a, party_b) values (v_tx, v_conversation, 'barter', v_owner, v_actor);
  insert into public.transaction_revisions(revision_id, transaction_id, revision, created_by, reason, topup_payer_id, topup_payee_id, topup_amount_rupiah)
  values (v_revision_id, v_tx, 1, v_actor, 'Penawaran awal', v_payer, v_payee, v_amount);
  perform private.materialize_trade_items(v_revision_id, v_tx, v_conversation, v_owner, jsonb_build_array(jsonb_build_object('clientId', 'target-listing', 'source', 'listing', 'listingId', p_listing_id)));
  perform private.materialize_trade_items(v_revision_id, v_tx, v_conversation, v_actor, p_items);
  insert into public.fulfillments(transaction_id) values (v_tx);
  perform private.record_trade_event(v_tx, v_actor, 'trade_created', 1, '{}'::jsonb, 'Tawaran barter dibuat.');
  v_result := private.trade_dto(v_tx, v_actor); perform private.finish_command(v_actor, 'create_trade', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.revise_trade_command(p_transaction_id uuid, p_expected_revision integer, p_items jsonb, p_topup jsonb, p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_tx public.transactions%rowtype; v_old_revision_id uuid; v_new_revision_id uuid := gen_random_uuid(); v_new_revision integer;
  v_counterpart uuid; v_payer uuid; v_payee uuid; v_amount bigint; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('transactionId', p_transaction_id, 'expectedRevision', p_expected_revision, 'items', p_items, 'topup', p_topup, 'reason', p_reason);
  v_receipt := private.begin_command(v_actor, 'revise_trade', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into v_tx from public.transactions where transaction_id = p_transaction_id for update;
  if not found or v_actor not in (v_tx.party_a, v_tx.party_b) then raise insufficient_privilege using message = 'TRADE_FORBIDDEN'; end if;
  if v_tx.lifecycle <> 'negotiating' then raise exception using errcode = 'P0001', message = 'AGREED_TRADE_AMENDMENT_UNAVAILABLE'; end if;
  if v_tx.current_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'REVISION_CONFLICT'; end if;
  v_counterpart := case when v_tx.party_a = v_actor then v_tx.party_b else v_tx.party_a end;
  if private.is_chat_blocked(v_actor, v_counterpart) then raise exception using errcode = 'P0001', message = 'CHAT_BLOCKED'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 2 and 300 then raise exception using errcode = '22023', message = 'TRADE_REASON_INVALID'; end if;
  if p_topup is not null then
    if jsonb_typeof(p_topup) <> 'object' or coalesce(p_topup->>'amountRupiah', '') !~ '^[1-9][0-9]{0,15}$' then raise exception using errcode = '22023', message = 'TRADE_TOPUP_INVALID'; end if;
    begin v_payer := (p_topup->>'payerId')::uuid; v_amount := (p_topup->>'amountRupiah')::bigint; exception when others then raise exception using errcode = '22023', message = 'TRADE_TOPUP_INVALID'; end;
    if v_payer not in (v_actor, v_counterpart) then raise exception using errcode = '22023', message = 'TRADE_TOPUP_INVALID'; end if;
    v_payee := case when v_payer = v_actor then v_counterpart else v_actor end;
  end if;
  v_new_revision := v_tx.current_revision + 1;
  select revision_id into strict v_old_revision_id from public.transaction_revisions where transaction_id = p_transaction_id and revision = v_tx.current_revision;
  insert into public.transaction_revisions(revision_id, transaction_id, revision, created_by, reason, topup_payer_id, topup_payee_id, topup_amount_rupiah, supersedes_revision)
  values (v_new_revision_id, p_transaction_id, v_new_revision, v_actor, btrim(p_reason), v_payer, v_payee, v_amount, v_tx.current_revision);
  insert into public.transaction_items(item_id, revision_id, offered_by, listing_id, source_listing_version, client_key, name, details, quantity, asset_refs)
  select gen_random_uuid(), v_new_revision_id, offered_by, listing_id, source_listing_version, 'copied-' || item_id::text, name, details, quantity, asset_refs
  from public.transaction_items where revision_id = v_old_revision_id and offered_by = v_counterpart;
  perform private.materialize_trade_items(v_new_revision_id, p_transaction_id, v_tx.conversation_id, v_actor, p_items);
  update public.transactions set current_revision = v_new_revision, row_version = row_version + 1, updated_at = statement_timestamp() where transaction_id = p_transaction_id;
  perform private.record_trade_event(p_transaction_id, v_actor, 'trade_revised', v_new_revision, jsonb_build_object('previousRevision', v_tx.current_revision), 'Tawaran barter diperbarui. Kesiapan dan persetujuan perlu diulang.');
  v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'revise_trade', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.mark_trade_ready_command(p_transaction_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_tx public.transactions%rowtype; v_revision_id uuid; v_counterpart uuid; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  perform private.assert_active_account(v_actor); v_payload := jsonb_build_object('transactionId', p_transaction_id, 'expectedRevision', p_expected_revision);
  v_receipt := private.begin_command(v_actor, 'mark_trade_ready', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into v_tx from public.transactions where transaction_id = p_transaction_id for update;
  if not found or v_actor not in (v_tx.party_a, v_tx.party_b) then raise insufficient_privilege using message = 'TRADE_FORBIDDEN'; end if;
  if v_tx.lifecycle <> 'negotiating' then raise exception using errcode = 'P0001', message = 'TRADE_NOT_NEGOTIATING'; end if;
  if v_tx.current_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'REVISION_CONFLICT'; end if;
  v_counterpart := case when v_tx.party_a = v_actor then v_tx.party_b else v_tx.party_a end;
  if private.is_chat_blocked(v_actor, v_counterpart) then raise exception using errcode = 'P0001', message = 'CHAT_BLOCKED'; end if;
  select revision_id into strict v_revision_id from public.transaction_revisions where transaction_id = p_transaction_id and revision = v_tx.current_revision;
  if not exists (select 1 from public.transaction_items where revision_id = v_revision_id and offered_by = v_actor) or not exists (select 1 from public.transaction_items where revision_id = v_revision_id and offered_by = v_counterpart) then raise exception using errcode = 'P0001', message = 'TRADE_PACKAGE_INCOMPLETE'; end if;
  if exists (select 1 from public.transaction_consents where transaction_id = p_transaction_id and revision = v_tx.current_revision and user_id = v_actor and ready_at is not null) then
    v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'mark_trade_ready', p_idempotency_key, v_payload, v_result); return v_result;
  end if;
  insert into public.transaction_consents(transaction_id, revision, user_id, ready_at) values (p_transaction_id, v_tx.current_revision, v_actor, statement_timestamp())
  on conflict (transaction_id, revision, user_id) do update set ready_at = coalesce(public.transaction_consents.ready_at, excluded.ready_at);
  update public.transactions set row_version = row_version + 1, updated_at = statement_timestamp() where transaction_id = p_transaction_id;
  perform private.record_trade_event(p_transaction_id, v_actor, 'trade_ready', v_tx.current_revision, '{}'::jsonb, 'Satu pihak siap meninjau kesepakatan.');
  v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'mark_trade_ready', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.approve_trade_command(p_transaction_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_tx public.transactions%rowtype; v_revision_id uuid; v_counterpart uuid; v_payload jsonb; v_receipt jsonb; v_result jsonb; v_listing_count integer;
  v_revision public.transaction_revisions%rowtype;
begin
  perform private.assert_active_account(v_actor); v_payload := jsonb_build_object('transactionId', p_transaction_id, 'expectedRevision', p_expected_revision);
  v_receipt := private.begin_command(v_actor, 'approve_trade', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into v_tx from public.transactions where transaction_id = p_transaction_id for update;
  if not found or v_actor not in (v_tx.party_a, v_tx.party_b) then raise insufficient_privilege using message = 'TRADE_FORBIDDEN'; end if;
  if v_tx.lifecycle <> 'negotiating' then raise exception using errcode = 'P0001', message = 'TRADE_NOT_NEGOTIATING'; end if;
  if v_tx.current_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'REVISION_CONFLICT'; end if;
  v_counterpart := case when v_tx.party_a = v_actor then v_tx.party_b else v_tx.party_a end;
  if private.is_chat_blocked(v_actor, v_counterpart) then raise exception using errcode = 'P0001', message = 'CHAT_BLOCKED'; end if;
  if (select count(*) from public.transaction_consents where transaction_id = p_transaction_id and revision = v_tx.current_revision and ready_at is not null) <> 2 then raise exception using errcode = 'P0001', message = 'BOTH_PARTIES_NOT_READY'; end if;
  if exists (select 1 from public.transaction_consents where transaction_id = p_transaction_id and revision = v_tx.current_revision and user_id = v_actor and approved_at is not null) then raise exception using errcode = 'P0001', message = 'TRADE_ALREADY_APPROVED'; end if;
  update public.transaction_consents set approved_at = statement_timestamp() where transaction_id = p_transaction_id and revision = v_tx.current_revision and user_id = v_actor;
  if (select count(*) from public.transaction_consents where transaction_id = p_transaction_id and revision = v_tx.current_revision and approved_at is not null) = 2 then
    select * into strict v_revision from public.transaction_revisions where transaction_id = p_transaction_id and revision = v_tx.current_revision;
    v_revision_id := v_revision.revision_id;
    perform 1 from public.listings listing where listing.listing_id in (select item.listing_id from public.transaction_items item where item.revision_id = v_revision_id and item.listing_id is not null) order by listing.listing_id for update;
    select count(*) into v_listing_count from public.transaction_items item join public.listings listing on listing.listing_id = item.listing_id where item.revision_id = v_revision_id and item.listing_id is not null and listing.lifecycle = 'active' and listing.hidden_at is null and listing.availability = 'available';
    if v_listing_count <> (select count(*) from public.transaction_items where revision_id = v_revision_id and listing_id is not null) then raise exception using errcode = 'P0001', message = 'TRADE_INVENTORY_CONFLICT'; end if;
    insert into public.inventory_pools(listing_id) select item.listing_id from public.transaction_items item where item.revision_id = v_revision_id and item.listing_id is not null on conflict (listing_id) do nothing;
    perform 1 from public.inventory_pools pool where pool.listing_id in (select item.listing_id from public.transaction_items item where item.revision_id = v_revision_id and item.listing_id is not null) order by pool.pool_id for update;
    if exists (select 1 from public.inventory_pools pool where pool.listing_id in (select item.listing_id from public.transaction_items item where item.revision_id = v_revision_id and item.listing_id is not null) and pool.held + pool.consumed >= pool.capacity) then raise exception using errcode = 'P0001', message = 'TRADE_INVENTORY_CONFLICT'; end if;
    insert into public.reservations(transaction_id, pool_id, is_exclusive, quantity, revision)
    select p_transaction_id, pool.pool_id, pool.is_exclusive, 1, v_tx.current_revision from public.inventory_pools pool where pool.listing_id in (select item.listing_id from public.transaction_items item where item.revision_id = v_revision_id and item.listing_id is not null);
    update public.inventory_pools pool set held = held + 1 where pool.listing_id in (select item.listing_id from public.transaction_items item where item.revision_id = v_revision_id and item.listing_id is not null);
    update public.listings listing set availability = 'reserved', updated_at = statement_timestamp() where listing.listing_id in (select item.listing_id from public.transaction_items item where item.revision_id = v_revision_id and item.listing_id is not null);
    if v_revision.topup_amount_rupiah is not null then insert into public.payment_obligations(transaction_id, revision, kind, payer_id, payee_id, amount_rupiah) values (p_transaction_id, v_tx.current_revision, 'topup', v_revision.topup_payer_id, v_revision.topup_payee_id, v_revision.topup_amount_rupiah); end if;
    update public.transactions set lifecycle = 'agreed', accepted_revision = v_tx.current_revision, agreed_at = statement_timestamp(), row_version = row_version + 1, updated_at = statement_timestamp() where transaction_id = p_transaction_id;
    perform private.record_trade_event(p_transaction_id, v_actor, 'trade_agreed', v_tx.current_revision, '{}'::jsonb, 'Barter disepakati. Atur pertemuan dan periksa barang sebelum serah terima.');
  else
    update public.transactions set row_version = row_version + 1, updated_at = statement_timestamp() where transaction_id = p_transaction_id;
    perform private.record_trade_event(p_transaction_id, v_actor, 'trade_approved', v_tx.current_revision, '{}'::jsonb, 'Satu pihak menyetujui barter.');
  end if;
  v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'approve_trade', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.complete_trade_if_eligible(p_transaction_id uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tx public.transactions%rowtype;
begin
  select * into v_tx from public.transactions where transaction_id = p_transaction_id for update;
  if v_tx.lifecycle <> 'agreed' or not exists (select 1 from public.fulfillments where transaction_id = p_transaction_id and party_a_received_at is not null and party_b_received_at is not null) or exists (select 1 from public.payment_obligations where transaction_id = p_transaction_id and state = 'due') then return; end if;
  update public.inventory_pools pool set held = held - reservation.quantity, consumed = consumed + reservation.quantity from public.reservations reservation where reservation.transaction_id = p_transaction_id and reservation.state = 'held' and reservation.pool_id = pool.pool_id;
  update public.reservations set state = 'consumed', consumed_at = statement_timestamp() where transaction_id = p_transaction_id and state = 'held';
  update public.listings listing set availability = 'completed', updated_at = statement_timestamp() where exists (select 1 from public.inventory_pools pool join public.reservations reservation on reservation.pool_id = pool.pool_id where reservation.transaction_id = p_transaction_id and pool.listing_id = listing.listing_id);
  update public.transactions set lifecycle = 'completed', completed_at = statement_timestamp(), row_version = row_version + 1, updated_at = statement_timestamp() where transaction_id = p_transaction_id;
  perform private.record_trade_event(p_transaction_id, p_actor, 'trade_completed', v_tx.accepted_revision, '{}'::jsonb, 'Barter selesai.');
end
$$;

create or replace function private.confirm_trade_received_command(p_transaction_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_tx public.transactions%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  v_payload := jsonb_build_object('transactionId', p_transaction_id, 'expectedRevision', p_expected_revision); v_receipt := private.begin_command(v_actor, 'confirm_trade_received', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into v_tx from public.transactions where transaction_id = p_transaction_id for update;
  if not found or v_actor not in (v_tx.party_a, v_tx.party_b) then raise insufficient_privilege using message = 'TRADE_FORBIDDEN'; end if;
  if v_tx.lifecycle <> 'agreed' or v_tx.accepted_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'TRADE_NOT_RECEIVABLE'; end if;
  if exists (select 1 from public.fulfillments where transaction_id = p_transaction_id and (case when v_actor = v_tx.party_a then party_a_received_at else party_b_received_at end) is not null) then
    v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'confirm_trade_received', p_idempotency_key, v_payload, v_result); return v_result;
  end if;
  update public.fulfillments set party_a_received_at = case when v_actor = v_tx.party_a then coalesce(party_a_received_at, statement_timestamp()) else party_a_received_at end, party_b_received_at = case when v_actor = v_tx.party_b then coalesce(party_b_received_at, statement_timestamp()) else party_b_received_at end, first_received_at = coalesce(first_received_at, statement_timestamp()), updated_at = statement_timestamp() where transaction_id = p_transaction_id;
  update public.transactions set row_version = row_version + 1, updated_at = statement_timestamp() where transaction_id = p_transaction_id;
  perform private.record_trade_event(p_transaction_id, v_actor, 'trade_item_received', p_expected_revision, '{}'::jsonb, 'Satu pihak telah memeriksa dan menerima barang.'); perform private.complete_trade_if_eligible(p_transaction_id, v_actor);
  v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'confirm_trade_received', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.acknowledge_trade_topup_command(p_transaction_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_tx public.transactions%rowtype; v_obligation public.payment_obligations%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  v_payload := jsonb_build_object('transactionId', p_transaction_id, 'expectedRevision', p_expected_revision); v_receipt := private.begin_command(v_actor, 'acknowledge_trade_topup', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into v_tx from public.transactions where transaction_id = p_transaction_id for update;
  if not found or v_actor not in (v_tx.party_a, v_tx.party_b) then raise insufficient_privilege using message = 'TRADE_FORBIDDEN'; end if;
  if v_tx.lifecycle <> 'agreed' or v_tx.accepted_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'TRADE_TOPUP_NOT_ACKNOWLEDGEABLE'; end if;
  select * into v_obligation from public.payment_obligations where transaction_id = p_transaction_id and revision = p_expected_revision and kind = 'topup' for update;
  if not found or v_obligation.payee_id <> v_actor then raise insufficient_privilege using message = 'TOPUP_PAYEE_REQUIRED'; end if;
  if v_obligation.state = 'acknowledged' then
    v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'acknowledge_trade_topup', p_idempotency_key, v_payload, v_result); return v_result;
  end if;
  if v_obligation.state = 'due' then insert into public.payment_acknowledgements(obligation_id, recorded_by, amount_rupiah) values (v_obligation.obligation_id, v_actor, v_obligation.amount_rupiah); update public.payment_obligations set state = 'acknowledged' where obligation_id = v_obligation.obligation_id; end if;
  update public.transactions set row_version = row_version + 1, updated_at = statement_timestamp() where transaction_id = p_transaction_id;
  perform private.record_trade_event(p_transaction_id, v_actor, 'trade_topup_received', p_expected_revision, jsonb_build_object('amountRupiah', v_obligation.amount_rupiah::text), 'Penerima mengonfirmasi uang tambahan telah diterima.'); perform private.complete_trade_if_eligible(p_transaction_id, v_actor);
  v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'acknowledge_trade_topup', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.cancel_trade_command(p_transaction_id uuid, p_expected_revision integer, p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_tx public.transactions%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  v_payload := jsonb_build_object('transactionId', p_transaction_id, 'expectedRevision', p_expected_revision, 'reason', p_reason); v_receipt := private.begin_command(v_actor, 'cancel_trade', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into v_tx from public.transactions where transaction_id = p_transaction_id for update;
  if not found or v_actor not in (v_tx.party_a, v_tx.party_b) then raise insufficient_privilege using message = 'TRADE_FORBIDDEN'; end if;
  if v_tx.lifecycle not in ('negotiating', 'agreed') or v_tx.current_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'REVISION_CONFLICT'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then raise exception using errcode = '22023', message = 'CANCELLATION_REASON_INVALID'; end if;
  if exists (select 1 from public.fulfillments where transaction_id = p_transaction_id and (party_a_received_at is not null or party_b_received_at is not null)) then raise exception using errcode = 'P0001', message = 'DISPUTE_REQUIRED'; end if;
  update public.inventory_pools pool set held = held - reservation.quantity from public.reservations reservation where reservation.transaction_id = p_transaction_id and reservation.state = 'held' and reservation.pool_id = pool.pool_id;
  update public.listings listing set availability = 'available', updated_at = statement_timestamp() where exists (select 1 from public.inventory_pools pool join public.reservations reservation on reservation.pool_id = pool.pool_id where reservation.transaction_id = p_transaction_id and reservation.state = 'held' and pool.listing_id = listing.listing_id);
  update public.reservations set state = 'released', released_at = statement_timestamp() where transaction_id = p_transaction_id and state = 'held';
  update public.payment_obligations set state = 'cancelled' where transaction_id = p_transaction_id and state = 'due';
  update public.transactions set lifecycle = 'cancelled', cancellation_reason = btrim(p_reason), cancelled_at = statement_timestamp(), row_version = row_version + 1, updated_at = statement_timestamp() where transaction_id = p_transaction_id;
  perform private.record_trade_event(p_transaction_id, v_actor, 'trade_cancelled', p_expected_revision, '{}'::jsonb, 'Barter dibatalkan dengan alasan tercatat.');
  v_result := private.trade_dto(p_transaction_id, v_actor); perform private.finish_command(v_actor, 'cancel_trade', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.chat_asset_read_allowed(p_actor uuid, p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.chat_assets asset
    where asset.processed_path = p_path and asset.state = 'processed' and (
      (asset.message_id is not null and private.is_conversation_member(asset.conversation_id, p_actor))
      or exists (select 1 from private.trade_asset_bindings binding where binding.asset_id = asset.asset_id and private.is_trade_participant(binding.transaction_id, p_actor))
    )
  )
$$;

create or replace function public.get_trade(p_transaction_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.trade_dto(p_transaction_id, auth.uid()) $$;
create or replace function public.create_trade(p_listing_id uuid, p_items jsonb, p_topup jsonb default null, p_idempotency_key uuid default null)
returns jsonb language sql security invoker set search_path = '' as $$ select private.create_trade_command(p_listing_id, p_items, p_topup, p_idempotency_key) $$;
create or replace function public.revise_trade(p_transaction_id uuid, p_expected_revision integer, p_items jsonb, p_topup jsonb, p_reason text, p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.revise_trade_command(p_transaction_id, p_expected_revision, p_items, p_topup, p_reason, p_idempotency_key) $$;
create or replace function public.mark_trade_ready(p_transaction_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.mark_trade_ready_command(p_transaction_id, p_expected_revision, p_idempotency_key) $$;
create or replace function public.approve_trade(p_transaction_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.approve_trade_command(p_transaction_id, p_expected_revision, p_idempotency_key) $$;
create or replace function public.confirm_trade_received(p_transaction_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.confirm_trade_received_command(p_transaction_id, p_expected_revision, p_idempotency_key) $$;
create or replace function public.acknowledge_trade_topup(p_transaction_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.acknowledge_trade_topup_command(p_transaction_id, p_expected_revision, p_idempotency_key) $$;
create or replace function public.cancel_trade(p_transaction_id uuid, p_expected_revision integer, p_reason text, p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.cancel_trade_command(p_transaction_id, p_expected_revision, p_reason, p_idempotency_key) $$;

revoke all on function private.is_trade_participant(uuid, uuid), private.begin_command(uuid, text, uuid, jsonb), private.finish_command(uuid, text, uuid, jsonb, jsonb), private.append_transaction_message(uuid, uuid, text, text), private.record_trade_event(uuid, uuid, text, integer, jsonb, text), private.materialize_trade_items(uuid, uuid, uuid, uuid, jsonb), private.trade_dto(uuid, uuid), private.create_trade_command(uuid, jsonb, jsonb, uuid), private.revise_trade_command(uuid, integer, jsonb, jsonb, text, uuid), private.mark_trade_ready_command(uuid, integer, uuid), private.approve_trade_command(uuid, integer, uuid), private.complete_trade_if_eligible(uuid, uuid), private.confirm_trade_received_command(uuid, integer, uuid), private.acknowledge_trade_topup_command(uuid, integer, uuid), private.cancel_trade_command(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.get_trade(uuid), public.create_trade(uuid, jsonb, jsonb, uuid), public.revise_trade(uuid, integer, jsonb, jsonb, text, uuid), public.mark_trade_ready(uuid, integer, uuid), public.approve_trade(uuid, integer, uuid), public.confirm_trade_received(uuid, integer, uuid), public.acknowledge_trade_topup(uuid, integer, uuid), public.cancel_trade(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function private.is_trade_participant(uuid, uuid), private.trade_dto(uuid, uuid), private.create_trade_command(uuid, jsonb, jsonb, uuid), private.revise_trade_command(uuid, integer, jsonb, jsonb, text, uuid), private.mark_trade_ready_command(uuid, integer, uuid), private.approve_trade_command(uuid, integer, uuid), private.confirm_trade_received_command(uuid, integer, uuid), private.acknowledge_trade_topup_command(uuid, integer, uuid), private.cancel_trade_command(uuid, integer, text, uuid) to authenticated;
grant execute on function public.get_trade(uuid), public.create_trade(uuid, jsonb, jsonb, uuid), public.revise_trade(uuid, integer, jsonb, jsonb, text, uuid), public.mark_trade_ready(uuid, integer, uuid), public.approve_trade(uuid, integer, uuid), public.confirm_trade_received(uuid, integer, uuid), public.acknowledge_trade_topup(uuid, integer, uuid), public.cancel_trade(uuid, integer, text, uuid) to authenticated;

do $$ begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') and not exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transaction_events') then alter publication supabase_realtime add table public.transaction_events; end if;
end $$;
