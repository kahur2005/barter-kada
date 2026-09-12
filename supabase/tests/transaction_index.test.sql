begin;
select plan(4);

select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'list_my_transactions'), 'transaction index RPC exists');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'public.list_my_transactions(text)'::regprocedure) = false, 'transaction index uses invoker visibility with participant RLS');
select ok(has_function_privilege('authenticated', 'public.list_my_transactions(text)', 'EXECUTE'), 'authenticated users can list their own transactions');
select ok(not has_function_privilege('anon', 'public.list_my_transactions(text)', 'EXECUTE'), 'anonymous visitors cannot list private transactions');

select * from finish();
rollback;
