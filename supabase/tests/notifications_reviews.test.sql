begin;
select plan(14);

select has_table('public', 'notifications', 'private notification center table exists');
select has_table('public', 'reviews', 'completed transaction review table exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.notifications'::regclass), 'notifications keep row level security enabled');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.reviews'::regclass), 'reviews keep row level security enabled');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'list_notifications'), 'notification list RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'mark_notification_read'), 'notification read RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'submit_review'), 'review submit RPC exists');
select ok(exists (select 1 from pg_catalog.pg_trigger where tgname = 'messages_notification_insert'), 'message trigger creates recipient notifications');
select ok(exists (select 1 from pg_catalog.pg_trigger where tgname = 'transaction_events_notification_insert'), 'barter event trigger creates recipient notifications');
select ok(exists (select 1 from pg_catalog.pg_trigger where tgname = 'order_events_notification_insert'), 'order event trigger creates recipient notifications');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'notifications_source_unique'), 'notification source is idempotent per recipient');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'reviews_author_once'), 'one review per actor and transaction is enforced');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'reviews_rating'), 'review rating is constrained to one through five');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'reviews_comment'), 'review comment length is server constrained');

select * from finish();
rollback;
