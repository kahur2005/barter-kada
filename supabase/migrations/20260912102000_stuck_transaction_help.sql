alter table private.system_jobs drop constraint if exists system_jobs_kind;
alter table private.system_jobs add constraint system_jobs_kind check (kind in ('publish_reviews', 'order_payment_reminder', 'plus_expiry_reminder', 'receipt_reminder'));

create or replace function private.enqueue_system_job(p_kind text, p_dedupe_key text, p_due_at timestamptz, p_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_kind not in ('publish_reviews', 'order_payment_reminder', 'plus_expiry_reminder', 'receipt_reminder') or char_length(btrim(coalesce(p_dedupe_key, ''))) not between 3 and 300 or p_due_at is null or jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then raise exception using errcode = '22023', message = 'SYSTEM_JOB_INVALID'; end if;
  insert into private.system_jobs(dedupe_key, kind, due_at, payload)
  values (btrim(p_dedupe_key), p_kind, p_due_at, coalesce(p_payload, '{}'::jsonb))
  on conflict (dedupe_key) do nothing
  returning job_id into v_id;
  if v_id is null then select job_id into v_id from private.system_jobs where dedupe_key = btrim(p_dedupe_key); end if;
  return v_id;
end
$$;

create or replace function private.enqueue_trade_receipt_reminder_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.first_received_at is not null and old.first_received_at is distinct from new.first_received_at then
    perform private.enqueue_system_job(
      'receipt_reminder',
      'receipt-reminder:barter:' || new.transaction_id::text,
      greatest(statement_timestamp(), new.first_received_at + interval '24 hours'),
      jsonb_build_object('targetType', 'barter', 'targetId', new.transaction_id)
    );
  end if;
  return new;
end
$$;

drop trigger if exists fulfillments_schedule_receipt_reminder on public.fulfillments;
create trigger fulfillments_schedule_receipt_reminder
after update of first_received_at on public.fulfillments
for each row execute function private.enqueue_trade_receipt_reminder_job();

create or replace function private.enqueue_order_receipt_reminder_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.seller_handed_at is not null and old.seller_handed_at is distinct from new.seller_handed_at then
    perform private.enqueue_system_job(
      'receipt_reminder',
      'receipt-reminder:order:' || new.order_id::text,
      greatest(statement_timestamp(), new.seller_handed_at + interval '24 hours'),
      jsonb_build_object('targetType', 'order', 'targetId', new.order_id)
    );
  end if;
  return new;
end
$$;

drop trigger if exists order_fulfillments_schedule_receipt_reminder on public.order_fulfillments;
create trigger order_fulfillments_schedule_receipt_reminder
after update of seller_handed_at on public.order_fulfillments
for each row execute function private.enqueue_order_receipt_reminder_job();

create or replace function private.run_receipt_reminder(p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_type text := p_payload->>'targetType';
  v_id uuid := nullif(p_payload->>'targetId', '')::uuid;
  v_tx public.transactions%rowtype;
  v_fulfillment public.fulfillments%rowtype;
  v_order public.orders%rowtype;
  v_order_fulfillment public.order_fulfillments%rowtype;
  v_recipient uuid;
begin
  if v_type = 'barter' then
    select * into v_tx from public.transactions where transaction_id = v_id;
    select * into v_fulfillment from public.fulfillments where transaction_id = v_id;
    if v_tx.transaction_id is null or v_fulfillment.transaction_id is null or v_tx.lifecycle <> 'agreed' or v_fulfillment.first_received_at is null or v_fulfillment.first_received_at > statement_timestamp() - interval '24 hours' or (v_fulfillment.party_a_received_at is not null and v_fulfillment.party_b_received_at is not null) then return; end if;
    v_recipient := case when v_fulfillment.party_a_received_at is null then v_tx.party_a else v_tx.party_b end;
    perform private.create_notification(v_recipient, 'handover', 'Konfirmasi penerimaan barter', 'Periksa kembali barang dan konfirmasi penerimaan di ruang barter jika sudah sesuai.', '/transactions/' || v_id::text, 'receipt_reminder', v_id);
  elsif v_type = 'order' then
    select * into v_order from public.orders where order_id = v_id;
    select * into v_order_fulfillment from public.order_fulfillments where order_id = v_id;
    if v_order.order_id is null or v_order_fulfillment.order_id is null or v_order.lifecycle in ('cancelled', 'completed') or v_order_fulfillment.seller_handed_at is null or v_order_fulfillment.seller_handed_at > statement_timestamp() - interval '24 hours' or v_order_fulfillment.buyer_received_at is not null then return; end if;
    perform private.create_notification(v_order.buyer_id, 'handover', 'Konfirmasi penerimaan pesanan', 'Periksa barang saat serah terima lalu konfirmasi penerimaan di ruang pesanan.', '/orders/' || v_id::text, 'receipt_reminder', v_id);
  end if;
end
$$;

create or replace function private.run_due_system_jobs(p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job private.system_jobs%rowtype; v_worker uuid := gen_random_uuid(); v_claimed integer := 0; v_completed integer := 0; v_failed integer := 0;
begin
  for v_job in
    select * from private.system_jobs
    where (status = 'queued' and due_at <= statement_timestamp()) or (status = 'running' and locked_at < statement_timestamp() - interval '10 minutes')
    order by due_at, created_at
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    for update skip locked
  loop
    v_claimed := v_claimed + 1;
    update private.system_jobs set status = 'running', attempts = attempts + 1, locked_at = statement_timestamp(), locked_by = v_worker, updated_at = statement_timestamp() where job_id = v_job.job_id;
    begin
      if v_job.kind = 'publish_reviews' then perform public.publish_due_reviews();
      elsif v_job.kind = 'order_payment_reminder' then perform private.run_order_payment_reminder(v_job.payload);
      elsif v_job.kind = 'plus_expiry_reminder' then perform private.run_plus_expiry_reminder(v_job.payload);
      elsif v_job.kind = 'receipt_reminder' then perform private.run_receipt_reminder(v_job.payload);
      else raise exception using message = 'SYSTEM_JOB_KIND_UNSUPPORTED'; end if;
      update private.system_jobs set status = 'completed', completed_at = statement_timestamp(), last_error = null, updated_at = statement_timestamp() where job_id = v_job.job_id and locked_by = v_worker;
      v_completed := v_completed + 1;
    exception when others then
      update private.system_jobs set status = case when attempts + 1 >= 3 then 'failed' else 'queued' end, due_at = case when attempts + 1 >= 3 then due_at else statement_timestamp() + interval '1 minute' end, last_error = left(sqlerrm, 1000), updated_at = statement_timestamp() where job_id = v_job.job_id and locked_by = v_worker;
      v_failed := v_failed + 1;
    end;
  end loop;
  return jsonb_build_object('workerId', v_worker, 'claimed', v_claimed, 'completed', v_completed, 'failed', v_failed);
end
$$;

create or replace function public.request_admin_help(p_target_type text, p_target_id uuid, p_description text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_now timestamptz := statement_timestamp();
  v_tx public.transactions%rowtype;
  v_fulfillment public.fulfillments%rowtype;
  v_order public.orders%rowtype;
  v_order_fulfillment public.order_fulfillments%rowtype;
  v_report_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if p_target_type not in ('barter', 'order') or p_target_id is null or char_length(btrim(coalesce(p_description, ''))) not between 10 and 3000 then raise exception using errcode = '22023', message = 'ADMIN_HELP_PAYLOAD_INVALID'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin-help:' || p_target_type || ':' || p_target_id::text, 0));
  if exists (select 1 from public.reports where target_type = p_target_type and target_id = p_target_id and status <> 'rejected') then raise exception using errcode = 'P0001', message = 'ADMIN_HELP_ALREADY_REQUESTED'; end if;
  if p_target_type = 'barter' then
    select * into v_tx from public.transactions where transaction_id = p_target_id;
    select * into v_fulfillment from public.fulfillments where transaction_id = p_target_id;
    if not found or v_actor not in (v_tx.party_a, v_tx.party_b) then raise insufficient_privilege using message = 'TRADE_FORBIDDEN'; end if;
    if v_tx.lifecycle <> 'agreed' or v_fulfillment.first_received_at is null or (case when v_actor = v_tx.party_a then v_fulfillment.party_a_received_at else v_fulfillment.party_b_received_at end) is null or (case when v_actor = v_tx.party_a then v_fulfillment.party_b_received_at else v_fulfillment.party_a_received_at end) is not null then raise exception using errcode = 'P0001', message = 'ADMIN_HELP_NOT_AVAILABLE'; end if;
    if v_fulfillment.first_received_at > v_now - interval '72 hours' then raise exception using errcode = 'P0001', message = 'ADMIN_HELP_TOO_EARLY'; end if;
  else
    select * into v_order from public.orders where order_id = p_target_id;
    select * into v_order_fulfillment from public.order_fulfillments where order_id = p_target_id;
    if not found or v_actor <> v_order.seller_id then raise insufficient_privilege using message = 'ORDER_ADMIN_HELP_SELLER_REQUIRED'; end if;
    if v_order.lifecycle not in ('awaiting_receipt', 'ready') or v_order_fulfillment.seller_handed_at is null or v_order_fulfillment.buyer_received_at is not null then raise exception using errcode = 'P0001', message = 'ADMIN_HELP_NOT_AVAILABLE'; end if;
    if v_order_fulfillment.seller_handed_at > v_now - interval '72 hours' then raise exception using errcode = 'P0001', message = 'ADMIN_HELP_TOO_EARLY'; end if;
  end if;
  insert into public.reports(reporter_id, target_type, target_id, reason, description)
  values (v_actor, p_target_type, p_target_id, 'other', btrim(p_description))
  returning report_id into v_report_id;
  return jsonb_build_object('id', v_report_id, 'status', 'open');
end
$$;

alter function private.trade_dto(uuid, uuid) rename to trade_dto_followup_base;
create or replace function private.trade_dto(p_transaction_id uuid, p_actor uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_set(
    base.result,
    '{receiptFollowUp}',
    case
      when fulfillment.first_received_at is null or base.result->>'lifecycle' <> 'agreed' then 'null'::jsonb
      else jsonb_build_object(
        'triggerAt', to_char(fulfillment.first_received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'helpAvailableAt', to_char((fulfillment.first_received_at + interval '72 hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'canRequestAdminHelp', ((case when trade.party_a = p_actor then fulfillment.party_a_received_at else fulfillment.party_b_received_at end) is not null and (case when trade.party_a = p_actor then fulfillment.party_b_received_at else fulfillment.party_a_received_at end) is null and fulfillment.first_received_at <= statement_timestamp() - interval '72 hours' and not exists (select 1 from public.reports report where report.target_type = 'barter' and report.target_id = p_transaction_id and report.status <> 'rejected')),
        'adminHelpRequested', exists (select 1 from public.reports report where report.target_type = 'barter' and report.target_id = p_transaction_id and report.status <> 'rejected')
      )
    end,
    true
  )
  from private.trade_dto_followup_base(p_transaction_id, p_actor) as base(result)
  join public.transactions trade on trade.transaction_id = p_transaction_id
  left join public.fulfillments fulfillment on fulfillment.transaction_id = p_transaction_id
$$;

alter function private.order_dto(uuid, uuid) rename to order_dto_followup_base;
create or replace function private.order_dto(p_order_id uuid, p_actor uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_set(
    base.result,
    '{receiptFollowUp}',
    case
      when fulfillment.seller_handed_at is null or base.result->>'lifecycle' in ('completed', 'cancelled') then 'null'::jsonb
      else jsonb_build_object(
        'triggerAt', to_char(fulfillment.seller_handed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'helpAvailableAt', to_char((fulfillment.seller_handed_at + interval '72 hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'canRequestAdminHelp', (order_row.seller_id = p_actor and fulfillment.buyer_received_at is null and fulfillment.seller_handed_at <= statement_timestamp() - interval '72 hours' and not exists (select 1 from public.reports report where report.target_type = 'order' and report.target_id = p_order_id and report.status <> 'rejected')),
        'adminHelpRequested', exists (select 1 from public.reports report where report.target_type = 'order' and report.target_id = p_order_id and report.status <> 'rejected')
      )
    end,
    true
  )
  from private.order_dto_followup_base(p_order_id, p_actor) as base(result)
  join public.orders order_row on order_row.order_id = p_order_id
  left join public.order_fulfillments fulfillment on fulfillment.order_id = p_order_id
$$;

revoke all on function private.enqueue_trade_receipt_reminder_job(), private.enqueue_order_receipt_reminder_job(), private.run_receipt_reminder(jsonb), public.request_admin_help(text, uuid, text), private.trade_dto_followup_base(uuid, uuid), private.trade_dto(uuid, uuid), private.order_dto_followup_base(uuid, uuid), private.order_dto(uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_admin_help(text, uuid, text) to authenticated;
grant execute on function private.run_due_system_jobs(integer) to service_role;
