create extension if not exists postgis with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  bio text,
  avatar_asset_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint profiles_display_name_length check (char_length(display_name) <= 80),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 500)
);

create table public.service_areas (
  area_id text primary key,
  name text not null,
  enabled boolean not null default false,
  boundary_source text not null,
  boundary_version text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint service_areas_id_format check (area_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint service_areas_name_length check (char_length(name) between 2 and 100),
  constraint service_areas_source_length check (char_length(boundary_source) between 2 and 300),
  constraint service_areas_version_length check (char_length(boundary_version) between 1 and 100)
);

create table private.service_area_boundaries (
  area_id text primary key references public.service_areas(area_id) on delete cascade,
  boundary extensions.geometry(multipolygon, 4326) not null
);
create index service_area_boundaries_boundary_gix on private.service_area_boundaries using gist (boundary);

create table private.account_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_status text not null default 'pending',
  onboarding_step text not null default 'profile',
  restriction_reason text,
  updated_at timestamptz not null default statement_timestamp(),
  constraint account_state_status check (account_status in ('pending', 'active', 'restricted', 'banned')),
  constraint account_state_onboarding_step check (onboarding_step in ('profile', 'location', 'phone', 'complete')),
  constraint account_state_reason_length check (restriction_reason is null or char_length(restriction_reason) <= 500)
);

create table private.user_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  area_id text not null references public.service_areas(area_id),
  exact_point extensions.geography(point, 4326) not null,
  address text,
  updated_at timestamptz not null default statement_timestamp(),
  constraint user_locations_address_length check (address is null or char_length(address) <= 300)
);
create index user_locations_area_id_idx on private.user_locations(area_id);
create index user_locations_exact_point_gix on private.user_locations using gist (exact_point);

create table private.phone_claims (
  claim_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_e164 text not null,
  verified_at timestamptz not null default statement_timestamp(),
  revoked_at timestamptz,
  constraint phone_claims_e164 check (phone_e164 ~ '^\+628[1-9][0-9]{7,10}$'),
  constraint phone_claims_revocation_order check (revoked_at is null or revoked_at >= verified_at)
);
create unique index phone_claims_active_phone_uidx on private.phone_claims(phone_e164) where revoked_at is null;
create unique index phone_claims_active_user_uidx on private.phone_claims(user_id) where revoked_at is null;
create index phone_claims_user_id_idx on private.phone_claims(user_id);

create table private.otp_policy (
  singleton boolean primary key default true,
  code_length smallint not null default 6,
  expires_seconds integer not null default 300,
  resend_seconds integer not null default 60,
  max_attempts smallint not null default 5,
  max_sends_per_hour smallint not null default 5,
  constraint otp_policy_singleton check (singleton),
  constraint otp_policy_code_length check (code_length = 6),
  constraint otp_policy_expiry check (expires_seconds between 60 and 900),
  constraint otp_policy_resend check (resend_seconds between 30 and 300),
  constraint otp_policy_attempts check (max_attempts between 3 and 10),
  constraint otp_policy_sends check (max_sends_per_hour between 2 and 10)
);
insert into private.otp_policy(singleton) values (true);

create table private.otp_challenges (
  challenge_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_e164 text not null,
  purpose text not null,
  code_digest text not null,
  ip_hash text not null,
  delivery_status text not null default 'pending',
  provider_reference text,
  failed_attempts smallint not null default 0,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  resend_at timestamptz not null,
  consumed_at timestamptz,
  constraint otp_challenges_phone check (phone_e164 ~ '^\+628[1-9][0-9]{7,10}$'),
  constraint otp_challenges_purpose check (purpose in ('register', 'change_phone')),
  constraint otp_challenges_digest check (code_digest ~ '^[a-f0-9]{64}$'),
  constraint otp_challenges_ip_hash check (ip_hash ~ '^[a-f0-9]{64}$'),
  constraint otp_challenges_delivery check (delivery_status in ('pending', 'accepted', 'failed', 'unknown')),
  constraint otp_challenges_reference_length check (provider_reference is null or char_length(provider_reference) <= 200),
  constraint otp_challenges_attempts check (failed_attempts >= 0),
  constraint otp_challenges_time_order check (expires_at > created_at and resend_at > created_at and resend_at <= expires_at),
  constraint otp_challenges_consumed_order check (consumed_at is null or consumed_at >= created_at)
);
create index otp_challenges_user_created_idx on private.otp_challenges(user_id, created_at desc);
create index otp_challenges_expires_idx on private.otp_challenges(expires_at) where consumed_at is null;

alter table public.profiles enable row level security;
alter table public.service_areas enable row level security;
alter table private.service_area_boundaries enable row level security;
alter table private.account_state enable row level security;
alter table private.user_locations enable row level security;
alter table private.phone_claims enable row level security;
alter table private.otp_policy enable row level security;
alter table private.otp_challenges enable row level security;

create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
create policy service_areas_enabled_read on public.service_areas for select to anon, authenticated using (enabled);
create policy account_state_owner_read on private.account_state for select to authenticated using ((select auth.uid()) = user_id);
create policy user_locations_owner_read on private.user_locations for select to authenticated using ((select auth.uid()) = user_id);
create policy phone_claims_owner_read on private.phone_claims for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.service_areas from public, anon, authenticated;
grant select on public.profiles, public.service_areas to anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
grant select on private.account_state, private.user_locations, private.phone_claims to authenticated;

create or replace function private.onboarding_for_actor(p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nextStep', coalesce(s.onboarding_step, 'profile'),
    'displayName', coalesce(p.display_name, ''),
    'bio', p.bio,
    'areaId', l.area_id,
    'maskedPhone', case when c.phone_e164 is null then null else '+62••••' || right(c.phone_e164, 4) end,
    'phoneVerified', c.phone_e164 is not null
  )
  from (select p_actor as user_id) actor
  left join private.account_state s on s.user_id = actor.user_id
  left join public.profiles p on p.id = actor.user_id
  left join private.user_locations l on l.user_id = actor.user_id
  left join private.phone_claims c on c.user_id = actor.user_id and c.revoked_at is null
$$;

create or replace function private.refresh_onboarding(p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step text;
begin
  if not exists (select 1 from public.profiles where id = p_actor and char_length(btrim(display_name)) >= 2) then
    v_step := 'profile';
  elsif not exists (select 1 from private.user_locations where user_id = p_actor) then
    v_step := 'location';
  elsif not exists (select 1 from private.phone_claims where user_id = p_actor and revoked_at is null) then
    v_step := 'phone';
  else
    v_step := 'complete';
  end if;

  insert into private.account_state(user_id, account_status, onboarding_step, updated_at)
  values (p_actor, case when v_step = 'complete' then 'active' else 'pending' end, v_step, statement_timestamp())
  on conflict (user_id) do update set
    account_status = case when private.account_state.account_status in ('restricted', 'banned') then private.account_state.account_status when v_step = 'complete' then 'active' else 'pending' end,
    onboarding_step = v_step,
    updated_at = statement_timestamp();
end;
$$;

create or replace function private.onboarding_for_current_actor()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  return private.onboarding_for_actor(auth.uid());
end;
$$;

create or replace function private.complete_profile_command(p_display_name text, p_bio text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_name text := btrim(coalesce(p_display_name, ''));
  v_bio text := nullif(btrim(coalesce(p_bio, '')), '');
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if char_length(v_name) not between 2 and 80 or (v_bio is not null and char_length(v_bio) > 500) then
    raise exception using errcode = '22023', message = 'PROFILE_INVALID';
  end if;
  update public.profiles set display_name = v_name, bio = v_bio, updated_at = statement_timestamp() where id = v_actor;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
  perform private.refresh_onboarding(v_actor);
end;
$$;

create or replace function private.set_location_command(p_area_id text, p_latitude double precision, p_longitude double precision, p_address text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_point extensions.geometry(point, 4326);
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 or (v_address is not null and char_length(v_address) > 300) then
    raise exception using errcode = '22023', message = 'LOCATION_INVALID';
  end if;
  v_point := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326);
  if not exists (
    select 1 from public.service_areas a
    join private.service_area_boundaries b using (area_id)
    where a.area_id = p_area_id and a.enabled and extensions.st_covers(b.boundary, v_point)
  ) then
    raise exception using errcode = 'P0001', message = 'LOCATION_OUTSIDE_SERVICE_AREA';
  end if;
  insert into private.user_locations(user_id, area_id, exact_point, address, updated_at)
  values (v_actor, p_area_id, v_point::extensions.geography, v_address, statement_timestamp())
  on conflict (user_id) do update set area_id = excluded.area_id, exact_point = excluded.exact_point, address = excluded.address, updated_at = excluded.updated_at;
  perform private.refresh_onboarding(v_actor);
end;
$$;

create or replace function public.get_my_onboarding()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  return private.onboarding_for_current_actor();
end;
$$;

create or replace function public.complete_profile(p_display_name text, p_bio text default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.complete_profile_command(p_display_name, p_bio);
  return private.onboarding_for_current_actor();
end;
$$;

create or replace function public.set_location(p_area_id text, p_latitude double precision, p_longitude double precision, p_address text default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.set_location_command(p_area_id, p_latitude, p_longitude, p_address);
  return private.onboarding_for_current_actor();
end;
$$;

create or replace function private.assert_service_role()
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise insufficient_privilege using message = 'SERVICE_ROLE_REQUIRED';
  end if;
end;
$$;

create or replace function private.otp_create_challenge_command(
  p_challenge_id uuid,
  p_actor uuid,
  p_phone text,
  p_purpose text,
  p_digest text,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_policy private.otp_policy%rowtype;
  v_latest timestamptz;
  v_count integer;
begin
  perform private.assert_service_role();
  if p_actor is null or not exists (select 1 from auth.users where id = p_actor)
     or p_phone !~ '^\+628[1-9][0-9]{7,10}$'
     or p_purpose not in ('register', 'change_phone')
     or p_digest !~ '^[a-f0-9]{64}$'
     or p_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'OTP_REQUEST_INVALID';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text, 0));
  select * into strict v_policy from private.otp_policy where singleton;
  select max(created_at), count(*) filter (where created_at > v_now - interval '1 hour') into v_latest, v_count
    from private.otp_challenges where user_id = p_actor;
  if v_latest is not null and v_latest > v_now - make_interval(secs => v_policy.resend_seconds) then
    raise exception using errcode = 'P0001', message = 'OTP_COOLDOWN';
  end if;
  if v_count >= v_policy.max_sends_per_hour then
    raise exception using errcode = 'P0001', message = 'OTP_RATE_LIMIT';
  end if;
  update private.otp_challenges set consumed_at = v_now where user_id = p_actor and consumed_at is null;
  insert into private.otp_challenges(challenge_id, user_id, phone_e164, purpose, code_digest, ip_hash, created_at, expires_at, resend_at)
  values (p_challenge_id, p_actor, p_phone, p_purpose, p_digest, p_ip_hash, v_now, v_now + make_interval(secs => v_policy.expires_seconds), v_now + make_interval(secs => v_policy.resend_seconds));
  return jsonb_build_object('challengeId', p_challenge_id, 'expiresAt', v_now + make_interval(secs => v_policy.expires_seconds), 'resendAt', v_now + make_interval(secs => v_policy.resend_seconds));
end;
$$;

create or replace function private.otp_record_delivery_command(p_challenge_id uuid, p_status text, p_reference text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_service_role();
  if p_status not in ('accepted', 'failed', 'unknown') or (p_reference is not null and char_length(p_reference) > 200) then
    raise exception using errcode = '22023', message = 'OTP_DELIVERY_INVALID';
  end if;
  update private.otp_challenges set delivery_status = p_status, provider_reference = case when p_status = 'accepted' then p_reference else null end where challenge_id = p_challenge_id;
  if not found then raise exception using errcode = 'P0001', message = 'OTP_CHALLENGE_NOT_FOUND'; end if;
  return jsonb_build_object('deliveryStatus', p_status);
end;
$$;

create or replace function private.otp_challenge_context_command(p_challenge_id uuid, p_actor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  perform private.assert_service_role();
  select jsonb_build_object('phone', phone_e164, 'purpose', purpose) into v_result from private.otp_challenges where challenge_id = p_challenge_id and user_id = p_actor;
  return v_result;
end;
$$;

create or replace function private.otp_verify_challenge_command(p_challenge_id uuid, p_actor uuid, p_digest text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge private.otp_challenges%rowtype;
  v_policy private.otp_policy%rowtype;
begin
  perform private.assert_service_role();
  if p_digest !~ '^[a-f0-9]{64}$' then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_challenge from private.otp_challenges where challenge_id = p_challenge_id and user_id = p_actor for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into strict v_policy from private.otp_policy where singleton;
  if v_challenge.consumed_at is not null then return jsonb_build_object('status', 'used'); end if;
  if v_challenge.expires_at <= statement_timestamp() then return jsonb_build_object('status', 'expired'); end if;
  if v_challenge.failed_attempts >= v_policy.max_attempts then return jsonb_build_object('status', 'attempts_exceeded'); end if;
  if v_challenge.code_digest <> p_digest then
    update private.otp_challenges set failed_attempts = failed_attempts + 1 where challenge_id = p_challenge_id;
    return jsonb_build_object('status', case when v_challenge.failed_attempts + 1 >= v_policy.max_attempts then 'attempts_exceeded' else 'wrong_code' end);
  end if;
  begin
    update private.phone_claims set revoked_at = statement_timestamp() where user_id = p_actor and revoked_at is null and phone_e164 <> v_challenge.phone_e164;
    if not exists (select 1 from private.phone_claims where user_id = p_actor and phone_e164 = v_challenge.phone_e164 and revoked_at is null) then
      insert into private.phone_claims(user_id, phone_e164) values (p_actor, v_challenge.phone_e164);
    end if;
  exception when unique_violation then
    return jsonb_build_object('status', 'phone_unavailable');
  end;
  update private.otp_challenges set consumed_at = statement_timestamp() where challenge_id = p_challenge_id;
  perform private.refresh_onboarding(p_actor);
  return jsonb_build_object('status', 'verified', 'onboarding', private.onboarding_for_actor(p_actor));
end;
$$;

create or replace function public.otp_create_challenge(p_challenge_id uuid, p_actor uuid, p_phone text, p_purpose text, p_digest text, p_ip_hash text)
returns jsonb language sql security invoker set search_path = '' as $$ select private.otp_create_challenge_command(p_challenge_id, p_actor, p_phone, p_purpose, p_digest, p_ip_hash) $$;
create or replace function public.otp_record_delivery(p_challenge_id uuid, p_status text, p_reference text default null)
returns jsonb language sql security invoker set search_path = '' as $$ select private.otp_record_delivery_command(p_challenge_id, p_status, p_reference) $$;
create or replace function public.otp_get_challenge_context(p_challenge_id uuid, p_actor uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.otp_challenge_context_command(p_challenge_id, p_actor) $$;
create or replace function public.otp_verify_challenge(p_challenge_id uuid, p_actor uuid, p_digest text)
returns jsonb language sql security invoker set search_path = '' as $$ select private.otp_verify_challenge_command(p_challenge_id, p_actor, p_digest) $$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id) values (new.id) on conflict do nothing;
  insert into private.account_state(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated, service_role;
grant execute on function public.get_my_onboarding() to authenticated;
grant execute on function public.complete_profile(text, text) to authenticated;
grant execute on function public.set_location(text, double precision, double precision, text) to authenticated;
grant execute on function private.onboarding_for_current_actor(), private.complete_profile_command(text, text), private.set_location_command(text, double precision, double precision, text) to authenticated;
grant usage on schema private to service_role;
grant execute on function public.otp_create_challenge(uuid, uuid, text, text, text, text), public.otp_record_delivery(uuid, text, text), public.otp_get_challenge_context(uuid, uuid), public.otp_verify_challenge(uuid, uuid, text) to service_role;
grant execute on function private.assert_service_role(), private.otp_create_challenge_command(uuid, uuid, text, text, text, text), private.otp_record_delivery_command(uuid, text, text), private.otp_challenge_context_command(uuid, uuid), private.otp_verify_challenge_command(uuid, uuid, text) to service_role;
