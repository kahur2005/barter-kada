-- WhatsApp verification is no longer part of account onboarding.
-- Keep the legacy private phone/OTP tables for historical data and auditability,
-- but do not require a phone claim before an account becomes active.

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

-- Release existing accounts that had already completed profile and location but
-- were waiting only for the retired phone step.
update private.account_state s
set account_status = case when s.account_status in ('restricted', 'banned') then s.account_status else 'active' end,
    onboarding_step = 'complete',
    updated_at = statement_timestamp()
where s.onboarding_step = 'phone'
  and exists (select 1 from public.profiles p where p.id = s.user_id and char_length(btrim(p.display_name)) >= 2)
  and exists (select 1 from private.user_locations l where l.user_id = s.user_id);
