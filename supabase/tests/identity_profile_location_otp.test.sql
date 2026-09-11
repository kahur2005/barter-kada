begin;
select plan(19);

select has_schema('private', 'private schema exists');
select has_table('public', 'profiles', 'safe public profiles exist');
select has_table('public', 'service_areas', 'safe public service areas exist');
select has_table('private', 'user_locations', 'exact locations stay private');
select has_table('private', 'phone_claims', 'phone claims stay private');
select has_table('private', 'otp_challenges', 'OTP material stays private');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rina@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'budi@example.test', '', now(), now(), now());

insert into public.service_areas (area_id, name, enabled, boundary_source, boundary_version)
values ('test-depok', 'Test Depok', true, 'pgTAP synthetic fixture', 'test-only');
insert into private.service_area_boundaries (area_id, boundary)
values ('test-depok', extensions.st_multi(extensions.st_geomfromtext('POLYGON((106.7 -6.5,106.9 -6.5,106.9 -6.2,106.7 -6.2,106.7 -6.5))', 4326)));

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$ select public.complete_profile('Rina', 'Masakan rumahan') $$,
  'owner completes a public profile through the command'
);
select is((select display_name from public.profiles where id = auth.uid()), 'Rina', 'profile command changes only the actor profile');
select throws_ok(
  $$ update public.profiles set display_name = 'Bypass' where id = auth.uid() $$,
  '42501', null,
  'authenticated users cannot bypass the profile command'
);
select lives_ok(
  $$ select public.set_location('test-depok', -6.35, 106.82, 'Privat') $$,
  'owner stores a point inside the enabled service area'
);
select throws_ok(
  $$ select public.set_location('test-depok', -6.0, 107.0, null) $$,
  'P0001', 'LOCATION_OUTSIDE_SERVICE_AREA',
  'publishing outside the enabled polygon is rejected'
);

reset role;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select is_empty(
  $$ select * from private.user_locations where user_id = '10000000-0000-4000-8000-000000000001' $$,
  'one user cannot read another exact location'
);
select throws_ok(
  $$ update private.account_state set account_status = 'active' $$,
  '42501', null,
  'authenticated users cannot directly change account state'
);
select is((public.get_my_onboarding()->>'nextStep'), 'profile', 'new account starts at profile onboarding');

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;

select lives_ok(
  $$ select public.otp_create_challenge(
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '+6281234567890', 'register', repeat('a', 64), repeat('b', 64)
  ) $$,
  'service role atomically creates an OTP challenge'
);
select is(
  public.otp_record_delivery('30000000-0000-4000-8000-000000000003', 'accepted', 'provider-ref')->>'deliveryStatus',
  'accepted',
  'service records provider acceptance without calling it delivery'
);
select is(
  public.otp_verify_challenge('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', repeat('c', 64))->>'status',
  'wrong_code',
  'wrong digest is rejected and counted'
);
select is(
  public.otp_verify_challenge('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', repeat('a', 64))->>'status',
  'verified',
  'matching digest verifies and consumes the challenge'
);
select is(
  public.otp_verify_challenge('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', repeat('a', 64))->>'status',
  'used',
  'a consumed challenge cannot be replayed'
);

select * from finish();
rollback;
