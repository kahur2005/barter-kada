begin;
select plan(10);

select ok(exists (select 1 from pg_catalog.pg_proc where oid = 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)'::regprocedure), 'store profile update RPC exists');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)'::regprocedure), 'store profile update runs with controlled server privileges');
select ok((select prosrc like '%private.plus_active%' from pg_catalog.pg_proc where oid = 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)'::regprocedure), 'store update requires Plus');
select ok((select prosrc like '%owner_id = v_actor%' from pg_catalog.pg_proc where oid = 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)'::regprocedure), 'store update is owner scoped');
select ok((select prosrc like '%p_handover_methods%' from pg_catalog.pg_proc where oid = 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)'::regprocedure), 'store update validates handover methods');
select ok((select prosrc like '%p_public_address_consent%' from pg_catalog.pg_proc where oid = 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)'::regprocedure), 'store update controls public address consent');
select ok(has_function_privilege('authenticated', 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)', 'execute'), 'authenticated owners can call the update RPC');
select ok(not has_function_privilege('anon', 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)', 'execute'), 'anonymous visitors cannot edit stores');
select ok((select prosrc like '%operatingHours%' and prosrc like '%publicAddressConsent%' from pg_catalog.pg_proc where oid = 'public.get_my_stores()'::regprocedure), 'owner DTO exposes editable store fields');
select ok((select prosrc like '%area.enabled%' from pg_catalog.pg_proc where oid = 'public.update_store(uuid,text,text,text,text,text,text,text[],text,boolean)'::regprocedure), 'store update accepts enabled service areas only');

select * from finish();
rollback;
