-- Recover accounts created before the auth trigger was installed and make the
-- profile command safe for the same partial-provisioning case going forward.
insert into public.profiles(id)
select u.id
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

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

  insert into public.profiles(id, display_name, bio, updated_at)
  values (v_actor, v_name, v_bio, statement_timestamp())
  on conflict (id) do update set
    display_name = excluded.display_name,
    bio = excluded.bio,
    updated_at = excluded.updated_at;

  perform private.refresh_onboarding(v_actor);
end;
$$;
