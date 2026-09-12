begin;
select plan(17);

select has_table('public', 'subscriptions', 'Plus entitlement table exists');
select has_table('public', 'billing_orders', 'dummy billing orders table exists');
select has_table('public', 'stores', 'optional stores table exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'create_store'), 'store creation RPC exists');

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'b1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'plus-owner@example.test', '', now(), now(), now());
update public.profiles set display_name = 'Pemilik Plus' where id = 'b1000000-0000-4000-8000-000000000001';
update private.account_state set account_status = 'active', onboarding_step = 'complete' where user_id = 'b1000000-0000-4000-8000-000000000001';
insert into public.service_areas(area_id, name, enabled, boundary_source, boundary_version) values ('plus-test', 'Plus test', true, 'pgTAP fixture', 'test-only');

select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((public.get_plus_status()->>'active'), 'false', 'Plus is inactive before dummy invoice success');
select set_config('test.invoice', (public.create_plus_billing_order('qris')->>'id'), true);
select is((select status from public.billing_orders where billing_order_id = current_setting('test.invoice')::uuid), 'pending', 'dummy invoice starts pending');
select is((public.simulate_plus_billing(current_setting('test.invoice')::uuid, 'succeeded')->>'status'), 'succeeded', 'dummy success activates Plus');
select is((public.get_plus_status()->>'active'), 'true', 'server reports active Plus entitlement');
select is((public.create_store('dapur-rina', 'Dapur Rina', 'Menu rumahan.', 'Makanan', 'plus-test', 'Plus test', 'Senin-Sabtu', array['meetup']::text[], null, false)->>'name'), 'Dapur Rina', 'Plus account can create a store');
select is(jsonb_array_length(public.get_my_stores()), 1, 'owner can read own stores');
select is((public.get_my_stores()->0->>'activeProductCount'), '0', 'new store reports zero active products');
select set_config('test.store', (public.get_my_stores()->0->>'id'), true);
select is((public.update_store(current_setting('test.store')::uuid, 'Dapur Rina Baru', 'Menu terbaru.', 'Makanan', 'plus-test', 'Label palsu', 'Setiap hari', array['pickup','meetup']::text[], 'Jalan contoh', true)->>'name'), 'Dapur Rina Baru', 'owner can update store profile');
select is((public.get_my_stores()->0->>'areaLabel'), 'Plus test', 'server keeps the service-area label authoritative');
select lives_ok($$ select public.create_store('po-rina', 'PO Rina', 'Preorder.', 'Makanan', 'plus-test', 'Plus test', 'Senin-Sabtu', array['pickup']::text[], null, false) $$, 'second store is within quota');
select lives_ok($$ select public.create_store('preloved-rina', 'Preloved Rina', 'Barang preloved.', 'Preloved', 'plus-test', 'Plus test', 'Sabtu', array['meetup']::text[], null, false) $$, 'third store is within quota');
select throws_ok($$ select public.create_store('keempat', 'Toko keempat', 'Tidak boleh.', 'Lainnya', 'plus-test', 'Plus test', 'Sabtu', array['meetup']::text[], null, false) $$, 'P0001', 'STORE_LIMIT_REACHED', 'fourth store is rejected by server quota');
select throws_ok($$ update public.stores set name = 'Dipalsukan' where owner_id = 'b1000000-0000-4000-8000-000000000001' $$, '42501', null, 'browser cannot mutate store directly');

select * from finish();
rollback;
