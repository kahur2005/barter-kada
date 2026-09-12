begin;
select plan(26);

select has_table('public', 'transactions', 'barter transactions table exists');
select has_table('public', 'transaction_revisions', 'immutable revisions table exists');
select has_table('public', 'transaction_items', 'snapshot items table exists');
select has_table('public', 'transaction_consents', 'versioned consent table exists');
select has_table('public', 'inventory_pools', 'inventory pools table exists');
select has_table('public', 'reservations', 'reservations table exists');
select has_table('public', 'transaction_events', 'transaction events table exists');
select ok(exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transaction_events'), 'trade events are published after commit');

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'trade-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'trade-buyer@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e3000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'trade-stranger@example.test', '', now(), now(), now());
update public.profiles set display_name = case id when 'e1000000-0000-4000-8000-000000000001' then 'Pemilik rak' when 'e2000000-0000-4000-8000-000000000002' then 'Penawar jaket' else 'Orang lain' end where id in ('e1000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000003');
update private.account_state set account_status = 'active', onboarding_step = 'complete' where user_id in ('e1000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000003');
insert into public.service_areas(area_id, name, enabled, boundary_source, boundary_version) values ('trade-test', 'Area barter test', true, 'pgTAP fixture', 'test-only');

insert into public.listings(listing_id, owner_id, category_id, title, description, condition, defects, negotiable, barter_open_to_offers, barter_wanted_description, fulfillment_kind, lifecycle, availability, version, area_id, area_label, published_at)
values
  ('e4000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000001', 'home', 'Rak buku', 'Rak buku kayu untuk ruang kerja.', 'good', 'Goresan di sisi kanan.', false, true, 'Jaket atau tas.', 'ready_stock', 'active', 'available', 4, 'trade-test', 'Area barter test', now()),
  ('e5000000-0000-4000-8000-000000000005', 'e2000000-0000-4000-8000-000000000002', 'clothing', 'Jaket denim', 'Jaket denim nyaman dipakai.', 'good', 'Noda kecil di lengan.', false, true, 'Rak buku.', 'ready_stock', 'active', 'available', 2, 'trade-test', 'Area barter test', now());
insert into public.listing_modes(listing_id, mode) values ('e4000000-0000-4000-8000-000000000004', 'barter'), ('e5000000-0000-4000-8000-000000000005', 'barter');
insert into private.listing_assets(asset_id, owner_id, state, processed_path, mime_type, byte_size, width, height, content_hash, processed_at)
values
  ('e6000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000001', 'processed', 'e1000000-0000-4000-8000-000000000001/e6000000-0000-4000-8000-000000000006.webp', 'image/webp', 100, 640, 480, repeat('a', 64), now()),
  ('e7000000-0000-4000-8000-000000000007', 'e2000000-0000-4000-8000-000000000002', 'processed', 'e2000000-0000-4000-8000-000000000002/e7000000-0000-4000-8000-000000000007.webp', 'image/webp', 100, 640, 480, repeat('b', 64), now());
insert into public.listing_assets(listing_id, asset_id, position) values ('e4000000-0000-4000-8000-000000000004', 'e6000000-0000-4000-8000-000000000006', 0), ('e5000000-0000-4000-8000-000000000005', 'e7000000-0000-4000-8000-000000000007', 0);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select set_config('test.trade', (public.create_trade('e4000000-0000-4000-8000-000000000004', '[{"clientId":"buyer-jacket","source":"listing","listingId":"e5000000-0000-4000-8000-000000000005"}]'::jsonb, '{"payerId":"e2000000-0000-4000-8000-000000000002","amountRupiah":"50000"}'::jsonb, 'e8000000-0000-4000-8000-000000000008')->>'id'), true);
select ok(current_setting('test.trade')::uuid is not null, 'buyer can create a listing-scoped barter');
select is((public.get_trade(current_setting('test.trade')::uuid)->>'revision')::integer, 1, 'new barter starts at revision one');
select is((select count(*) from public.transaction_items item join public.transaction_revisions revision on revision.revision_id = item.revision_id where revision.transaction_id = current_setting('test.trade')::uuid and revision.revision = 1), 2::bigint, 'both parties have one immutable item snapshot');
select is((public.mark_trade_ready(current_setting('test.trade')::uuid, 1, 'e9000000-0000-4000-8000-000000000009')->'readiness'->>'actor'), 'true', 'buyer can mark the current revision ready');

reset role;
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((public.mark_trade_ready(current_setting('test.trade')::uuid, 1, 'ea000000-0000-4000-8000-00000000000a')->'readiness'->>'actor'), 'true', 'owner can mark the same revision ready');
select is((public.revise_trade(current_setting('test.trade')::uuid, 1, '[{"clientId":"owner-rereview","source":"listing","listingId":"e4000000-0000-4000-8000-000000000004"}]'::jsonb, '{"payerId":"e2000000-0000-4000-8000-000000000002","amountRupiah":"50000"}'::jsonb, 'Foto rak diperbarui.', 'eb000000-0000-4000-8000-00000000000b')->>'revision')::integer, 2, 'revising an offer creates a new immutable revision');
select is((select count(*) from public.transaction_consents where transaction_id = current_setting('test.trade')::uuid and revision = 2 and ready_at is not null), 0::bigint, 'revision change resets both ready states');
select throws_ok($$ select public.approve_trade(current_setting('test.trade')::uuid, 1, 'ec000000-0000-4000-8000-00000000000c') $$, 'P0001', 'REVISION_CONFLICT', 'approval of an old revision is rejected');
select is((public.mark_trade_ready(current_setting('test.trade')::uuid, 2, 'ed000000-0000-4000-8000-00000000000d')->'readiness'->>'actor'), 'true', 'owner can ready the revised package');
select is((public.approve_trade(current_setting('test.trade')::uuid, 2, 'ee000000-0000-4000-8000-00000000000e')->'approvals'->>'actor'), 'true', 'first approval waits for the counterpart');

reset role;
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((public.mark_trade_ready(current_setting('test.trade')::uuid, 2, 'ef000000-0000-4000-8000-00000000000f')->'readiness'->>'actor'), 'true', 'buyer rechecks the revised package');
select is((public.approve_trade(current_setting('test.trade')::uuid, 2, 'f0000000-0000-4000-8000-000000000010')->>'lifecycle'), 'agreed', 'second approval agrees and reserves atomically');
select is((select count(*) from public.reservations where transaction_id = current_setting('test.trade')::uuid and state = 'held'), 2::bigint, 'both linked listings are held by the agreed barter');
select is((select count(*) from public.inventory_pools where held = 1 and consumed = 0), 2::bigint, 'inventory pool counters reflect both holds');
select is((public.approve_trade(current_setting('test.trade')::uuid, 2, 'f0000000-0000-4000-8000-000000000010')->>'lifecycle'), 'agreed', 'retrying the final approval key returns the committed result');
select is((public.confirm_trade_received(current_setting('test.trade')::uuid, 2, 'f1000000-0000-4000-8000-000000000011')->>'lifecycle'), 'agreed', 'one physical inspection does not complete the trade');

reset role;
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((public.confirm_trade_received(current_setting('test.trade')::uuid, 2, 'f2000000-0000-4000-8000-000000000012')->>'lifecycle'), 'agreed', 'both receipts still wait for top-up acknowledgement');
reset role;
select set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_ok($$ select public.acknowledge_trade_topup(current_setting('test.trade')::uuid, 2, 'f3000000-0000-4000-8000-000000000013') $$, '42501', 'TOPUP_PAYEE_REQUIRED', 'payer cannot acknowledge their own top-up');
reset role;
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((public.acknowledge_trade_topup(current_setting('test.trade')::uuid, 2, 'f4000000-0000-4000-8000-000000000014')->>'lifecycle'), 'completed', 'payee acknowledgement completes the fully received trade');
select is((select count(*) from public.reservations where transaction_id = current_setting('test.trade')::uuid and state = 'held'), 0::bigint, 'completion releases held state into consumed state');
select is((select count(*) from public.reservations where transaction_id = current_setting('test.trade')::uuid and state = 'consumed'), 2::bigint, 'both reservations become consumed');
select is((select count(*) from public.listings where listing_id in ('e4000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000005') and availability = 'completed'), 2::bigint, 'linked listings are completed after handover');
select throws_ok($$ update public.transactions set lifecycle = 'cancelled' where transaction_id = current_setting('test.trade')::uuid $$, '42501', null, 'browser cannot mutate transaction lifecycle directly');

reset role;
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select is(public.get_trade(current_setting('test.trade')::uuid), null, 'non-participant cannot read the trade DTO');
select throws_ok($$ select public.cancel_trade(current_setting('test.trade')::uuid, 2, 'Terlambat dibatalkan', gen_random_uuid()) $$, '42501', 'TRADE_FORBIDDEN', 'non-participant cannot cancel a trade');

select * from finish();
rollback;
