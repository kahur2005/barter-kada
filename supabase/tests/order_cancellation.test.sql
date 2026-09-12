begin;
select plan(17);

select has_table('public', 'order_cancellation_requests', 'order cancellation requests table exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.order_cancellation_requests'::regclass), 'cancellation requests have RLS');
select ok(exists (select 1 from pg_catalog.pg_index where indexrelid = 'order_cancel_request_active_uidx'::regclass), 'one pending cancellation per order');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'order_cancel_request_decision'), 'decision fields are consistent');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'cancel_order'), 'pre-processing cancellation RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'request_order_cancellation'), 'post-processing request RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'respond_order_cancellation'), 'seller decision RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'release_order_holds'), 'cancellation releases held inventory server-side');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'order_cancellation_json'), 'order DTO exposes scoped cancellation request');
select ok(not has_table_privilege('authenticated', 'public.order_cancellation_requests', 'insert'), 'browser cannot insert cancellation requests directly');
select ok(not has_table_privilege('authenticated', 'public.order_cancellation_requests', 'update'), 'browser cannot decide cancellation directly');
select ok(not has_function_privilege('anon', 'public.cancel_order(uuid, integer, text, uuid)', 'execute'), 'anonymous users cannot cancel orders');
select ok(not has_function_privilege('authenticated', 'private.release_order_holds(uuid)', 'execute'), 'browser cannot release reservations directly');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'order_begin_command'), 'cancellation uses idempotency receipts');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'order_finish_command'), 'cancellation finalizes idempotency receipts');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'order_dto_base'), 'existing order projection remains reusable');
select ok(not has_function_privilege('authenticated', 'private.order_dto_base(uuid, uuid)', 'execute'), 'base projection is not exposed directly');

select * from finish();
rollback;
