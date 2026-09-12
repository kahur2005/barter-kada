begin;
select plan(8);

select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'list_my_transactions'), 'transaction index RPC exists');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'public.list_my_transactions(text)'::regprocedure) = true, 'transaction index can read historical publisher context through a definer projection');
select ok((select coalesce(array_to_string(proconfig, ','), '') like '%search_path=%'), 'transaction index pins its search path');
select ok((select pg_get_functiondef('public.list_my_transactions(text)'::regprocedure) like '%auth.uid()%' and pg_get_functiondef('public.list_my_transactions(text)'::regprocedure) like '%party_a%' and pg_get_functiondef('public.list_my_transactions(text)'::regprocedure) like '%buyer_id%'), 'transaction index enforces participant predicates');
select ok((select pg_get_functiondef('public.list_my_transactions(text)'::regprocedure) like '%publisher_kind%' and pg_get_functiondef('public.list_my_transactions(text)'::regprocedure) like '%publisher_name%' and pg_get_functiondef('public.list_my_transactions(text)'::regprocedure) like '%action_required%' and pg_get_functiondef('public.list_my_transactions(text)'::regprocedure) like '%bucket%'), 'transaction index returns role, publisher, action, and bucket context');
select ok((select pg_get_functiondef('public.list_my_transactions(text)'::regprocedure) not like '%auth.role()%'), 'transaction index does not rely on deprecated auth role checks');
select ok(has_function_privilege('authenticated', 'public.list_my_transactions(text)', 'EXECUTE'), 'authenticated users can list their own transactions');
select ok(not has_function_privilege('anon', 'public.list_my_transactions(text)', 'EXECUTE'), 'anonymous visitors cannot list private transactions');

select * from finish();
rollback;
