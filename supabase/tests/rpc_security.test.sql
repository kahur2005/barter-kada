begin;
select plan(4);

select ok((select prosecdef from pg_catalog.pg_proc where oid = 'public.mark_notification_read(uuid)'::regprocedure), 'mark notification read writes through a security-definer RPC');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'public.create_plus_billing_order(text)'::regprocedure), 'Plus invoice creation writes through a security-definer RPC');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'public.simulate_plus_billing(uuid,text)'::regprocedure), 'dummy billing simulation writes through a security-definer RPC');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'public.create_store(text,text,text,text,text,text,text,text[],text,boolean)'::regprocedure), 'store creation writes through a security-definer RPC');

select * from finish();
rollback;
