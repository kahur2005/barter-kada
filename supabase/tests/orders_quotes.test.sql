begin;
select plan(15);

select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'order_revisions', 'immutable order quote revisions exist');
select has_table('public', 'order_items', 'order item snapshots exist');
select has_table('public', 'order_inventory_pools', 'order inventory pools exist');
select has_table('public', 'order_payment_obligations', 'manual payment obligations exist');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'create_order_quote'), 'seller quote RPC exists');

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'order-seller@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'a2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'order-buyer@example.test', '', now(), now());
update public.profiles set display_name = case id when 'a1000000-0000-4000-8000-000000000001' then 'Penjual order' else 'Pembeli order' end where id in ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002');
update private.account_state set account_status = 'active', onboarding_step = 'complete' where user_id in ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002');
insert into public.service_areas(area_id, name, enabled, boundary_source, boundary_version) values ('order-test', 'Order test', true, 'pgTAP fixture', 'test-only');
insert into public.listings(listing_id, owner_id, category_id, title, description, condition, defects, negotiable, fulfillment_kind, base_price_rupiah, lifecycle, availability, version, area_id, area_label, published_at)
values ('a3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'home', 'Meja lipat', 'Meja untuk rumah.', 'good', '', false, 'ready_stock', 100000, 'active', 'available', 1, 'order-test', 'Order test', now());
insert into public.listing_modes(listing_id, mode) values ('a3000000-0000-4000-8000-000000000003', 'sale');
insert into public.conversations(conversation_id, listing_id, user_low, user_high) values ('a4000000-0000-4000-8000-000000000004', 'a3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002');
insert into public.conversation_members(conversation_id, user_id) values ('a4000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001'), ('a4000000-0000-4000-8000-000000000004', 'a2000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select set_config('test.order', (public.create_order_quote('a4000000-0000-4000-8000-000000000004', '[{"quantity":2}]'::jsonb, 'meetup', 'Lobi perumahan', '10000', 50, now() + interval '2 days', 'Ringkasan awal', 'a5000000-0000-4000-8000-000000000005')->>'id'), true);
select ok(current_setting('test.order')::uuid is not null, 'seller can create a quote from a listing conversation');
select is((public.get_order(current_setting('test.order')::uuid)->'terms'->>'totalRupiah'), '210000', 'server snapshots subtotal plus shipping');
select is((public.get_order(current_setting('test.order')::uuid)->>'lifecycle'), 'quoted', 'quote waits for buyer confirmation');
select throws_ok($$ select public.mark_order_processing(current_setting('test.order')::uuid, 1, 'a6000000-0000-4000-8000-000000000006') $$, '42501', 'ORDER_SELLER_REQUIRED', 'buyer role is not silently assumed by seller action');

reset role;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((public.confirm_order(current_setting('test.order')::uuid, 1, 'a7000000-0000-4000-8000-000000000007')->>'lifecycle'), 'awaiting_dp', 'buyer confirmation holds inventory and waits for manual DP');
select is((select count(*) from public.order_reservations where order_id = current_setting('test.order')::uuid and state = 'held'), 1::bigint, 'confirmation creates one held reservation');
select throws_ok($$ select public.acknowledge_order_payment(current_setting('test.order')::uuid, 1, 'dp', 'a8000000-0000-4000-8000-000000000008') $$, '42501', 'ORDER_PAYEE_REQUIRED', 'buyer cannot acknowledge seller payment');

reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((public.acknowledge_order_payment(current_setting('test.order')::uuid, 1, 'dp', 'a9000000-0000-4000-8000-000000000009')->>'lifecycle'), 'awaiting_dp', 'seller can acknowledge manual DP');
select is((public.mark_order_processing(current_setting('test.order')::uuid, 1, 'aa000000-0000-4000-8000-00000000000a')->>'lifecycle'), 'processing', 'processing is blocked until DP is acknowledged');
select is((public.mark_order_ready(current_setting('test.order')::uuid, 1, 'ab000000-0000-4000-8000-00000000000b')->>'lifecycle'), 'ready', 'seller can mark order ready');
select is((public.mark_order_handed_over(current_setting('test.order')::uuid, 1, 'ac000000-0000-4000-8000-00000000000c')->>'lifecycle'), 'awaiting_receipt', 'seller handover is separate from buyer receipt');

reset role;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((public.confirm_order_received(current_setting('test.order')::uuid, 1, 'ad000000-0000-4000-8000-00000000000d')->>'lifecycle'), 'awaiting_receipt', 'buyer receipt waits for remaining balance');

reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((public.acknowledge_order_payment(current_setting('test.order')::uuid, 1, 'balance', 'ae000000-0000-4000-8000-00000000000e')->>'lifecycle'), 'completed', 'balance acknowledgement completes the order after receipt');
select is((select count(*) from public.order_reservations where order_id = current_setting('test.order')::uuid and state = 'consumed'), 1::bigint, 'completed order consumes its held reservation');
select throws_ok($$ update public.orders set lifecycle = 'cancelled' where order_id = current_setting('test.order')::uuid $$, '42501', null, 'browser cannot mutate order lifecycle directly');

select * from finish();
rollback;
