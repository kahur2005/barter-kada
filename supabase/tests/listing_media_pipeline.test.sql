begin;
select plan(8);

select results_eq($$ select count(*) from storage.buckets where id = 'listing-quarantine' $$, $$ values (1::bigint) $$, 'quarantine storage bucket exists');
select results_eq($$ select count(*) from storage.buckets where id = 'listing-media' $$, $$ values (1::bigint) $$, 'processed media storage bucket exists');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'media-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '52000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'media-other@example.test', '', now(), now(), now());

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select set_config('test.listing_asset', public.reserve_listing_asset('image/png', 1024)::text, true);
select matches(
  current_setting('test.listing_asset')::jsonb->>'quarantinePath',
  '^51000000-0000-4000-8000-000000000001/[0-9a-f-]+/source$',
  'owner receives a scoped quarantine path'
);
select throws_ok($$ select public.reserve_listing_asset('text/html', 100) $$, 'P0001', 'LISTING_ASSET_INVALID', 'unsupported claimed media type is rejected');
select throws_ok($$ select public.reserve_listing_asset('image/png', 5242881) $$, 'P0001', 'LISTING_ASSET_INVALID', 'oversized claimed media is rejected');
select throws_ok($$ select count(*) from private.listing_assets $$, '42501', null, 'authenticated browser cannot inspect private media rows');

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select is(
  public.get_listing_asset_processing_context(
    (current_setting('test.listing_asset')::jsonb->>'assetId')::uuid,
    '52000000-0000-4000-8000-000000000002'
  ),
  null,
  'processor cannot claim an asset for a different actor'
);
select isnt(
  public.get_listing_asset_processing_context(
    (current_setting('test.listing_asset')::jsonb->>'assetId')::uuid,
    '51000000-0000-4000-8000-000000000001'
  ),
  null,
  'processor can atomically claim the owner asset'
);

select * from finish();
rollback;
