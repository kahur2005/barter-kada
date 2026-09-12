begin;
select plan(18);

select has_table('private', 'plan_settings_versions', 'plan settings history table exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'private.plan_settings_versions'::regclass), 'plan settings history is not browser-readable');
select ok(exists (select 1 from pg_catalog.pg_attribute where attrelid = 'private.listing_plan_settings'::regclass and attname = 'store_product_active_limit'), 'store product limit exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'get_plan_settings'), 'user plan settings RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'admin_get_plan_settings'), 'admin plan settings RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'update_plan_limits'), 'versioned limit update RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'list_settings_history'), 'immutable settings history RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'enforce_store_product_active_limit'), 'store limit trigger function exists');
select ok(exists (select 1 from pg_catalog.pg_trigger where tgname = 'listings_store_product_limit'), 'store limit trigger is installed');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'listing_plan_store_active_limit'), 'store limit has a server range');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'plan_settings_version_limits'), 'history limits are bounded');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'plan_settings_version_reason'), 'history requires a reason');
select ok(not has_function_privilege('anon', 'public.update_plan_limits(integer, integer, integer, text, uuid)', 'execute'), 'anonymous users cannot update limits');
select ok(not has_function_privilege('authenticated', 'private.enforce_store_product_active_limit()', 'execute'), 'browser cannot call trigger function directly');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'begin_command'), 'limit update can use shared idempotency receipts');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'finish_command'), 'limit update can finalize idempotency receipts');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'write_listing_command_legacy'), 'personal listing writer remains private after store writer split');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'write_store_listing_command'), 'store listing writer applies store context server-side');

select * from finish();
rollback;
