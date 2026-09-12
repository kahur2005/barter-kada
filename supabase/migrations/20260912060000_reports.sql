create table public.reports (
  report_id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint reports_target_type check (target_type in ('listing', 'conversation', 'barter', 'order')),
  constraint reports_reason check (reason in ('scam', 'unsafe', 'not_as_described', 'harassment', 'other')),
  constraint reports_description check (char_length(description) between 10 and 3000),
  constraint reports_status check (status in ('open', 'under_review', 'resolved', 'rejected'))
);
create index reports_reporter_recent_idx on public.reports(reporter_id, created_at desc);
alter table public.reports enable row level security;
create policy reports_reporter_read on public.reports for select to authenticated using (reporter_id = (select auth.uid()));
revoke all on public.reports from public, anon, authenticated;
grant select on public.reports to authenticated;

create or replace function private.report_target_allowed(p_actor uuid, p_type text, p_target uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_type = 'listing' then return exists (select 1 from public.listings where listing_id = p_target and lifecycle = 'active' and hidden_at is null); end if;
  if p_type = 'conversation' then return private.is_conversation_member(p_target, p_actor); end if;
  if p_type = 'barter' then return private.is_trade_participant(p_target, p_actor); end if;
  if p_type = 'order' then return private.is_order_participant(p_target, p_actor); end if;
  return false;
end
$$;
create or replace function public.create_report(p_target_type text, p_target_id uuid, p_reason text, p_description text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if p_target_type not in ('listing', 'conversation', 'barter', 'order') or p_reason not in ('scam', 'unsafe', 'not_as_described', 'harassment', 'other') or char_length(btrim(coalesce(p_description, ''))) not between 10 and 3000 then raise exception using errcode = '22023', message = 'REPORT_PAYLOAD_INVALID'; end if;
  if not private.report_target_allowed(v_actor, p_target_type, p_target_id) then raise insufficient_privilege using message = 'REPORT_TARGET_FORBIDDEN'; end if;
  insert into public.reports(reporter_id, target_type, target_id, reason, description) values (v_actor, p_target_type, p_target_id, p_reason, btrim(p_description)) returning report_id into v_id;
  return jsonb_build_object('id', v_id, 'status', 'open');
end
$$;
revoke all on function private.report_target_allowed(uuid, text, uuid), public.create_report(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_report(text, uuid, text, text) to authenticated;
