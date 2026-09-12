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
    'address', l.address,
    'maskedPhone', case when c.phone_e164 is null then null else '+62••••' || right(c.phone_e164, 4) end,
    'phoneVerified', c.phone_e164 is not null
  )
  from (select p_actor as user_id) actor
  left join private.account_state s on s.user_id = actor.user_id
  left join public.profiles p on p.id = actor.user_id
  left join private.user_locations l on l.user_id = actor.user_id
  left join private.phone_claims c on c.user_id = actor.user_id and c.revoked_at is null
$$;
