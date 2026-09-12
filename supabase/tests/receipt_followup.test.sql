begin;
select plan(18);

select has_table('public', 'fulfillments', 'barter fulfillment table exists');
select has_table('public', 'order_fulfillments', 'order fulfillment table exists');
select has_table('private', 'system_jobs', 'system job queue exists');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'system_jobs_kind' and pg_get_constraintdef(oid) like '%receipt_reminder%'), 'receipt reminder is an allowlisted job');
select ok((select prosrc like '%receipt_reminder%' from pg_catalog.pg_proc where oid = 'private.enqueue_system_job(text,text,timestamptz,jsonb)'::regprocedure), 'queue helper accepts receipt reminders');
select ok(exists (select 1 from pg_catalog.pg_trigger where tgname = 'fulfillments_schedule_receipt_reminder'), 'barter receipt schedules a reminder');
select ok(exists (select 1 from pg_catalog.pg_trigger where tgname = 'order_fulfillments_schedule_receipt_reminder'), 'order handover schedules a reminder');
select ok(exists (select 1 from pg_catalog.pg_proc where oid = 'private.run_receipt_reminder(jsonb)'::regprocedure), 'receipt reminder handler exists');
select ok(exists (select 1 from pg_catalog.pg_proc where oid = 'public.request_admin_help(text,uuid,text)'::regprocedure), 'admin help RPC accepts scoped transaction target');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'public.request_admin_help(text,uuid,text)'::regprocedure), 'admin help RPC validates through server privileges');
select ok(has_function_privilege('authenticated', 'public.request_admin_help(text,uuid,text)', 'execute'), 'authenticated users can request help through RPC');
select ok(not has_function_privilege('anon', 'public.request_admin_help(text,uuid,text)', 'execute'), 'anonymous users cannot request help');
select ok(has_function_privilege('service_role', 'private.run_due_system_jobs(integer)', 'execute'), 'service role can run reminder jobs');
select ok((select prosrc like '%receipt_reminder%' from pg_catalog.pg_proc where oid = 'private.run_due_system_jobs(integer)'::regprocedure), 'worker dispatches receipt reminders');
select ok((select prosrc like '%receiptFollowUp%' from pg_catalog.pg_proc where oid = 'private.trade_dto(uuid,uuid)'::regprocedure), 'barter DTO exposes server follow-up state');
select ok((select prosrc like '%receiptFollowUp%' from pg_catalog.pg_proc where oid = 'private.order_dto(uuid,uuid)'::regprocedure), 'order DTO exposes server follow-up state');
select ok(exists (select 1 from pg_catalog.pg_index where indexrelid = 'system_jobs_due_idx'::regclass), 'receipt jobs use the due queue index');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'create_notification'), 'reminder uses in-app notifications');

select * from finish();
rollback;
