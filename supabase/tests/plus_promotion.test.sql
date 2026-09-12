begin;
select plan(16);

select has_table('private', 'promotion_rotation', 'promotion rotation state is private');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'private.promotion_rotation'::regclass), 'promotion rotation has RLS enabled');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'promotion_rotation_count'), 'promotion counter cannot be negative');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'claim_promotion_ids'), 'promotion selection is server-owned');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'search_listings_command_legacy'), 'organic discovery logic remains reusable');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'search_listings_command'), 'discovery wrapper exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'search_listings'), 'public discovery RPC exists');
select ok(not has_function_privilege('anon', 'private.claim_promotion_ids(uuid[], integer)', 'execute'), 'anonymous users cannot claim rotation slots');
select ok(not has_function_privilege('authenticated', 'private.claim_promotion_ids(uuid[], integer)', 'execute'), 'authenticated users cannot claim rotation slots directly');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'store_public_visible'), 'promotion reuses public store visibility');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'billing_status'), 'Plus billing state remains server-owned');
select ok((select prokind = 'f' from pg_catalog.pg_proc where oid = 'private.claim_promotion_ids(uuid[], integer)'::regprocedure), 'promotion selector is a function, not browser data');
select ok((select provolatile = 'v' from pg_catalog.pg_proc where oid = 'private.claim_promotion_ids(uuid[], integer)'::regprocedure), 'promotion selector records rotation writes as volatile');
select ok((select provolatile = 'v' from pg_catalog.pg_proc where oid = 'private.search_listings_command(jsonb)'::regprocedure), 'search wrapper can advance fair rotation');
select ok(exists (select 1 from pg_catalog.pg_attribute where attrelid = 'private.promotion_rotation'::regclass and attname = 'served_count'), 'fairness counter is persisted per owner');
select ok(exists (select 1 from pg_catalog.pg_attribute where attrelid = 'private.promotion_rotation'::regclass and attname = 'last_served_at'), 'last served timestamp is persisted per owner');

select * from finish();
rollback;
