do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') and not exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    create extension pg_cron with schema extensions;
  end if;
end
$$;

create table private.system_jobs (
  job_id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  kind text not null,
  due_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts integer not null default 0,
  locked_at timestamptz,
  locked_by uuid,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint system_jobs_kind check (kind in ('publish_reviews', 'order_payment_reminder', 'plus_expiry_reminder')),
  constraint system_jobs_status check (status in ('queued', 'running', 'completed', 'failed')),
  constraint system_jobs_attempts check (attempts >= 0),
  constraint system_jobs_payload check (jsonb_typeof(payload) = 'object')
);
create index system_jobs_due_idx on private.system_jobs(status, due_at, created_at) where status in ('queued', 'running');
alter table private.system_jobs enable row level security;
revoke all on private.system_jobs from public, anon, authenticated;

create or replace function private.enqueue_system_job(p_kind text, p_dedupe_key text, p_due_at timestamptz, p_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_kind not in ('publish_reviews', 'order_payment_reminder', 'plus_expiry_reminder') or char_length(btrim(coalesce(p_dedupe_key, ''))) not between 3 and 300 or p_due_at is null or jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then raise exception using errcode = '22023', message = 'SYSTEM_JOB_INVALID'; end if;
  insert into private.system_jobs(dedupe_key, kind, due_at, payload)
  values (btrim(p_dedupe_key), p_kind, p_due_at, coalesce(p_payload, '{}'::jsonb))
  on conflict (dedupe_key) do nothing
  returning job_id into v_id;
  if v_id is null then select job_id into v_id from private.system_jobs where dedupe_key = btrim(p_dedupe_key); end if;
  return v_id;
end
$$;

create or replace function private.enqueue_review_publication_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' and new.publish_after is not null then
    perform private.enqueue_system_job('publish_reviews', 'review-publish:' || new.review_id::text, new.publish_after, jsonb_build_object('reviewId', new.review_id));
  end if;
  return new;
end
$$;
drop trigger if exists reviews_schedule_publication on public.reviews;
create trigger reviews_schedule_publication after insert or update of status, publish_after on public.reviews for each row execute function private.enqueue_review_publication_job();

create or replace function private.enqueue_payment_reminder_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'dp' and new.state = 'due' and new.due_at is not null then
    perform private.enqueue_system_job('order_payment_reminder', 'order-payment-reminder:' || new.obligation_id::text, greatest(statement_timestamp(), new.due_at - interval '24 hours'), jsonb_build_object('orderId', new.order_id, 'obligationId', new.obligation_id));
  end if;
  return new;
end
$$;
drop trigger if exists order_payment_schedule_reminder on public.order_payment_obligations;
create trigger order_payment_schedule_reminder after insert or update of state, due_at on public.order_payment_obligations for each row execute function private.enqueue_payment_reminder_job();

create or replace function private.enqueue_plus_expiry_reminder_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.paid_through is not null then
    perform private.enqueue_system_job('plus_expiry_reminder', 'plus-expiry:' || new.user_id::text || ':' || floor(extract(epoch from new.paid_through))::bigint::text, greatest(statement_timestamp(), new.paid_through - interval '3 days'), jsonb_build_object('userId', new.user_id, 'paidThrough', new.paid_through));
  end if;
  return new;
end
$$;
drop trigger if exists subscriptions_schedule_expiry_reminder on public.subscriptions;
create trigger subscriptions_schedule_expiry_reminder after insert or update of paid_through on public.subscriptions for each row execute function private.enqueue_plus_expiry_reminder_job();

create or replace function private.run_order_payment_reminder(p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_obligation public.order_payment_obligations%rowtype; v_order public.orders%rowtype;
begin
  select * into v_obligation from public.order_payment_obligations where obligation_id = (p_payload->>'obligationId')::uuid;
  if not found or v_obligation.state <> 'due' or v_obligation.kind <> 'dp' or v_obligation.due_at is null then return; end if;
  select * into v_order from public.orders where order_id = v_obligation.order_id;
  if not found or v_order.lifecycle in ('cancelled', 'completed') then return; end if;
  perform private.create_notification(v_obligation.payer_id, 'payment', 'Tenggat DP mendekat', 'Periksa kesepakatan dan lakukan pembayaran langsung ke penjual sebelum tenggat.', '/orders/' || v_order.order_id::text, 'payment_reminder', v_obligation.obligation_id);
end
$$;

create or replace function private.run_plus_expiry_reminder(p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_paid_through timestamptz; v_current timestamptz;
begin
  v_user := nullif(p_payload->>'userId', '')::uuid;
  v_paid_through := nullif(p_payload->>'paidThrough', '')::timestamptz;
  select paid_through into v_current from public.subscriptions where user_id = v_user;
  if v_current is null or v_current <> v_paid_through or v_current <= statement_timestamp() or v_current > statement_timestamp() + interval '3 days' then return; end if;
  perform private.create_notification(v_user, 'plus', 'Plus segera berakhir', 'Langganan Plus-mu akan berakhir dalam tiga hari. Toko dan promosi mengikuti status aktif.', '/plus', 'plus_expiry_reminder', v_user);
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

revoke all on function private.enqueue_system_job(text, text, timestamptz, jsonb), private.enqueue_review_publication_job(), private.enqueue_payment_reminder_job(), private.enqueue_plus_expiry_reminder_job(), private.run_order_payment_reminder(jsonb), private.run_plus_expiry_reminder(jsonb), private.run_due_system_jobs(integer) from public, anon, authenticated;
grant execute on function private.run_due_system_jobs(integer) to service_role;

do $$
declare v_exists boolean;
begin
  if to_regclass('cron.job') is not null then
    execute 'select exists (select 1 from cron.job where jobname = $1)'
      into v_exists using 'barter-system-jobs';
    if not v_exists then
      execute 'select cron.schedule($1, $2, $3)'
        using 'barter-system-jobs', '* * * * *', 'select private.run_due_system_jobs(50)';
    end if;
  end if;
end
$$;
