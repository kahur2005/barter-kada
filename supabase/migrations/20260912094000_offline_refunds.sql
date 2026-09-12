create table public.refund_requests (
  refund_request_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  proposed_by uuid not null references auth.users(id) on delete restrict,
  payer_id uuid not null references auth.users(id) on delete restrict,
  recipient_id uuid not null references auth.users(id) on delete restrict,
  basis text not null,
  amount_rupiah bigint not null,
  reason text not null,
  policy_snapshot_ref text not null,
  status text not null default 'proposed',
  proof_note text,
  accepted_by uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  sent_by uuid references auth.users(id) on delete restrict,
  sent_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint refund_requests_basis check (basis in ('amendment', 'cancellation', 'admin_decision')),
  constraint refund_requests_amount check (amount_rupiah > 0),
  constraint refund_requests_parties check (payer_id <> recipient_id),
  constraint refund_requests_reason check (char_length(reason) between 5 and 1000),
  constraint refund_requests_policy check (char_length(policy_snapshot_ref) between 3 and 300),
  constraint refund_requests_status check (status in ('proposed', 'accepted', 'sent_unconfirmed', 'confirmed', 'rejected')),
  constraint refund_requests_proof check (proof_note is null or char_length(proof_note) <= 1000),
  constraint refund_requests_accept_fields check ((accepted_at is null and accepted_by is null) or (accepted_at is not null and accepted_by is not null)),
  constraint refund_requests_sent_fields check ((sent_at is null and sent_by is null) or (sent_at is not null and sent_by is not null))
);
create unique index refund_requests_active_uidx on public.refund_requests(order_id) where status in ('proposed', 'accepted', 'sent_unconfirmed');
create index refund_requests_order_recent_idx on public.refund_requests(order_id, created_at desc);

create table public.refund_confirmations (
  confirmation_id uuid primary key default gen_random_uuid(),
  refund_request_id uuid not null references public.refund_requests(refund_request_id) on delete restrict,
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  amount_rupiah bigint not null,
  confirmed_at timestamptz not null default statement_timestamp(),
  constraint refund_confirmations_amount check (amount_rupiah > 0),
  constraint refund_confirmations_once unique (refund_request_id)
);
create index refund_confirmations_refund_idx on public.refund_confirmations(refund_request_id, confirmed_at desc);

alter table public.refund_requests enable row level security;
alter table public.refund_confirmations enable row level security;
create policy refund_requests_participant_read on public.refund_requests for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));
create policy refund_confirmations_participant_read on public.refund_confirmations for select to authenticated using (exists (select 1 from public.refund_requests request where request.refund_request_id = refund_confirmations.refund_request_id and private.is_order_participant(request.order_id, (select auth.uid()))));
revoke all on public.refund_requests, public.refund_confirmations from public, anon, authenticated;

create or replace function private.order_refund_cap(p_order_id uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select greatest(
    0,
    coalesce((select sum(payment.amount_rupiah) from public.order_payment_obligations payment where payment.order_id = p_order_id and payment.state = 'acknowledged'), 0)
    - coalesce((select sum(confirmation.amount_rupiah) from public.refund_confirmations confirmation join public.refund_requests request on request.refund_request_id = confirmation.refund_request_id where request.order_id = p_order_id), 0)
  )::bigint
$$;

create or replace function private.refund_request_json(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', request.refund_request_id, 'status', request.status, 'basis', request.basis, 'amountRupiah', request.amount_rupiah::text,
    'payerRole', case when request.payer_id = order_row.buyer_id then 'buyer' else 'seller' end,
    'recipientRole', case when request.recipient_id = order_row.buyer_id then 'buyer' else 'seller' end,
    'reason', request.reason, 'proofNote', request.proof_note,
    'createdAt', to_char(request.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'acceptedAt', case when request.accepted_at is null then null else to_char(request.accepted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'sentAt', case when request.sent_at is null then null else to_char(request.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'confirmedAt', case when confirmation.confirmed_at is null then null else to_char(confirmation.confirmed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
  ) order by request.created_at desc), '[]'::jsonb)
  from public.refund_requests request
  join public.orders order_row on order_row.order_id = request.order_id
  left join public.refund_confirmations confirmation on confirmation.refund_request_id = request.refund_request_id
  where request.order_id = p_order_id
$$;

create or replace function private.order_settlement_json(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'acknowledgedRupiah', coalesce((select sum(payment.amount_rupiah) from public.order_payment_obligations payment where payment.order_id = p_order_id and payment.state = 'acknowledged'), 0)::text,
    'confirmedRefundRupiah', coalesce((select sum(confirmation.amount_rupiah) from public.refund_confirmations confirmation join public.refund_requests request on request.refund_request_id = confirmation.refund_request_id where request.order_id = p_order_id), 0)::text,
    'netReceivedRupiah', greatest(0, coalesce((select sum(payment.amount_rupiah) from public.order_payment_obligations payment where payment.order_id = p_order_id and payment.state = 'acknowledged'), 0) - coalesce((select sum(confirmation.amount_rupiah) from public.refund_confirmations confirmation join public.refund_requests request on request.refund_request_id = confirmation.refund_request_id where request.order_id = p_order_id), 0))::text,
    'amountStillDueRupiah', greatest(0, coalesce((select revision.total_rupiah from public.orders order_row join public.order_revisions revision on revision.order_id = order_row.order_id and revision.revision = order_row.accepted_revision where order_row.order_id = p_order_id), 0) - greatest(0, coalesce((select sum(payment.amount_rupiah) from public.order_payment_obligations payment where payment.order_id = p_order_id and payment.state = 'acknowledged'), 0) - coalesce((select sum(confirmation.amount_rupiah) from public.refund_confirmations confirmation join public.refund_requests request on request.refund_request_id = confirmation.refund_request_id where request.order_id = p_order_id), 0)))::text,
    'refundCapRupiah', private.order_refund_cap(p_order_id)::text
  )
$$;

alter function private.order_dto(uuid, uuid) rename to order_dto_refund_base;
create or replace function private.order_dto(p_order_id uuid, p_actor uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_set(
    jsonb_set(jsonb_set(private.order_dto_refund_base(p_order_id, p_actor), '{refunds}', private.refund_request_json(p_order_id), true), '{settlement}', private.order_settlement_json(p_order_id), true),
    '{refundFollowUpRequired}', to_jsonb(exists (select 1 from public.refund_requests request where request.order_id = p_order_id and request.status in ('proposed', 'accepted', 'sent_unconfirmed')) or (exists (select 1 from public.orders order_row where order_row.order_id = p_order_id and order_row.lifecycle = 'cancelled') and exists (select 1 from public.order_payment_obligations payment where payment.order_id = p_order_id and payment.state = 'acknowledged' and not exists (select 1 from public.refund_confirmations confirmation join public.refund_requests refund on refund.refund_request_id = confirmation.refund_request_id where refund.order_id = p_order_id))))
  )
$$;

create or replace function private.propose_refund_command(p_order_id uuid, p_expected_revision integer, p_amount_rupiah bigint, p_reason text, p_basis text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.orders%rowtype; v_refund uuid := gen_random_uuid(); v_payload jsonb; v_receipt jsonb; v_cap bigint;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision, 'amountRupiah', p_amount_rupiah::text, 'reason', p_reason, 'basis', p_basis);
  v_receipt := private.order_begin_command(v_actor, 'propose_refund', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_order from public.orders where order_id = p_order_id for update;
  if v_actor <> v_order.seller_id and not private.is_admin(v_actor) then raise insufficient_privilege using message = 'ORDER_SELLER_REQUIRED'; end if;
  if p_expected_revision <> coalesce(v_order.accepted_revision, v_order.current_revision) then raise exception using errcode = 'P0001', message = 'ORDER_REVISION_CONFLICT'; end if;
  if p_basis not in ('amendment', 'cancellation', 'admin_decision') or p_amount_rupiah is null or p_amount_rupiah <= 0 or char_length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then raise exception using errcode = '22023', message = 'REFUND_PAYLOAD_INVALID'; end if;
  if (p_basis = 'cancellation' and v_order.lifecycle <> 'cancelled') or (p_basis = 'amendment' and not exists (select 1 from public.order_amendments amendment where amendment.order_id = p_order_id and amendment.status = 'accepted')) or (p_basis = 'admin_decision' and not private.is_admin(v_actor)) then raise exception using errcode = 'P0001', message = 'REFUND_BASIS_UNAVAILABLE'; end if;
  v_cap := private.order_refund_cap(p_order_id);
  if p_amount_rupiah > v_cap then raise exception using errcode = 'P0001', message = 'REFUND_EXCEEDS_ACKNOWLEDGED'; end if;
  if exists (select 1 from public.refund_requests where order_id = p_order_id and status in ('proposed', 'accepted', 'sent_unconfirmed')) then raise exception using errcode = 'P0001', message = 'REFUND_ACTIVE'; end if;
  insert into public.refund_requests(refund_request_id, order_id, proposed_by, payer_id, recipient_id, basis, amount_rupiah, reason, policy_snapshot_ref)
  values (v_refund, p_order_id, v_actor, v_order.seller_id, v_order.buyer_id, p_basis, p_amount_rupiah, btrim(p_reason), 'manual:' || p_basis || ':direct-transfer');
  perform private.order_record_event(p_order_id, v_actor, 'refund_proposed', coalesce(v_order.accepted_revision, v_order.current_revision), jsonb_build_object('refundRequestId', v_refund, 'amountRupiah', p_amount_rupiah::text, 'basis', p_basis));
  perform private.create_notification(v_order.buyer_id, 'payment', 'Usulan pengembalian dana', 'Penjual mengusulkan pengembalian dana langsung. Periksa nominal dan setujui hanya jika sesuai.', '/orders/' || p_order_id::text, 'refund_proposed', v_refund);
  v_payload := private.order_dto(p_order_id, v_actor); perform private.order_finish_command(v_actor, 'propose_refund', p_idempotency_key, jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision, 'amountRupiah', p_amount_rupiah::text, 'reason', p_reason, 'basis', p_basis), v_payload); return v_payload;
end
$$;

create or replace function private.accept_refund_command(p_refund_request_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_request public.refund_requests%rowtype; v_order public.orders%rowtype; v_payload jsonb; v_result jsonb; v_receipt jsonb;
begin
  perform private.assert_active_account(v_actor); v_payload := jsonb_build_object('refundRequestId', p_refund_request_id, 'expectedRevision', p_expected_revision);
  v_receipt := private.order_begin_command(v_actor, 'accept_refund', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_request from public.refund_requests where refund_request_id = p_refund_request_id for update;
  select * into strict v_order from public.orders where order_id = v_request.order_id for update;
  if v_request.recipient_id <> v_actor or v_request.status <> 'proposed' or p_expected_revision <> coalesce(v_order.accepted_revision, v_order.current_revision) then raise exception using errcode = 'P0001', message = 'REFUND_ACCEPT_UNAVAILABLE'; end if;
  update public.refund_requests set status = 'accepted', accepted_by = v_actor, accepted_at = statement_timestamp(), updated_at = statement_timestamp() where refund_request_id = v_request.refund_request_id;
  perform private.order_record_event(v_order.order_id, v_actor, 'refund_accepted', coalesce(v_order.accepted_revision, v_order.current_revision), jsonb_build_object('refundRequestId', v_request.refund_request_id));
  perform private.create_notification(v_request.payer_id, 'payment', 'Pengembalian dana disetujui', 'Penerima menyetujui nominal. Transfer dilakukan langsung antar pihak.', '/orders/' || v_order.order_id::text, 'refund_accepted', v_request.refund_request_id);
  v_result := private.order_dto(v_order.order_id, v_actor); perform private.order_finish_command(v_actor, 'accept_refund', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.record_refund_sent_command(p_refund_request_id uuid, p_expected_revision integer, p_proof_note text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_request public.refund_requests%rowtype; v_order public.orders%rowtype; v_payload jsonb; v_result jsonb; v_receipt jsonb;
begin
  perform private.assert_active_account(v_actor); v_payload := jsonb_build_object('refundRequestId', p_refund_request_id, 'expectedRevision', p_expected_revision, 'proofNote', p_proof_note);
  v_receipt := private.order_begin_command(v_actor, 'record_refund_sent', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_request from public.refund_requests where refund_request_id = p_refund_request_id for update;
  select * into strict v_order from public.orders where order_id = v_request.order_id for update;
  if v_request.payer_id <> v_actor or v_request.status <> 'accepted' or p_expected_revision <> coalesce(v_order.accepted_revision, v_order.current_revision) or char_length(coalesce(p_proof_note, '')) > 1000 then raise exception using errcode = 'P0001', message = 'REFUND_SEND_UNAVAILABLE'; end if;
  update public.refund_requests set status = 'sent_unconfirmed', sent_by = v_actor, sent_at = statement_timestamp(), proof_note = nullif(btrim(p_proof_note), ''), updated_at = statement_timestamp() where refund_request_id = v_request.refund_request_id;
  perform private.order_record_event(v_order.order_id, v_actor, 'refund_sent_unconfirmed', coalesce(v_order.accepted_revision, v_order.current_revision), jsonb_build_object('refundRequestId', v_request.refund_request_id));
  perform private.create_notification(v_request.recipient_id, 'payment', 'Transfer refund ditandai terkirim', 'Pengirim menandai transfer langsung sudah dilakukan. Konfirmasi hanya setelah dana benar-benar diterima.', '/orders/' || v_order.order_id::text, 'refund_sent', v_request.refund_request_id);
  v_result := private.order_dto(v_order.order_id, v_actor); perform private.order_finish_command(v_actor, 'record_refund_sent', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.confirm_refund_received_command(p_refund_request_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_request public.refund_requests%rowtype; v_order public.orders%rowtype; v_payload jsonb; v_result jsonb; v_receipt jsonb;
begin
  perform private.assert_active_account(v_actor); v_payload := jsonb_build_object('refundRequestId', p_refund_request_id, 'expectedRevision', p_expected_revision);
  v_receipt := private.order_begin_command(v_actor, 'confirm_refund_received', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_request from public.refund_requests where refund_request_id = p_refund_request_id for update;
  select * into strict v_order from public.orders where order_id = v_request.order_id for update;
  if v_request.recipient_id <> v_actor or v_request.status <> 'sent_unconfirmed' or p_expected_revision <> coalesce(v_order.accepted_revision, v_order.current_revision) then raise exception using errcode = 'P0001', message = 'REFUND_CONFIRM_UNAVAILABLE'; end if;
  insert into public.refund_confirmations(refund_request_id, confirmed_by, amount_rupiah) values (v_request.refund_request_id, v_actor, v_request.amount_rupiah);
  update public.refund_requests set status = 'confirmed', updated_at = statement_timestamp() where refund_request_id = v_request.refund_request_id;
  perform private.order_record_event(v_order.order_id, v_actor, 'refund_confirmed', coalesce(v_order.accepted_revision, v_order.current_revision), jsonb_build_object('refundRequestId', v_request.refund_request_id, 'amountRupiah', v_request.amount_rupiah::text));
  perform private.create_notification(v_request.payer_id, 'payment', 'Refund dikonfirmasi diterima', 'Penerima mengonfirmasi dana refund langsung sudah diterima.', '/orders/' || v_order.order_id::text, 'refund_confirmed', v_request.refund_request_id);
  v_result := private.order_dto(v_order.order_id, v_actor); perform private.order_finish_command(v_actor, 'confirm_refund_received', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.reject_refund_command(p_refund_request_id uuid, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_request public.refund_requests%rowtype; v_order public.orders%rowtype; v_payload jsonb; v_result jsonb; v_receipt jsonb;
begin
  perform private.assert_active_account(v_actor); v_payload := jsonb_build_object('refundRequestId', p_refund_request_id, 'expectedRevision', p_expected_revision);
  v_receipt := private.order_begin_command(v_actor, 'reject_refund', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_request from public.refund_requests where refund_request_id = p_refund_request_id for update;
  select * into strict v_order from public.orders where order_id = v_request.order_id for update;
  if v_request.recipient_id <> v_actor or v_request.status <> 'proposed' or p_expected_revision <> coalesce(v_order.accepted_revision, v_order.current_revision) then raise exception using errcode = 'P0001', message = 'REFUND_REJECT_UNAVAILABLE'; end if;
  update public.refund_requests set status = 'rejected', updated_at = statement_timestamp() where refund_request_id = v_request.refund_request_id;
  perform private.order_record_event(v_order.order_id, v_actor, 'refund_rejected', coalesce(v_order.accepted_revision, v_order.current_revision), jsonb_build_object('refundRequestId', v_request.refund_request_id));
  v_result := private.order_dto(v_order.order_id, v_actor); perform private.order_finish_command(v_actor, 'reject_refund', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function public.propose_refund(p_order_id uuid, p_expected_revision integer, p_amount_rupiah bigint, p_reason text, p_basis text, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.propose_refund_command(p_order_id, p_expected_revision, p_amount_rupiah, p_reason, p_basis, p_idempotency_key) $$;
create or replace function public.accept_refund(p_refund_request_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.accept_refund_command(p_refund_request_id, p_expected_revision, p_idempotency_key) $$;
create or replace function public.record_refund_sent(p_refund_request_id uuid, p_expected_revision integer, p_proof_note text, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.record_refund_sent_command(p_refund_request_id, p_expected_revision, p_proof_note, p_idempotency_key) $$;
create or replace function public.confirm_refund_received(p_refund_request_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.confirm_refund_received_command(p_refund_request_id, p_expected_revision, p_idempotency_key) $$;
create or replace function public.reject_refund(p_refund_request_id uuid, p_expected_revision integer, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.reject_refund_command(p_refund_request_id, p_expected_revision, p_idempotency_key) $$;

revoke all on function private.order_dto_refund_base(uuid, uuid), private.order_refund_cap(uuid), private.refund_request_json(uuid), private.order_settlement_json(uuid), private.propose_refund_command(uuid, integer, bigint, text, text, uuid), private.accept_refund_command(uuid, integer, uuid), private.record_refund_sent_command(uuid, integer, text, uuid), private.confirm_refund_received_command(uuid, integer, uuid), private.reject_refund_command(uuid, integer, uuid), public.propose_refund(uuid, integer, bigint, text, text, uuid), public.accept_refund(uuid, integer, uuid), public.record_refund_sent(uuid, integer, text, uuid), public.confirm_refund_received(uuid, integer, uuid), public.reject_refund(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.propose_refund(uuid, integer, bigint, text, text, uuid), public.accept_refund(uuid, integer, uuid), public.record_refund_sent(uuid, integer, text, uuid), public.confirm_refund_received(uuid, integer, uuid), public.reject_refund(uuid, integer, uuid) to authenticated;
