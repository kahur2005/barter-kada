begin;
select plan(11);

select has_function('public', 'get_my_listing', array['uuid'], 'owner listing detail RPC exists');
select is((select public from storage.buckets where id = 'listing-media'), false, 'processed media bucket remains private');

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'discover-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '62000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'discover-other@example.test', '', now(), now(), now());
update public.profiles set display_name = 'Bu Rina' where id = '61000000-0000-4000-8000-000000000001';
insert into public.service_areas(area_id, name, enabled, boundary_source, boundary_version)
values ('discover-test', 'Depok test', true, 'pgTAP fixture', 'test-only');
insert into private.service_area_boundaries(area_id, boundary)
values ('discover-test', extensions.st_multi(extensions.st_geomfromtext('POLYGON((106.7 -6.5,106.9 -6.5,106.9 -6.2,106.7 -6.2,106.7 -6.5))', 4326)));
insert into private.phone_claims(user_id, phone_e164) values ('61000000-0000-4000-8000-000000000001', '+6281234500011');
insert into public.listings(listing_id, owner_id, category_id, title, description, condition, defects, negotiable, fulfillment_kind, base_price_rupiah, lifecycle, availability, version, area_id, area_label, published_at)
values
  ('63000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000001', 'food', 'Nasi kotak tetangga', 'Masakan rumahan untuk kegiatan warga.', null, '', false, 'ready_stock', 25000, 'active', 'available', 3, 'discover-test', 'Depok test', now()),
  ('64000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000001', 'home', 'Draft privat', 'Belum boleh terlihat oleh publik.', 'good', 'Tidak ada.', false, 'ready_stock', 10000, 'draft', 'available', 1, null, null, null);
insert into public.listing_modes(listing_id, mode) values ('63000000-0000-4000-8000-000000000003', 'sale'), ('64000000-0000-4000-8000-000000000004', 'sale');
insert into public.listing_fulfillment_options(listing_id, method) values ('63000000-0000-4000-8000-000000000003', 'pickup');

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(public.get_my_listing('63000000-0000-4000-8000-000000000003')->>'title', 'Nasi kotak tetangga', 'owner can load an existing listing');
select is((public.get_my_listing('63000000-0000-4000-8000-000000000003')->>'expectedVersion')::integer, 3, 'owner edit payload carries optimistic version');

reset role;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(public.get_my_listing('63000000-0000-4000-8000-000000000003'), null, 'another account cannot load owner edit data');

reset role;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select is(jsonb_array_length(public.search_listings('{"query":"nasi","areaId":"discover-test","radiusKm":5,"category":null,"mode":null,"fulfillment":null,"minPrice":null,"maxPrice":null,"sort":"relevance","cursor":null}'::jsonb)->'items'), 1, 'public search returns a matching active nearby listing');
select is(jsonb_array_length(public.search_listings('{"query":"","areaId":"discover-test","radiusKm":5,"category":null,"mode":"barter","fulfillment":null,"minPrice":null,"maxPrice":null,"sort":"newest","cursor":null}'::jsonb)->'items'), 0, 'mode filter is enforced');
select is(public.get_listing('63000000-0000-4000-8000-000000000003')->'publisher'->>'phoneVerified', 'true', 'public trust signal is accurate without returning the phone number');
select ok(not (public.get_listing('63000000-0000-4000-8000-000000000003')->'publisher' ? 'phone'), 'public listing excludes phone data');
select is(public.get_listing('64000000-0000-4000-8000-000000000004'), null, 'draft detail is not public');
select is(jsonb_array_length(public.search_stores('{}'::jsonb)->'items'), 0, 'store discovery stays honestly empty before Plus stores exist');

select * from finish();
rollback;
