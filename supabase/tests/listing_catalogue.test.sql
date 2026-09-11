begin;
select plan(19);

select has_table('public', 'listings', 'listing lifecycle table exists');
select has_table('public', 'listing_modes', 'listing modes are normalized');
select has_table('private', 'listing_assets', 'asset ownership and processing state stay private');
select col_not_exists('public', 'listings', 'exact_point', 'public listing never stores exact user coordinates');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'seller@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '42000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'other@example.test', '', now(), now(), now());
update public.profiles set display_name = 'Penjual' where id = '41000000-0000-4000-8000-000000000001';
update public.profiles set display_name = 'Pengguna lain' where id = '42000000-0000-4000-8000-000000000002';
insert into public.service_areas(area_id, name, enabled, boundary_source, boundary_version) values ('listing-test-area', 'Listing Test Area', true, 'pgTAP fixture', 'test-only');
insert into private.service_area_boundaries(area_id, boundary) values ('listing-test-area', extensions.st_multi(extensions.st_geomfromtext('POLYGON((106.7 -6.5,106.9 -6.5,106.9 -6.2,106.7 -6.2,106.7 -6.5))', 4326)));
insert into private.user_locations(user_id, area_id, exact_point) values ('41000000-0000-4000-8000-000000000001', 'listing-test-area', extensions.st_setsrid(extensions.st_makepoint(106.82, -6.35), 4326)::extensions.geography);
insert into private.user_locations(user_id, area_id, exact_point) values ('42000000-0000-4000-8000-000000000002', 'listing-test-area', extensions.st_setsrid(extensions.st_makepoint(106.83, -6.34), 4326)::extensions.geography);
insert into private.phone_claims(user_id, phone_e164) values ('41000000-0000-4000-8000-000000000001', '+6281234500001');
insert into private.phone_claims(user_id, phone_e164) values ('42000000-0000-4000-8000-000000000002', '+6281234500002');
select private.refresh_onboarding('41000000-0000-4000-8000-000000000001');
select private.refresh_onboarding('42000000-0000-4000-8000-000000000002');
insert into private.listing_assets(asset_id, owner_id, state, processed_path, mime_type, byte_size, width, height, content_hash)
values ('43000000-0000-4000-8000-000000000003', '41000000-0000-4000-8000-000000000001', 'processed', 'processed/41000000/photo.webp', 'image/webp', 1024, 800, 600, repeat('a', 64));

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select is(
  public.save_listing_draft('{"listingId":null,"expectedVersion":null,"publisher":{"kind":"personal"},"modes":["sale"],"fulfillment":"ready_stock","categoryId":"","title":"","description":"","condition":null,"defects":"","negotiable":false,"barter":null,"basePriceRupiah":null,"variants":[],"assetIds":[],"handoverMethods":[],"preorder":null,"catering":null}'::jsonb)->>'lifecycle',
  'draft',
  'an incomplete listing can be saved only as draft'
);

select lives_ok(
  $$ select public.publish_listing('{"listingId":"44000000-0000-4000-8000-000000000004","expectedVersion":null,"publisher":{"kind":"personal"},"modes":["sale","barter"],"fulfillment":"ready_stock","categoryId":"clothing","title":"Kemeja batik","description":"Masih sangat layak dipakai oleh tetangga.","condition":"good","defects":"Tidak ada kekurangan yang diketahui.","negotiable":true,"barter":{"openToOffers":true,"wantedDescription":""},"basePriceRupiah":"150000","variants":[],"assetIds":["43000000-0000-4000-8000-000000000003"],"handoverMethods":["meetup"],"preorder":null,"catering":null}'::jsonb) $$,
  'a completed account publishes a valid personal sale plus barter listing'
);
select is((select lifecycle from public.listings where listing_id = '44000000-0000-4000-8000-000000000004'), 'active', 'published listing is active');
select set_eq($$ select mode from public.listing_modes where listing_id = '44000000-0000-4000-8000-000000000004' $$, array['sale', 'barter'], 'both modes persist once');
select is((select count(*)::integer from public.listing_assets where listing_id = '44000000-0000-4000-8000-000000000004'), 1, 'only processed owner media is attached');
select lives_ok(
  $$ select public.publish_listing('{"listingId":"45000000-0000-4000-8000-000000000005","expectedVersion":null,"publisher":{"kind":"personal"},"modes":["sale"],"fulfillment":"preorder","categoryId":"food","title":"Nasi kotak PO","description":"Nasi kotak rumahan untuk acara lingkungan.","condition":null,"defects":"","negotiable":false,"barter":null,"basePriceRupiah":"25000","variants":[],"assetIds":["43000000-0000-4000-8000-000000000003"],"handoverMethods":["pickup"],"preorder":{"orderClosesAt":"2099-01-01T00:00:00Z","fulfillmentAt":"2099-01-02T00:00:00Z","minimumQty":"10","quotaMode":"shared","sharedQuota":"100","dpPercent":"50"},"catering":null}'::jsonb) $$,
  'valid preorder terms can be published'
);
select is((select dp_percent::integer from public.preorder_batches where listing_id = '45000000-0000-4000-8000-000000000005' and state = 'open'), 50, 'preorder DP percentage persists');
select lives_ok(
  $$ select public.publish_listing('{"listingId":"46000000-0000-4000-8000-000000000006","expectedVersion":null,"publisher":{"kind":"personal"},"modes":["sale"],"fulfillment":"catering","categoryId":"food","title":"Catering rumahan","description":"Paket catering harian untuk keluarga sekitar.","condition":null,"defects":"","negotiable":false,"barter":null,"basePriceRupiah":"30000","variants":[],"assetIds":["43000000-0000-4000-8000-000000000003"],"handoverMethods":["delivery"],"preorder":null,"catering":{"minimumQty":"5","unit":"porsi","leadTimeHours":"24","serviceAreaIds":["listing-test-area"],"availabilityNotes":"Pesan sehari sebelumnya."}}'::jsonb) $$,
  'valid catering terms can be published'
);
select is((select minimum_qty from public.catering_terms where listing_id = '46000000-0000-4000-8000-000000000006'), 5, 'catering minimum quantity persists');
select throws_ok($$ update public.listings set title = 'Bypass' where listing_id = '44000000-0000-4000-8000-000000000004' $$, '42501', null, 'direct listing mutation is denied');
select throws_ok($$ select public.archive_listing('44000000-0000-4000-8000-000000000004', 0) $$, 'P0001', 'LISTING_VERSION_CONFLICT', 'stale owner command is rejected');

reset role;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '42000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_ok($$ select public.archive_listing('44000000-0000-4000-8000-000000000004', 2) $$, 'P0001', 'LISTING_NOT_OWNED', 'another user cannot archive the listing');
select throws_ok(
  $$ select public.publish_listing('{"listingId":null,"expectedVersion":null,"publisher":{"kind":"personal"},"modes":["free","sale"],"fulfillment":"ready_stock","categoryId":"other","title":"Barang gratis","description":"Barang gratis tanpa kewajiban pengganti.","condition":"good","defects":"Tidak ada.","negotiable":false,"barter":null,"basePriceRupiah":"1000","variants":[],"assetIds":[],"handoverMethods":["meetup"],"preorder":null,"catering":null}'::jsonb) $$,
  'P0001', 'LISTING_MODES_INVALID',
  'free cannot be combined with a priced mode'
);

reset role;
set local role anon;
select is((select count(*)::integer from public.listings where lifecycle = 'draft'), 0, 'anonymous users cannot read drafts');
select is((select count(*)::integer from public.listings where listing_id = '44000000-0000-4000-8000-000000000004'), 1, 'anonymous users can read active listing rows');

select * from finish();
rollback;
