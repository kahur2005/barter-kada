create table public.orders (
  order_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(conversation_id) on delete restrict,
  listing_id uuid not null references public.listings(listing_id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  kind text not null,
  lifecycle text not null default 'quoted',
  current_revision integer not null default 1,
  accepted_revision integer,
  row_version integer not null default 1,
  event_seq bigint not null default 0,
  cancellation_reason text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint orders_parties_distinct check (buyer_id <> seller_id),
  constraint orders_kind check (kind in ('sale', 'free')),
  constraint orders_lifecycle check (lifecycle in ('quoted', 'confirmed', 'awaiting_dp', 'processing', 'ready', 'awaiting_receipt', 'completed', 'cancelled')),
  constraint orders_revision_positive check (current_revision > 0 and (accepted_revision is null or accepted_revision > 0))
);
create index orders_buyer_recent_idx on public.orders(buyer_id, updated_at desc);
create index orders_seller_recent_idx on public.orders(seller_id, updated_at desc);

create table public.order_revisions (
  revision_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  revision integer not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  handover_method text not null,
  handover_note text not null default '',
  shipping_amount_rupiah bigint not null default 0,
  dp_percent smallint not null default 0,
  dp_amount_rupiah bigint not null default 0,
  subtotal_rupiah bigint not null,
  total_rupiah bigint not null,
  dp_deadline timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint order_revisions_unique unique (order_id, revision),
  constraint order_revisions_handover check (handover_method in ('pickup', 'meetup', 'delivery')),
  constraint order_revisions_amounts check (shipping_amount_rupiah >= 0 and subtotal_rupiah >= 0 and total_rupiah = subtotal_rupiah + shipping_amount_rupiah and dp_percent between 0 and 100 and dp_amount_rupiah >= 0 and dp_amount_rupiah <= total_rupiah),
  constraint order_revisions_deadline check (dp_deadline is null or dp_deadline > created_at)
);

create table public.order_items (
  order_item_id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.order_revisions(revision_id) on delete restrict,
  listing_id uuid not null references public.listings(listing_id) on delete restrict,
  variant_id uuid references public.listing_variants(variant_id) on delete restrict,
  name text not null,
  unit text not null,
  quantity integer not null,
  unit_price_rupiah bigint not null,
  line_total_rupiah bigint not null,
  constraint order_items_name check (char_length(name) between 1 and 120),
  constraint order_items_unit check (char_length(unit) between 1 and 30),
  constraint order_items_quantity check (quantity > 0 and quantity <= 100000),
  constraint order_items_price check (unit_price_rupiah >= 0 and line_total_rupiah = unit_price_rupiah * quantity)
);
create index order_items_revision_idx on public.order_items(revision_id);

create table public.order_inventory_pools (
  pool_id uuid primary key default gen_random_uuid(),
  identity_key text not null unique,
  listing_id uuid not null references public.listings(listing_id) on delete restrict,
  batch_id uuid references public.preorder_batches(batch_id) on delete restrict,
  variant_id uuid references public.listing_variants(variant_id) on delete restrict,
  capacity integer not null,
  held integer not null default 0,
  consumed integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  constraint order_inventory_pool_capacity check (capacity > 0 and held >= 0 and consumed >= 0 and held + consumed <= capacity)
);
create table public.order_reservations (
  reservation_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  pool_id uuid not null references public.order_inventory_pools(pool_id) on delete restrict,
  quantity integer not null,
  state text not null default 'held',
  created_at timestamptz not null default statement_timestamp(),
  released_at timestamptz,
  consumed_at timestamptz,
  constraint order_reservations_quantity check (quantity > 0),
  constraint order_reservations_state check (state in ('held', 'released', 'consumed'))
);
create unique index order_reservations_active_pool_uidx on public.order_reservations(order_id, pool_id) where state = 'held';

create table public.order_payment_obligations (
  obligation_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  revision integer not null,
  kind text not null,
  payer_id uuid not null references auth.users(id) on delete restrict,
  payee_id uuid not null references auth.users(id) on delete restrict,
  amount_rupiah bigint not null,
  state text not null default 'due',
  due_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint order_payment_kind check (kind in ('dp', 'balance', 'shipping')),
  constraint order_payment_parties check (payer_id <> payee_id),
  constraint order_payment_amount check (amount_rupiah > 0),
  constraint order_payment_state check (state in ('due', 'acknowledged', 'cancelled')),
  constraint order_payment_unique unique (order_id, revision, kind)
);

create table public.order_fulfillments (
  order_id uuid primary key references public.orders(order_id) on delete restrict,
  seller_processing_at timestamptz,
  seller_ready_at timestamptz,
  seller_handed_at timestamptz,
  buyer_received_at timestamptz,
  updated_at timestamptz not null default statement_timestamp()
);
create table public.order_events (
  event_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  seq bigint not null,
  actor_id uuid references auth.users(id) on delete restrict,
  type text not null,
  revision integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint order_events_unique unique (order_id, seq)
);
create index order_events_recent_idx on public.order_events(order_id, seq desc);

create table private.order_command_receipts (
  actor_id uuid not null references auth.users(id) on delete cascade,
  command text not null,
  idempotency_key uuid not null,
  request_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (actor_id, command, idempotency_key),
  constraint order_command_receipts_hash check (request_hash ~ '^[a-f0-9]{64}$')
);

alter table public.orders enable row level security;
alter table public.order_revisions enable row level security;
alter table public.order_items enable row level security;
alter table public.order_inventory_pools enable row level security;
alter table public.order_reservations enable row level security;
alter table public.order_payment_obligations enable row level security;
alter table public.order_fulfillments enable row level security;
alter table public.order_events enable row level security;
alter table private.order_command_receipts enable row level security;

create or replace function private.is_order_participant(p_order_id uuid, p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders where order_id = p_order_id and p_actor in (buyer_id, seller_id))
$$;
create policy orders_participant_read on public.orders for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));
create policy order_revisions_participant_read on public.order_revisions for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));
create policy order_items_participant_read on public.order_items for select to authenticated using (exists (select 1 from public.order_revisions revision where revision.revision_id = order_items.revision_id and private.is_order_participant(revision.order_id, (select auth.uid()))));
create policy order_reservations_participant_read on public.order_reservations for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));
create policy order_payment_participant_read on public.order_payment_obligations for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));
create policy order_fulfillment_participant_read on public.order_fulfillments for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));
create policy order_events_participant_read on public.order_events for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));

revoke all on public.orders, public.order_revisions, public.order_items, public.order_inventory_pools, public.order_reservations, public.order_payment_obligations, public.order_fulfillments, public.order_events from public, anon, authenticated;
grant select on public.orders, public.order_revisions, public.order_items, public.order_reservations, public.order_payment_obligations, public.order_fulfillments, public.order_events to authenticated;
revoke all on private.order_command_receipts from public, anon, authenticated;

create or replace function private.order_begin_command(p_actor uuid, p_command text, p_key uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hash text; v_existing private.order_command_receipts%rowtype;
begin
  if p_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_key is null then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  v_hash := encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text || ':' || p_command || ':' || p_key::text, 0));
  select * into v_existing from private.order_command_receipts where actor_id = p_actor and command = p_command and idempotency_key = p_key;
  if found then
    if v_existing.request_hash <> v_hash then raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return v_existing.result;
  end if;
  return null;
end
$$;
create or replace function private.order_finish_command(p_actor uuid, p_command text, p_key uuid, p_payload jsonb, p_result jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into private.order_command_receipts(actor_id, command, idempotency_key, request_hash, result) values (p_actor, p_command, p_key, encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex'), p_result);
end
$$;

create or replace function private.order_dto(p_order_id uuid, p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_revision_id uuid; v_revision public.order_revisions%rowtype; v_result jsonb;
begin
  select * into v_order from public.orders where order_id = p_order_id and p_actor in (buyer_id, seller_id);
  if not found then return null; end if;
  select * into strict v_revision from public.order_revisions where order_id = p_order_id and revision = v_order.current_revision;
  select jsonb_build_object(
    'id', v_order.order_id, 'conversationId', v_order.conversation_id, 'listingId', v_order.listing_id, 'kind', v_order.kind,
    'lifecycle', v_order.lifecycle, 'revision', v_order.current_revision, 'acceptedRevision', v_order.accepted_revision,
    'actorRole', case when p_actor = v_order.buyer_id then 'buyer' else 'seller' end,
    'buyer', jsonb_build_object('id', v_order.buyer_id, 'name', buyer_profile.display_name),
    'seller', jsonb_build_object('id', v_order.seller_id, 'name', seller_profile.display_name),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', item.order_item_id, 'listingId', item.listing_id, 'variantId', item.variant_id, 'name', item.name, 'unit', item.unit, 'quantity', item.quantity, 'unitPriceRupiah', item.unit_price_rupiah::text, 'lineTotalRupiah', item.line_total_rupiah::text) order by item.order_item_id) from public.order_items item where item.revision_id = v_revision.revision_id), '[]'::jsonb),
    'terms', jsonb_build_object('handoverMethod', v_revision.handover_method, 'handoverNote', v_revision.handover_note, 'shippingAmountRupiah', v_revision.shipping_amount_rupiah::text, 'subtotalRupiah', v_revision.subtotal_rupiah::text, 'totalRupiah', v_revision.total_rupiah::text, 'dpPercent', v_revision.dp_percent, 'dpAmountRupiah', v_revision.dp_amount_rupiah::text, 'dpDeadline', v_revision.dp_deadline),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('kind', obligation.kind, 'amountRupiah', obligation.amount_rupiah::text, 'state', obligation.state, 'dueAt', obligation.due_at) order by obligation.kind) from public.order_payment_obligations obligation where obligation.order_id = p_order_id and obligation.revision = v_order.accepted_revision), '[]'::jsonb),
    'fulfillment', jsonb_build_object('processingAt', fulfillment.seller_processing_at, 'readyAt', fulfillment.seller_ready_at, 'handedAt', fulfillment.seller_handed_at, 'receivedAt', fulfillment.buyer_received_at),
    'cancellationReason', v_order.cancellation_reason, 'updatedAt', to_char(v_order.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) into v_result
  from public.profiles buyer_profile cross join public.profiles seller_profile left join public.order_fulfillments fulfillment on fulfillment.order_id = p_order_id
  where buyer_profile.id = v_order.buyer_id and seller_profile.id = v_order.seller_id;
  return v_result;
end
$$;

create or replace function private.order_record_event(p_order_id uuid, p_actor uuid, p_type text, p_revision integer, p_metadata jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_seq bigint;
begin
  update public.orders set event_seq = event_seq + 1, updated_at = statement_timestamp() where order_id = p_order_id returning event_seq into strict v_seq;
  insert into public.order_events(order_id, seq, actor_id, type, revision, metadata) values (p_order_id, v_seq, p_actor, p_type, p_revision, coalesce(p_metadata, '{}'::jsonb));
end
$$;

create or replace function private.order_materialize_items(p_revision_id uuid, p_listing_id uuid, p_kind text, p_items jsonb, out p_subtotal bigint)
language plpgsql security definer set search_path = '' as $$
declare v_item jsonb; v_variant uuid; v_quantity integer; v_name text; v_unit text; v_price bigint; v_line bigint; v_count integer := 0;
begin
  p_subtotal := 0;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception using errcode = '22023', message = 'ORDER_ITEMS_INVALID'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_count := v_count + 1;
    begin v_quantity := (v_item->>'quantity')::integer; exception when others then raise exception using errcode = '22023', message = 'ORDER_ITEMS_INVALID'; end;
    if v_quantity not between 1 and 100000 then raise exception using errcode = '22023', message = 'ORDER_ITEMS_INVALID'; end if;
    if nullif(v_item->>'variantId', '') is not null then
      begin v_variant := (v_item->>'variantId')::uuid; exception when others then raise exception using errcode = '22023', message = 'ORDER_ITEMS_INVALID'; end;
      select label, unit, price_rupiah::bigint into v_name, v_unit, v_price from public.listing_variants where variant_id = v_variant and listing_id = p_listing_id and active;
      if not found then raise exception using errcode = 'P0001', message = 'ORDER_VARIANT_NOT_AVAILABLE'; end if;
    else
      select title, 'unit', case when p_kind = 'free' then 0 else base_price_rupiah::bigint end into v_name, v_unit, v_price from public.listings where listing_id = p_listing_id;
      if v_price is null then raise exception using errcode = 'P0001', message = 'ORDER_PRICE_NOT_AVAILABLE'; end if;
    end if;
    v_line := v_price * v_quantity;
    insert into public.order_items(revision_id, listing_id, variant_id, name, unit, quantity, unit_price_rupiah, line_total_rupiah) values (p_revision_id, p_listing_id, v_variant, v_name, v_unit, v_quantity, v_price, v_line);
    p_subtotal := p_subtotal + v_line;
  end loop;
  return;
end
$$;

create or replace function private.create_order_quote_command(p_conversation_id uuid, p_items jsonb, p_handover_method text, p_handover_note text, p_shipping_amount text, p_dp_percent integer, p_dp_deadline timestamptz, p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_conversation public.conversations%rowtype; v_listing public.listings%rowtype; v_buyer uuid; v_order uuid := gen_random_uuid(); v_revision uuid := gen_random_uuid(); v_subtotal bigint; v_shipping bigint; v_total bigint; v_dp bigint; v_kind text; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('conversationId', p_conversation_id, 'items', p_items, 'handoverMethod', p_handover_method, 'handoverNote', p_handover_note, 'shippingAmount', p_shipping_amount, 'dpPercent', p_dp_percent, 'dpDeadline', p_dp_deadline, 'reason', p_reason);
  v_receipt := private.order_begin_command(v_actor, 'create_order_quote', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_conversation from public.conversations where conversation_id = p_conversation_id and (user_low = v_actor or user_high = v_actor);
  select * into strict v_listing from public.listings where listing_id = v_conversation.listing_id and owner_id = v_actor and lifecycle = 'active' and hidden_at is null and availability = 'available';
  v_buyer := case when v_conversation.user_low = v_actor then v_conversation.user_high else v_conversation.user_low end;
  if not exists (select 1 from public.listing_modes where listing_id = v_listing.listing_id and mode in ('sale', 'free')) then raise exception using errcode = 'P0001', message = 'ORDER_MODE_NOT_AVAILABLE'; end if;
  if exists (select 1 from public.listing_modes where listing_id = v_listing.listing_id and mode = 'free') then v_kind := 'free'; elsif exists (select 1 from public.listing_modes where listing_id = v_listing.listing_id and mode = 'sale') then v_kind := 'sale'; else raise exception using errcode = 'P0001', message = 'ORDER_MODE_NOT_AVAILABLE'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 2 and 300 then raise exception using errcode = '22023', message = 'ORDER_REASON_INVALID'; end if;
  if p_handover_method not in ('pickup', 'meetup', 'delivery') then raise exception using errcode = '22023', message = 'ORDER_HANDOVER_INVALID'; end if;
  if coalesce(p_dp_percent, 0) not between 0 and 100 or v_kind = 'free' and p_dp_percent <> 0 then raise exception using errcode = '22023', message = 'ORDER_DP_INVALID'; end if;
  begin v_shipping := coalesce(nullif(p_shipping_amount, ''), '0')::bigint; exception when others then raise exception using errcode = '22023', message = 'ORDER_SHIPPING_INVALID'; end;
  if v_shipping < 0 then raise exception using errcode = '22023', message = 'ORDER_SHIPPING_INVALID'; end if;
  insert into public.orders(order_id, conversation_id, listing_id, buyer_id, seller_id, kind) values (v_order, p_conversation_id, v_listing.listing_id, v_buyer, v_actor, v_kind);
  insert into public.order_revisions(revision_id, order_id, revision, created_by, reason, handover_method, handover_note, shipping_amount_rupiah, dp_percent, subtotal_rupiah, total_rupiah, dp_deadline)
  values (v_revision, v_order, 1, v_actor, btrim(p_reason), p_handover_method, left(btrim(coalesce(p_handover_note, '')), 500), v_shipping, p_dp_percent, 0, 0, p_dp_deadline);
  v_subtotal := private.order_materialize_items(v_revision, v_listing.listing_id, v_kind, p_items);
  v_total := v_subtotal + v_shipping; v_dp := ceil(v_total * p_dp_percent / 100.0);
  update public.order_revisions set subtotal_rupiah = v_subtotal, total_rupiah = v_total, dp_amount_rupiah = v_dp where revision_id = v_revision;
  insert into public.order_fulfillments(order_id) values (v_order);
  perform private.order_record_event(v_order, v_actor, 'order_quoted', 1, jsonb_build_object('totalRupiah', v_total::text));
  v_result := private.order_dto(v_order, v_actor); perform private.order_finish_command(v_actor, 'create_order_quote', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.order_pool_for_item(p_order_id uuid, p_item public.order_items, p_batch public.preorder_batches, out p_pool_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_key text; v_capacity integer; v_pool public.order_inventory_pools%rowtype; v_variant_quota integer;
begin
  if p_batch.batch_id is not null then
    if p_batch.quota_mode = 'shared' then v_key := p_item.listing_id::text || ':batch:' || p_batch.batch_id::text; v_capacity := p_batch.shared_quota;
    elsif p_batch.quota_mode = 'per_variant' then v_key := p_item.listing_id::text || ':batch:' || p_batch.batch_id::text || ':variant:' || coalesce(p_item.variant_id::text, 'base'); select quota into v_variant_quota from public.listing_variants where variant_id = p_item.variant_id; v_capacity := v_variant_quota; else v_key := p_item.listing_id::text || ':batch:' || p_batch.batch_id::text || ':unlimited'; v_capacity := 100000000; end if;
  else
    v_key := p_item.listing_id::text || ':ready:' || coalesce(p_item.variant_id::text, 'base'); v_capacity := 1;
  end if;
  if v_capacity is null or v_capacity < p_item.quantity then raise exception using errcode = 'P0001', message = 'ORDER_QUOTA_NOT_AVAILABLE'; end if;
  insert into public.order_inventory_pools(identity_key, listing_id, batch_id, variant_id, capacity) values (v_key, p_item.listing_id, p_batch.batch_id, p_item.variant_id, v_capacity) on conflict (identity_key) do nothing;
  select * into strict v_pool from public.order_inventory_pools where identity_key = v_key for update;
  p_pool_id := v_pool.pool_id;
  if v_pool.held + v_pool.consumed + p_item.quantity > v_pool.capacity then raise exception using errcode = 'P0001', message = 'ORDER_QUOTA_NOT_AVAILABLE'; end if;
end
$$;

create or replace function private.confirm_order_command(p_order_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.orders%rowtype; v_revision public.order_revisions%rowtype; v_item public.order_items%rowtype; v_batch public.preorder_batches%rowtype; v_pool uuid; v_payload jsonb; v_receipt jsonb; v_result jsonb; v_qty integer;
begin
  perform private.assert_active_account(v_actor); v_payload := jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision); v_receipt := private.order_begin_command(v_actor, 'confirm_order', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_order from public.orders where order_id = p_order_id for update;
  if v_order.buyer_id <> v_actor then raise insufficient_privilege using message = 'ORDER_BUYER_REQUIRED'; end if;
  if v_order.lifecycle <> 'quoted' or v_order.current_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'ORDER_REVISION_CONFLICT'; end if;
  select * into strict v_revision from public.order_revisions where order_id = p_order_id and revision = p_expected_revision;
  select * into v_batch from public.preorder_batches where listing_id = v_order.listing_id and state = 'open' order by created_at desc limit 1 for update;
  if v_batch.batch_id is not null then
    if statement_timestamp() >= v_batch.order_closes_at then raise exception using errcode = 'P0001', message = 'ORDER_WINDOW_CLOSED'; end if;
    select coalesce(sum(quantity), 0) into v_qty from public.order_items where revision_id = v_revision.revision_id;
    if v_qty < v_batch.minimum_qty then raise exception using errcode = 'P0001', message = 'ORDER_MINIMUM_NOT_MET'; end if;
  end if;
  for v_item in select * from public.order_items where revision_id = v_revision.revision_id order by order_item_id loop
    v_pool := private.order_pool_for_item(p_order_id, v_item, v_batch);
    insert into public.order_reservations(order_id, pool_id, quantity) values (p_order_id, v_pool, v_item.quantity);
    update public.order_inventory_pools set held = held + v_item.quantity where pool_id = v_pool;
  end loop;
  if v_revision.dp_amount_rupiah > 0 then
    insert into public.order_payment_obligations(order_id, revision, kind, payer_id, payee_id, amount_rupiah, due_at) values (p_order_id, p_expected_revision, 'dp', v_order.buyer_id, v_order.seller_id, v_revision.dp_amount_rupiah, v_revision.dp_deadline);
    if v_revision.total_rupiah - v_revision.dp_amount_rupiah > 0 then insert into public.order_payment_obligations(order_id, revision, kind, payer_id, payee_id, amount_rupiah) values (p_order_id, p_expected_revision, 'balance', v_order.buyer_id, v_order.seller_id, v_revision.total_rupiah - v_revision.dp_amount_rupiah); end if;
    update public.orders set lifecycle = 'awaiting_dp', accepted_revision = p_expected_revision, updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = p_order_id;
  else
    if v_revision.total_rupiah > 0 then insert into public.order_payment_obligations(order_id, revision, kind, payer_id, payee_id, amount_rupiah) values (p_order_id, p_expected_revision, 'balance', v_order.buyer_id, v_order.seller_id, v_revision.total_rupiah); end if;
    update public.orders set lifecycle = 'confirmed', accepted_revision = p_expected_revision, updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = p_order_id;
  end if;
  perform private.order_record_event(p_order_id, v_actor, 'order_confirmed', p_expected_revision, '{}'::jsonb);
  v_result := private.order_dto(p_order_id, v_actor); perform private.order_finish_command(v_actor, 'confirm_order', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.order_ack_payment_command(p_order_id uuid, p_expected_revision integer, p_kind text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.orders%rowtype; v_obligation public.order_payment_obligations%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  v_payload := jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision, 'kind', p_kind); v_receipt := private.order_begin_command(v_actor, 'ack_payment', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_order from public.orders where order_id = p_order_id for update;
  select * into v_obligation from public.order_payment_obligations where order_id = p_order_id and revision = p_expected_revision and kind = p_kind for update;
  if not found or v_obligation.payee_id <> v_actor then raise insufficient_privilege using message = 'ORDER_PAYEE_REQUIRED'; end if;
  if v_obligation.state = 'acknowledged' then v_result := private.order_dto(p_order_id, v_actor); perform private.order_finish_command(v_actor, 'ack_payment', p_idempotency_key, v_payload, v_result); return v_result; end if;
  update public.order_payment_obligations set state = 'acknowledged' where obligation_id = v_obligation.obligation_id;
  if exists (select 1 from public.order_fulfillments where order_id = p_order_id and buyer_received_at is not null)
     and not exists (select 1 from public.order_payment_obligations where order_id = p_order_id and state = 'due') then
    update public.order_inventory_pools pool set held = held - reservation.quantity, consumed = consumed + reservation.quantity from public.order_reservations reservation where reservation.order_id = p_order_id and reservation.state = 'held' and reservation.pool_id = pool.pool_id;
    update public.order_reservations set state = 'consumed', consumed_at = statement_timestamp() where order_id = p_order_id and state = 'held';
    update public.orders set lifecycle = 'completed', updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = p_order_id;
  end if;
  update public.orders set updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = p_order_id;
  perform private.order_record_event(p_order_id, v_actor, 'payment_acknowledged', p_expected_revision, jsonb_build_object('kind', p_kind));
  v_result := private.order_dto(p_order_id, v_actor); perform private.order_finish_command(v_actor, 'ack_payment', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.order_lifecycle_command(p_order_id uuid, p_expected_revision integer, p_action text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.orders%rowtype; v_fulfillment public.order_fulfillments%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb; v_next text;
begin
  v_payload := jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision, 'action', p_action); v_receipt := private.order_begin_command(v_actor, p_action, p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_order from public.orders where order_id = p_order_id for update;
  if v_order.seller_id <> v_actor then raise insufficient_privilege using message = 'ORDER_SELLER_REQUIRED'; end if;
  if v_order.accepted_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'ORDER_REVISION_CONFLICT'; end if;
  select * into strict v_fulfillment from public.order_fulfillments where order_id = p_order_id for update;
  if p_action = 'mark_processing' then
    if v_order.lifecycle not in ('confirmed', 'awaiting_dp') then raise exception using errcode = 'P0001', message = 'ORDER_STATE_CONFLICT'; end if;
    if exists (select 1 from public.order_payment_obligations where order_id = p_order_id and kind = 'dp' and state <> 'acknowledged') then raise exception using errcode = 'P0001', message = 'ORDER_DP_REQUIRED'; end if;
    v_next := 'processing'; update public.order_fulfillments set seller_processing_at = coalesce(seller_processing_at, statement_timestamp()), updated_at = statement_timestamp() where order_id = p_order_id;
  elsif p_action = 'mark_ready' then
    if v_order.lifecycle <> 'processing' then raise exception using errcode = 'P0001', message = 'ORDER_STATE_CONFLICT'; end if;
    v_next := 'ready'; update public.order_fulfillments set seller_ready_at = coalesce(seller_ready_at, statement_timestamp()), updated_at = statement_timestamp() where order_id = p_order_id;
  elsif p_action = 'mark_handed_over' then
    if v_order.lifecycle <> 'ready' then raise exception using errcode = 'P0001', message = 'ORDER_STATE_CONFLICT'; end if;
    v_next := 'awaiting_receipt'; update public.order_fulfillments set seller_handed_at = coalesce(seller_handed_at, statement_timestamp()), updated_at = statement_timestamp() where order_id = p_order_id;
  else raise exception using errcode = '22023', message = 'ORDER_ACTION_INVALID'; end if;
  update public.orders set lifecycle = v_next, updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = p_order_id;
  perform private.order_record_event(p_order_id, v_actor, p_action, p_expected_revision, '{}'::jsonb);
  v_result := private.order_dto(p_order_id, v_actor); perform private.order_finish_command(v_actor, p_action, p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.order_receive_command(p_order_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.orders%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  v_payload := jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision); v_receipt := private.order_begin_command(v_actor, 'confirm_order_received', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_order from public.orders where order_id = p_order_id for update;
  if v_order.buyer_id <> v_actor or v_order.accepted_revision <> p_expected_revision or v_order.lifecycle not in ('ready', 'awaiting_receipt') then raise exception using errcode = 'P0001', message = 'ORDER_NOT_RECEIVABLE'; end if;
  update public.order_fulfillments set buyer_received_at = coalesce(buyer_received_at, statement_timestamp()), updated_at = statement_timestamp() where order_id = p_order_id;
  if not exists (select 1 from public.order_payment_obligations where order_id = p_order_id and state = 'due') then
    update public.order_inventory_pools pool set held = held - reservation.quantity, consumed = consumed + reservation.quantity from public.order_reservations reservation where reservation.order_id = p_order_id and reservation.state = 'held' and reservation.pool_id = pool.pool_id;
    update public.order_reservations set state = 'consumed', consumed_at = statement_timestamp() where order_id = p_order_id and state = 'held';
    update public.orders set lifecycle = 'completed', updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = p_order_id;
  else update public.orders set lifecycle = 'awaiting_receipt', updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = p_order_id; end if;
  perform private.order_record_event(p_order_id, v_actor, 'order_received', p_expected_revision, '{}'::jsonb);
  v_result := private.order_dto(p_order_id, v_actor); perform private.order_finish_command(v_actor, 'confirm_order_received', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function public.get_order(p_order_id uuid) returns jsonb language sql stable security invoker set search_path = '' as $$ select private.order_dto(p_order_id, auth.uid()) $$;
create or replace function public.create_order_quote(p_conversation_id uuid, p_items jsonb, p_handover_method text, p_handover_note text, p_shipping_amount text, p_dp_percent integer, p_dp_deadline timestamptz, p_reason text, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.create_order_quote_command(p_conversation_id, p_items, p_handover_method, p_handover_note, p_shipping_amount, p_dp_percent, p_dp_deadline, p_reason, p_idempotency_key) $$;
create or replace function public.confirm_order(p_order_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.confirm_order_command(p_order_id, p_expected_revision, p_idempotency_key) $$;
create or replace function public.acknowledge_order_payment(p_order_id uuid, p_expected_revision integer, p_kind text, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.order_ack_payment_command(p_order_id, p_expected_revision, p_kind, p_idempotency_key) $$;
create or replace function public.mark_order_processing(p_order_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.order_lifecycle_command(p_order_id, p_expected_revision, 'mark_processing', p_idempotency_key) $$;
create or replace function public.mark_order_ready(p_order_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.order_lifecycle_command(p_order_id, p_expected_revision, 'mark_ready', p_idempotency_key) $$;
create or replace function public.mark_order_handed_over(p_order_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.order_lifecycle_command(p_order_id, p_expected_revision, 'mark_handed_over', p_idempotency_key) $$;
create or replace function public.confirm_order_received(p_order_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.order_receive_command(p_order_id, p_expected_revision, p_idempotency_key) $$;

revoke all on function private.is_order_participant(uuid, uuid), private.order_begin_command(uuid, text, uuid, jsonb), private.order_finish_command(uuid, text, uuid, jsonb, jsonb), private.order_dto(uuid, uuid), private.order_record_event(uuid, uuid, text, integer, jsonb), private.order_materialize_items(uuid, uuid, text, jsonb), private.create_order_quote_command(uuid, jsonb, text, text, text, integer, timestamptz, text, uuid), private.order_pool_for_item(uuid, public.order_items, public.preorder_batches), private.confirm_order_command(uuid, integer, uuid), private.order_ack_payment_command(uuid, integer, text, uuid), private.order_lifecycle_command(uuid, integer, text, uuid), private.order_receive_command(uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.get_order(uuid), public.create_order_quote(uuid, jsonb, text, text, text, integer, timestamptz, text, uuid), public.confirm_order(uuid, integer, uuid), public.acknowledge_order_payment(uuid, integer, text, uuid), public.mark_order_processing(uuid, integer, uuid), public.mark_order_ready(uuid, integer, uuid), public.mark_order_handed_over(uuid, integer, uuid), public.confirm_order_received(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.get_order(uuid), public.create_order_quote(uuid, jsonb, text, text, text, integer, timestamptz, text, uuid) to authenticated;
grant execute on function public.confirm_order(uuid, integer, uuid), public.acknowledge_order_payment(uuid, integer, text, uuid), public.mark_order_processing(uuid, integer, uuid), public.mark_order_ready(uuid, integer, uuid), public.mark_order_handed_over(uuid, integer, uuid), public.confirm_order_received(uuid, integer, uuid) to authenticated;

do $$ begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') and not exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_events') then alter publication supabase_realtime add table public.order_events; end if;
end $$;
