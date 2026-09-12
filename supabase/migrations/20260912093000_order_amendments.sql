create table public.order_amendments (
  amendment_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  base_revision integer not null,
  proposed_revision integer not null,
  proposed_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'proposed',
  reason text not null,
  expires_at timestamptz,
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint order_amendments_revision_positive check (base_revision > 0 and proposed_revision > base_revision),
  constraint order_amendments_status check (status in ('proposed', 'accepted', 'rejected', 'withdrawn')),
  constraint order_amendments_reason check (char_length(reason) between 2 and 300),
  constraint order_amendments_decision check ((status = 'proposed' and decided_by is null and decided_at is null) or (status <> 'proposed' and decided_by is not null and decided_at is not null)),
  constraint order_amendments_expiry check (expires_at is null or expires_at > created_at),
  constraint order_amendments_revision_unique unique (order_id, proposed_revision)
);
create unique index order_amendments_active_uidx on public.order_amendments(order_id) where status = 'proposed';
create index order_amendments_order_recent_idx on public.order_amendments(order_id, created_at desc);
alter table public.order_amendments enable row level security;
create policy order_amendments_participant_read on public.order_amendments for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));
revoke all on public.order_amendments from public, anon, authenticated;

create or replace function private.order_amendment_json(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', amendment.amendment_id, 'status', amendment.status, 'baseRevision', amendment.base_revision, 'proposedRevision', amendment.proposed_revision,
    'proposerRole', case when amendment.proposed_by = order_row.buyer_id then 'buyer' else 'seller' end, 'reason', amendment.reason,
    'createdAt', to_char(amendment.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'expiresAt', case when amendment.expires_at is null then null else to_char(amendment.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', item.order_item_id, 'listingId', item.listing_id, 'variantId', item.variant_id, 'name', item.name, 'unit', item.unit, 'quantity', item.quantity, 'unitPriceRupiah', item.unit_price_rupiah::text, 'lineTotalRupiah', item.line_total_rupiah::text) order by item.order_item_id) from public.order_items item where item.revision_id = revision.revision_id), '[]'::jsonb),
    'terms', jsonb_build_object('handoverMethod', revision.handover_method, 'handoverNote', revision.handover_note, 'shippingAmountRupiah', revision.shipping_amount_rupiah::text, 'subtotalRupiah', revision.subtotal_rupiah::text, 'totalRupiah', revision.total_rupiah::text, 'dpPercent', revision.dp_percent, 'dpAmountRupiah', revision.dp_amount_rupiah::text, 'dpDeadline', revision.dp_deadline)
  )
  from public.order_amendments amendment
  join public.orders order_row on order_row.order_id = amendment.order_id
  join public.order_revisions revision on revision.order_id = amendment.order_id and revision.revision = amendment.proposed_revision
  where amendment.order_id = p_order_id order by amendment.created_at desc limit 1
$$;

create or replace function private.propose_order_amendment_command(
  p_order_id uuid, p_expected_revision integer, p_items jsonb, p_handover_method text, p_handover_note text,
  p_shipping_amount text, p_dp_percent integer, p_dp_deadline timestamptz, p_reason text, p_idempotency_key uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_order public.orders%rowtype; v_revision public.order_revisions%rowtype; v_amendment uuid := gen_random_uuid(); v_revision_id uuid := gen_random_uuid();
  v_subtotal bigint; v_shipping bigint; v_total bigint; v_dp bigint; v_payload jsonb; v_receipt jsonb;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision, 'items', p_items, 'handoverMethod', p_handover_method, 'handoverNote', p_handover_note, 'shippingAmount', p_shipping_amount, 'dpPercent', p_dp_percent, 'dpDeadline', p_dp_deadline, 'reason', p_reason);
  v_receipt := private.order_begin_command(v_actor, 'propose_order_amendment', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_order from public.orders where order_id = p_order_id for update;
  if v_order.seller_id <> v_actor then raise insufficient_privilege using message = 'ORDER_SELLER_REQUIRED'; end if;
  if v_order.current_revision <> p_expected_revision or v_order.lifecycle not in ('confirmed', 'awaiting_dp') or exists (select 1 from public.order_fulfillments where order_id = p_order_id and buyer_received_at is not null) then raise exception using errcode = 'P0001', message = 'ORDER_AMENDMENT_UNAVAILABLE'; end if;
  if exists (select 1 from public.order_cancellation_requests where order_id = p_order_id and status = 'pending') or exists (select 1 from public.order_amendments where order_id = p_order_id and status = 'proposed') then raise exception using errcode = 'P0001', message = 'ORDER_AMENDMENT_ACTIVE'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 2 and 300 or p_handover_method not in ('pickup', 'meetup', 'delivery') then raise exception using errcode = '22023', message = 'ORDER_AMENDMENT_INVALID'; end if;
  if p_dp_percent not between 0 and 100 or (v_order.kind = 'free' and p_dp_percent <> 0) then raise exception using errcode = '22023', message = 'ORDER_DP_INVALID'; end if;
  begin v_shipping := coalesce(nullif(p_shipping_amount, ''), '0')::bigint; exception when others then raise exception using errcode = '22023', message = 'ORDER_SHIPPING_INVALID'; end;
  if v_shipping < 0 then raise exception using errcode = '22023', message = 'ORDER_SHIPPING_INVALID'; end if;
  select * into strict v_revision from public.order_revisions where order_id = p_order_id and revision = v_order.current_revision;
  insert into public.order_revisions(revision_id, order_id, revision, created_by, reason, handover_method, handover_note, shipping_amount_rupiah, dp_percent, subtotal_rupiah, total_rupiah, dp_deadline)
  values (v_revision_id, p_order_id, v_order.current_revision + 1, v_actor, btrim(p_reason), p_handover_method, left(btrim(coalesce(p_handover_note, '')), 500), v_shipping, p_dp_percent, 0, 0, p_dp_deadline);
  v_subtotal := private.order_materialize_items(v_revision_id, v_order.listing_id, v_order.kind, p_items);
  v_total := v_subtotal + v_shipping; v_dp := ceil(v_total * p_dp_percent / 100.0);
  update public.order_revisions set subtotal_rupiah = v_subtotal, total_rupiah = v_total, dp_amount_rupiah = v_dp where revision_id = v_revision_id;
  insert into public.order_amendments(amendment_id, order_id, base_revision, proposed_revision, proposed_by, reason, expires_at)
  values (v_amendment, p_order_id, v_order.current_revision, v_order.current_revision + 1, v_actor, btrim(p_reason), statement_timestamp() + interval '48 hours');
  perform private.order_record_event(p_order_id, v_actor, 'order_amendment_proposed', v_order.current_revision, jsonb_build_object('amendmentId', v_amendment, 'proposedRevision', v_order.current_revision + 1));
  perform private.create_notification(v_order.buyer_id, 'order', 'Perubahan pesanan menunggu persetujuan', 'Penjual mengajukan perubahan rincian pesanan. Periksa perbandingan sebelum menyetujui.', '/orders/' || p_order_id::text, 'order_amendment', v_amendment);
  return private.order_dto(p_order_id, v_actor);
end
$$;

create or replace function private.accept_order_amendment_command(p_amendment_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_amend public.order_amendments%rowtype; v_order public.orders%rowtype; v_new public.order_revisions%rowtype; v_batch public.preorder_batches%rowtype; v_item public.order_items%rowtype; v_pool uuid;
  v_acknowledged bigint; v_dp_due bigint; v_balance_due bigint; v_payload jsonb; v_receipt jsonb; v_next_lifecycle text;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('amendmentId', p_amendment_id, 'expectedRevision', p_expected_revision);
  v_receipt := private.order_begin_command(v_actor, 'accept_order_amendment', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_amend from public.order_amendments where amendment_id = p_amendment_id for update;
  select * into strict v_order from public.orders where order_id = v_amend.order_id for update;
  if v_order.buyer_id <> v_actor or v_amend.status <> 'proposed' or p_expected_revision <> v_order.current_revision or v_amend.base_revision <> v_order.current_revision or v_order.lifecycle not in ('confirmed', 'awaiting_dp') then raise exception using errcode = 'P0001', message = 'ORDER_AMENDMENT_CONFLICT'; end if;
  if v_amend.expires_at is not null and v_amend.expires_at <= statement_timestamp() then raise exception using errcode = 'P0001', message = 'ORDER_AMENDMENT_EXPIRED'; end if;
  select * into strict v_new from public.order_revisions where order_id = v_order.order_id and revision = v_amend.proposed_revision;
  select * into v_batch from public.preorder_batches where listing_id = v_order.listing_id and state = 'open' order by created_at desc limit 1 for update;
  if v_batch.batch_id is not null and statement_timestamp() >= v_batch.order_closes_at then raise exception using errcode = 'P0001', message = 'ORDER_WINDOW_CLOSED'; end if;
  select coalesce(sum(amount_rupiah), 0) into v_acknowledged from public.order_payment_obligations where order_id = v_order.order_id and state = 'acknowledged' and payer_id = v_order.buyer_id and payee_id = v_order.seller_id;
  perform private.release_order_holds(v_order.order_id);
  for v_item in select * from public.order_items where revision_id = v_new.revision_id order by order_item_id loop
    v_pool := private.order_pool_for_item(v_order.order_id, v_item, v_batch);
    insert into public.order_reservations(order_id, pool_id, quantity) values (v_order.order_id, v_pool, v_item.quantity);
    update public.order_inventory_pools set held = held + v_item.quantity where pool_id = v_pool;
  end loop;
  if v_acknowledged < v_new.dp_amount_rupiah then
    v_dp_due := v_new.dp_amount_rupiah - v_acknowledged; v_balance_due := v_new.total_rupiah - v_new.dp_amount_rupiah; v_next_lifecycle := 'awaiting_dp';
    insert into public.order_payment_obligations(order_id, revision, kind, payer_id, payee_id, amount_rupiah, due_at) values (v_order.order_id, v_new.revision, 'dp', v_order.buyer_id, v_order.seller_id, v_dp_due, v_new.dp_deadline);
  else
    v_dp_due := 0; v_balance_due := greatest(0, v_new.total_rupiah - v_acknowledged); v_next_lifecycle := 'confirmed';
  end if;
  if v_balance_due > 0 then insert into public.order_payment_obligations(order_id, revision, kind, payer_id, payee_id, amount_rupiah) values (v_order.order_id, v_new.revision, 'balance', v_order.buyer_id, v_order.seller_id, v_balance_due); end if;
  update public.orders set current_revision = v_new.revision, accepted_revision = v_new.revision, lifecycle = v_next_lifecycle, row_version = row_version + 1, updated_at = statement_timestamp() where order_id = v_order.order_id;
  update public.order_amendments set status = 'accepted', decided_by = v_actor, decided_at = statement_timestamp(), updated_at = statement_timestamp() where amendment_id = v_amend.amendment_id;
  perform private.order_record_event(v_order.order_id, v_actor, 'order_amendment_accepted', v_new.revision, jsonb_build_object('amendmentId', v_amend.amendment_id, 'acknowledgedRupiah', v_acknowledged::text));
  perform private.create_notification(v_order.seller_id, 'order', 'Perubahan pesanan disetujui', 'Pembeli menyetujui perubahan pesanan. Pembayaran tetap dilakukan langsung antar pihak.', '/orders/' || v_order.order_id::text, 'order_amendment_decision', v_amend.amendment_id);
  v_payload := private.order_dto(v_order.order_id, v_actor); perform private.order_finish_command(v_actor, 'accept_order_amendment', p_idempotency_key, jsonb_build_object('amendmentId', p_amendment_id, 'expectedRevision', p_expected_revision), v_payload); return v_payload;
end
$$;

create or replace function private.resolve_order_amendment_command(p_amendment_id uuid, p_expected_revision integer, p_action text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_amend public.order_amendments%rowtype; v_order public.orders%rowtype; v_payload jsonb; v_result jsonb; v_receipt jsonb; v_is_withdraw boolean := p_action = 'withdraw_order_amendment';
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('amendmentId', p_amendment_id, 'expectedRevision', p_expected_revision, 'action', p_action);
  v_receipt := private.order_begin_command(v_actor, p_action, p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_amend from public.order_amendments where amendment_id = p_amendment_id for update;
  select * into strict v_order from public.orders where order_id = v_amend.order_id for update;
  if v_amend.status <> 'proposed' or v_order.current_revision <> p_expected_revision or v_amend.base_revision <> p_expected_revision then raise exception using errcode = 'P0001', message = 'ORDER_AMENDMENT_CONFLICT'; end if;
  if (v_is_withdraw and v_order.seller_id <> v_actor) or (not v_is_withdraw and v_order.buyer_id <> v_actor) then raise insufficient_privilege using message = case when v_is_withdraw then 'ORDER_SELLER_REQUIRED' else 'ORDER_BUYER_REQUIRED' end; end if;
  update public.order_amendments set status = case when v_is_withdraw then 'withdrawn' else 'rejected' end, decided_by = v_actor, decided_at = statement_timestamp(), updated_at = statement_timestamp() where amendment_id = v_amend.amendment_id;
  perform private.order_record_event(v_order.order_id, v_actor, case when v_is_withdraw then 'order_amendment_withdrawn' else 'order_amendment_rejected' end, v_order.current_revision, jsonb_build_object('amendmentId', v_amend.amendment_id));
  v_result := private.order_dto(v_order.order_id, v_actor); perform private.order_finish_command(v_actor, p_action, p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

alter function private.order_dto(uuid, uuid) rename to order_dto_amendment_base;
create or replace function private.order_dto(p_order_id uuid, p_actor uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_set(private.order_dto_amendment_base(p_order_id, p_actor), '{amendment}', coalesce(private.order_amendment_json(p_order_id), 'null'::jsonb), true)
$$;

create or replace function public.propose_order_amendment(p_order_id uuid, p_expected_revision integer, p_items jsonb, p_handover_method text, p_handover_note text, p_shipping_amount text, p_dp_percent integer, p_dp_deadline timestamptz, p_reason text, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.propose_order_amendment_command(p_order_id, p_expected_revision, p_items, p_handover_method, p_handover_note, p_shipping_amount, p_dp_percent, p_dp_deadline, p_reason, p_idempotency_key) $$;
create or replace function public.accept_order_amendment(p_amendment_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.accept_order_amendment_command(p_amendment_id, p_expected_revision, p_idempotency_key) $$;
create or replace function public.reject_order_amendment(p_amendment_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.resolve_order_amendment_command(p_amendment_id, p_expected_revision, 'reject_order_amendment', p_idempotency_key) $$;
create or replace function public.withdraw_order_amendment(p_amendment_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.resolve_order_amendment_command(p_amendment_id, p_expected_revision, 'withdraw_order_amendment', p_idempotency_key) $$;

revoke all on function private.order_dto_amendment_base(uuid, uuid), private.order_amendment_json(uuid), private.propose_order_amendment_command(uuid, integer, jsonb, text, text, text, integer, timestamptz, text, uuid), private.accept_order_amendment_command(uuid, integer, uuid), private.resolve_order_amendment_command(uuid, integer, text, uuid), public.propose_order_amendment(uuid, integer, jsonb, text, text, text, integer, timestamptz, text, uuid), public.accept_order_amendment(uuid, integer, uuid), public.reject_order_amendment(uuid, integer, uuid), public.withdraw_order_amendment(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.propose_order_amendment(uuid, integer, jsonb, text, text, text, integer, timestamptz, text, uuid), public.accept_order_amendment(uuid, integer, uuid), public.reject_order_amendment(uuid, integer, uuid), public.withdraw_order_amendment(uuid, integer, uuid) to authenticated;
