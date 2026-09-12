create table public.order_cancellation_requests (
  request_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  status text not null default 'pending',
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint order_cancel_request_reason check (char_length(reason) between 5 and 1000),
  constraint order_cancel_request_status check (status in ('pending', 'approved', 'rejected')),
  constraint order_cancel_request_decision check ((status = 'pending' and decided_by is null and decided_at is null) or (status <> 'pending' and decided_by is not null and decided_at is not null))
);
create unique index order_cancel_request_active_uidx on public.order_cancellation_requests(order_id) where status = 'pending';
create index order_cancel_request_order_idx on public.order_cancellation_requests(order_id, created_at desc);
alter table public.order_cancellation_requests enable row level security;
create policy order_cancel_request_participant_read on public.order_cancellation_requests for select to authenticated using (private.is_order_participant(order_id, (select auth.uid())));
revoke all on public.order_cancellation_requests from public, anon, authenticated;
grant select on public.order_cancellation_requests to authenticated;

create or replace function private.order_cancellation_json(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', request.request_id, 'requestedBy', case when request.requested_by = order_row.buyer_id then 'buyer' else 'seller' end, 'reason', request.reason, 'status', request.status, 'createdAt', to_char(request.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  from public.order_cancellation_requests request join public.orders order_row on order_row.order_id = request.order_id
  where request.order_id = p_order_id order by request.created_at desc limit 1
$$;

alter function private.order_dto(uuid, uuid) rename to order_dto_base;
create or replace function private.order_dto(p_order_id uuid, p_actor uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_set(jsonb_set(private.order_dto_base(p_order_id, p_actor), '{cancellationRequest}', coalesce(private.order_cancellation_json(p_order_id), 'null'::jsonb), true), '{refundFollowUpRequired}', to_jsonb(exists (select 1 from public.order_payment_obligations payment where payment.order_id = p_order_id and payment.state = 'acknowledged')), true)
$$;

create or replace function private.release_order_holds(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.order_inventory_pools pool set held = held - reservation.quantity
  from public.order_reservations reservation
  where reservation.order_id = p_order_id and reservation.state = 'held' and reservation.pool_id = pool.pool_id;
  update public.order_reservations set state = 'released', released_at = statement_timestamp() where order_id = p_order_id and state = 'held';
  update public.order_payment_obligations set state = 'cancelled' where order_id = p_order_id and state = 'due';
end
$$;

create or replace function private.cancel_order_command(p_order_id uuid, p_expected_revision integer, p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.orders%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision, 'reason', p_reason);
  v_receipt := private.order_begin_command(v_actor, 'cancel_order', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then raise exception using errcode = '22023', message = 'CANCELLATION_REASON_INVALID'; end if;
  select * into strict v_order from public.orders where order_id = p_order_id for update;
  if v_order.buyer_id <> v_actor or p_expected_revision <> coalesce(v_order.accepted_revision, v_order.current_revision) or v_order.lifecycle not in ('quoted', 'confirmed', 'awaiting_dp') then raise exception using errcode = 'P0001', message = 'ORDER_CANCELLATION_UNAVAILABLE'; end if;
  perform private.release_order_holds(p_order_id);
  update public.orders set lifecycle = 'cancelled', cancellation_reason = btrim(p_reason), updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = p_order_id;
  perform private.order_record_event(p_order_id, v_actor, 'order_cancelled', p_expected_revision, jsonb_build_object('reason', btrim(p_reason), 'refundFollowUpRequired', exists (select 1 from public.order_payment_obligations where order_id = p_order_id and state = 'acknowledged')));
  perform private.create_notification(v_order.seller_id, 'order', 'Pesanan dibatalkan', 'Pembeli membatalkan pesanan sebelum diproses.', '/orders/' || p_order_id::text, 'order_cancellation', p_order_id);
  v_result := private.order_dto(p_order_id, v_actor); perform private.order_finish_command(v_actor, 'cancel_order', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.request_order_cancellation_command(p_order_id uuid, p_expected_revision integer, p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.orders%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('orderId', p_order_id, 'expectedRevision', p_expected_revision, 'reason', p_reason);
  v_receipt := private.order_begin_command(v_actor, 'request_order_cancellation', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then raise exception using errcode = '22023', message = 'CANCELLATION_REASON_INVALID'; end if;
  select * into strict v_order from public.orders where order_id = p_order_id for update;
  if v_order.buyer_id <> v_actor or p_expected_revision <> coalesce(v_order.accepted_revision, v_order.current_revision) or v_order.lifecycle not in ('processing', 'ready', 'awaiting_receipt') or exists (select 1 from public.order_fulfillments where order_id = p_order_id and buyer_received_at is not null) then raise exception using errcode = 'P0001', message = 'ORDER_CANCELLATION_REQUEST_UNAVAILABLE'; end if;
  insert into public.order_cancellation_requests(order_id, requested_by, reason) values (p_order_id, v_actor, btrim(p_reason));
  perform private.order_record_event(p_order_id, v_actor, 'order_cancellation_requested', p_expected_revision, jsonb_build_object('reason', btrim(p_reason)));
  perform private.create_notification(v_order.seller_id, 'order', 'Permintaan pembatalan', 'Pembeli meminta pembatalan pesanan. Periksa alasannya.', '/orders/' || p_order_id::text, 'order_cancellation_request', p_order_id);
  v_result := private.order_dto(p_order_id, v_actor); perform private.order_finish_command(v_actor, 'request_order_cancellation', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function private.respond_order_cancellation_command(p_request_id uuid, p_expected_revision integer, p_approve boolean, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_request public.order_cancellation_requests%rowtype; v_order public.orders%rowtype; v_payload jsonb; v_receipt jsonb; v_result jsonb;
begin
  perform private.assert_active_account(v_actor);
  v_payload := jsonb_build_object('requestId', p_request_id, 'expectedRevision', p_expected_revision, 'approve', p_approve);
  v_receipt := private.order_begin_command(v_actor, 'respond_order_cancellation', p_idempotency_key, v_payload); if v_receipt is not null then return v_receipt; end if;
  select * into strict v_request from public.order_cancellation_requests where request_id = p_request_id for update;
  select * into strict v_order from public.orders where order_id = v_request.order_id for update;
  if v_order.seller_id <> v_actor or v_request.status <> 'pending' or p_expected_revision <> coalesce(v_order.accepted_revision, v_order.current_revision) or v_order.lifecycle not in ('processing', 'ready', 'awaiting_receipt') or exists (select 1 from public.order_fulfillments where order_id = v_order.order_id and buyer_received_at is not null) then raise exception using errcode = 'P0001', message = 'ORDER_CANCELLATION_RESPONSE_UNAVAILABLE'; end if;
  update public.order_cancellation_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_by = v_actor, decided_at = statement_timestamp(), updated_at = statement_timestamp() where request_id = p_request_id;
  if p_approve then
    perform private.release_order_holds(v_order.order_id);
    update public.orders set lifecycle = 'cancelled', cancellation_reason = v_request.reason, updated_at = statement_timestamp(), row_version = row_version + 1 where order_id = v_order.order_id;
    perform private.order_record_event(v_order.order_id, v_actor, 'order_cancellation_approved', p_expected_revision, jsonb_build_object('reason', v_request.reason, 'refundFollowUpRequired', exists (select 1 from public.order_payment_obligations where order_id = v_order.order_id and state = 'acknowledged')));
  else
    perform private.order_record_event(v_order.order_id, v_actor, 'order_cancellation_rejected', p_expected_revision, '{}'::jsonb);
  end if;
  perform private.create_notification(v_order.buyer_id, 'order', case when p_approve then 'Pembatalan disetujui' else 'Pembatalan ditolak' end, case when p_approve then 'Penjual menyetujui pembatalan. Jika ada pembayaran langsung, tindak lanjut refund dilakukan antar pihak.' else 'Penjual belum menyetujui pembatalan pesanan.' end, '/orders/' || v_order.order_id::text, 'order_cancellation_decision', p_request_id);
  v_result := private.order_dto(v_order.order_id, v_actor); perform private.order_finish_command(v_actor, 'respond_order_cancellation', p_idempotency_key, v_payload, v_result); return v_result;
end
$$;

create or replace function public.cancel_order(p_order_id uuid, p_expected_revision integer, p_reason text, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.cancel_order_command(p_order_id, p_expected_revision, p_reason, p_idempotency_key) $$;
create or replace function public.request_order_cancellation(p_order_id uuid, p_expected_revision integer, p_reason text, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.request_order_cancellation_command(p_order_id, p_expected_revision, p_reason, p_idempotency_key) $$;
create or replace function public.respond_order_cancellation(p_request_id uuid, p_expected_revision integer, p_approve boolean, p_idempotency_key uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.respond_order_cancellation_command(p_request_id, p_expected_revision, p_approve, p_idempotency_key) $$;

revoke all on function private.order_dto_base(uuid, uuid), private.order_dto(uuid, uuid), private.order_cancellation_json(uuid), private.release_order_holds(uuid), private.cancel_order_command(uuid, integer, text, uuid), private.request_order_cancellation_command(uuid, integer, text, uuid), private.respond_order_cancellation_command(uuid, integer, boolean, uuid), public.cancel_order(uuid, integer, text, uuid), public.request_order_cancellation(uuid, integer, text, uuid), public.respond_order_cancellation(uuid, integer, boolean, uuid) from public, anon, authenticated;
grant execute on function private.order_dto(uuid, uuid), public.cancel_order(uuid, integer, text, uuid), public.request_order_cancellation(uuid, integer, text, uuid), public.respond_order_cancellation(uuid, integer, boolean, uuid) to authenticated;
