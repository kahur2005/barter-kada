begin;
select plan(18);

select ok(exists (select 1 from pg_catalog.pg_attribute where attrelid = 'public.reviews'::regclass and attname = 'publish_after'), 'pending review has publication deadline');
select ok(exists (select 1 from pg_catalog.pg_attribute where attrelid = 'public.reviews'::regclass and attname = 'published_at'), 'published review has publication timestamp');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'reviews_status'), 'review lifecycle constraint exists');
select has_table('public', 'review_replies', 'review replies table exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.review_replies'::regclass), 'review replies have RLS');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'review_replies_once'), 'owner can reply only once');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'list_reviews'), 'public review list RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'reply_review'), 'owner reply RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'publish_due_reviews'), 'scheduled publication RPC exists');
select ok(not has_function_privilege('authenticated', 'public.publish_due_reviews()', 'execute'), 'browser cannot publish reviews directly');
select ok(has_function_privilege('service_role', 'public.publish_due_reviews()', 'execute'), 'scheduler role can publish due reviews');
select ok(not has_table_privilege('authenticated', 'public.review_replies', 'insert'), 'browser cannot insert replies directly');
select ok(not has_table_privilege('authenticated', 'public.review_replies', 'update'), 'browser cannot edit replies directly');
select ok(not has_table_privilege('authenticated', 'public.reviews', 'insert'), 'browser cannot insert reviews directly');
select ok(exists (select 1 from pg_catalog.pg_policy where polname = 'reviews_public_read' and polrelid = 'public.reviews'::regclass), 'review public read policy exists');
select ok(exists (select 1 from pg_catalog.pg_policy where polname = 'review_replies_public_read' and polrelid = 'public.review_replies'::regclass), 'reply public read policy exists');
select ok((select provolatile = 'v' from pg_catalog.pg_proc where oid = 'public.publish_due_reviews()'::regprocedure), 'publication worker is volatile');
select ok(exists (select 1 from pg_catalog.pg_index where indexrelid = 'reviews_publish_due_idx'::regclass), 'due review index exists');

select * from finish();
rollback;
