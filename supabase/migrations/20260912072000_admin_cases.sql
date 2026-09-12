create table private.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  constraint admin_roles_role check (role in ('moderator', 'admin'))
);
alter table private.admin_roles enable row level security;
revoke all on private.admin_roles from public, anon, authenticated;

alter table public.reports add column if not exists decision_version integer not null default 1;
alter table public.reports add column if not exists assigned_admin_id uuid references auth.users(id) on delete set null;
alter table public.reports add constraint reports_decision_version_positive check (decision_version > 0);

create table public.report_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(report_id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete restrict,
  source_type text not null,
  source_id uuid not null,
  note text not null default '',
  created_at timestamptz not null default statement_timestamp(),
  constraint report_evidence_source_type check (source_type in ('listing', 'message', 'barter_event', 'order_event')),
  constraint report_evidence_note check (char_length(note) <= 1000),
  constraint report_evidence_unique unique (report_id, source_type, source_id)
);
alter table public.report_evidence enable row level security;
create policy report_evidence_reporter_read on public.report_evidence for select to authenticated using (exists (select 1 from public.reports report where report.report_id = report_evidence.report_id and report.reporter_id = (select auth.uid())));
revoke all on public.report_evidence from public, anon, authenticated;
grant select on public.report_evidence to authenticated;

create table public.report_decisions (
  decision_id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(report_id) on delete restrict,
  decided_by uuid not null references auth.users(id) on delete restrict,
  outcome text not null,
  rationale text not null,
  action_user_id uuid references auth.users(id) on delete restrict,
  sanction_kind text,
  sanction_until timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint report_decisions_outcome check (outcome in ('no_action', 'return_required', 'cancel_transaction', 'admin_complete', 'restrict_account', 'ban_account')),
  constraint report_decisions_sanction check (sanction_kind is null or sanction_kind in ('restriction', 'ban')),
  constraint report_decisions_rationale check (char_length(rationale) between 10 and 3000)
);
create index report_decisions_report_idx on public.report_decisions(report_id, created_at desc);
alter table public.report_decisions enable row level security;
revoke all on public.report_decisions from public, anon, authenticated;

create table public.account_sanctions (
  sanction_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  report_id uuid not null references public.reports(report_id) on delete restrict,
  issued_by uuid not null references auth.users(id) on delete restrict,
  kind text not null,
  reason text not null,
  starts_at timestamptz not null default statement_timestamp(),
  ends_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint account_sanctions_kind check (kind in ('restriction', 'ban')),
  constraint account_sanctions_reason check (char_length(reason) between 10 and 3000),
  constraint account_sanctions_window check (ends_at is null or ends_at > starts_at)
);
create index account_sanctions_active_idx on public.account_sanctions(user_id, starts_at, ends_at);
alter table public.account_sanctions enable row level security;
create policy account_sanctions_owner_read on public.account_sanctions for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.account_sanctions from public, anon, authenticated;
grant select on public.account_sanctions to authenticated;

create or replace function public.attach_report_evidence(p_report_id uuid, p_source_type text, p_source_id uuid, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_report public.reports%rowtype; v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  select * into v_report from public.reports where report_id = p_report_id and reporter_id = v_actor;
  if not found then raise insufficient_privilege using message = 'REPORT_FORBIDDEN'; end if;
  if p_source_type = 'listing' and (v_report.target_type <> 'listing' or v_report.target_id <> p_source_id or not exists (select 1 from public.listings where listing_id = p_source_id)) then raise exception using errcode = 'P0001', message = 'REPORT_EVIDENCE_CONTEXT_INVALID'; end if;
  if p_source_type = 'message' and (v_report.target_type <> 'conversation' or not exists (select 1 from public.messages where message_id = p_source_id and conversation_id = v_report.target_id)) then raise exception using errcode = 'P0001', message = 'REPORT_EVIDENCE_CONTEXT_INVALID'; end if;
  if p_source_type = 'barter_event' and (v_report.target_type <> 'barter' or not exists (select 1 from public.transaction_events where event_id = p_source_id and transaction_id = v_report.target_id)) then raise exception using errcode = 'P0001', message = 'REPORT_EVIDENCE_CONTEXT_INVALID'; end if;
  if p_source_type = 'order_event' and (v_report.target_type <> 'order' or not exists (select 1 from public.order_events where event_id = p_source_id and order_id = v_report.target_id)) then raise exception using errcode = 'P0001', message = 'REPORT_EVIDENCE_CONTEXT_INVALID'; end if;
  if p_source_type not in ('listing', 'message', 'barter_event', 'order_event') or char_length(coalesce(p_note, '')) > 1000 then raise exception using errcode = '22023', message = 'REPORT_EVIDENCE_INVALID'; end if;
  insert into public.report_evidence(report_id, added_by, source_type, source_id, note) values (p_report_id, v_actor, p_source_type, p_source_id, btrim(coalesce(p_note, '')))
  on conflict (report_id, source_type, source_id) do update set note = excluded.note
  returning evidence_id into v_id;
  return jsonb_build_object('id', v_id);
end
$$;
revoke all on function public.attach_report_evidence(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.attach_report_evidence(uuid, text, uuid, text) to authenticated;

create or replace function private.is_admin(p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admin_roles where user_id = p_actor and active)
$$;

create or replace function private.report_involves_user(p_report public.reports, p_user uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_report.reporter_id = p_user then return true; end if;
  if p_report.target_type = 'listing' then return exists (select 1 from public.listings where listing_id = p_report.target_id and owner_id = p_user); end if;
  if p_report.target_type = 'conversation' then return exists (select 1 from public.conversation_members where conversation_id = p_report.target_id and user_id = p_user); end if;
  if p_report.target_type = 'barter' then return exists (select 1 from public.transactions where transaction_id = p_report.target_id and p_user in (party_a, party_b)); end if;
  if p_report.target_type = 'order' then return exists (select 1 from public.orders where order_id = p_report.target_id and p_user in (buyer_id, seller_id)); end if;
  if p_report.target_type = 'review' then return exists (select 1 from public.reviews where review_id = p_report.target_id and p_user in (author_id, subject_id)); end if;
  return false;
end
$$;

alter table public.reports drop constraint if exists reports_target_type;
alter table public.reports add constraint reports_target_type check (target_type in ('listing', 'conversation', 'barter', 'order', 'review'));

create or replace function private.report_target_allowed(p_actor uuid, p_type text, p_target uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_type = 'listing' then return exists (select 1 from public.listings where listing_id = p_target and lifecycle = 'active' and hidden_at is null); end if;
  if p_type = 'conversation' then return private.is_conversation_member(p_target, p_actor); end if;
  if p_type = 'barter' then return private.is_trade_participant(p_target, p_actor); end if;
  if p_type = 'order' then return private.is_order_participant(p_target, p_actor); end if;
  if p_type = 'review' then return exists (select 1 from public.reviews where review_id = p_target and status = 'published' and author_id <> p_actor); end if;
  return false;
end
$$;

create or replace function public.create_report(p_target_type text, p_target_id uuid, p_reason text, p_description text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if p_target_type not in ('listing', 'conversation', 'barter', 'order', 'review') or p_reason not in ('scam', 'unsafe', 'not_as_described', 'harassment', 'other') or char_length(btrim(coalesce(p_description, ''))) not between 10 and 3000 then raise exception using errcode = '22023', message = 'REPORT_PAYLOAD_INVALID'; end if;
  if not private.report_target_allowed(v_actor, p_target_type, p_target_id) then raise insufficient_privilege using message = 'REPORT_TARGET_FORBIDDEN'; end if;
  insert into public.reports(reporter_id, target_type, target_id, reason, description) values (v_actor, p_target_type, p_target_id, p_reason, btrim(p_description)) returning report_id into v_id;
  return jsonb_build_object('id', v_id, 'status', 'open');
end
$$;

create or replace function private.report_target_user_allowed(p_report public.reports, p_user uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user is null or p_user = p_report.reporter_id then return false; end if;
  return private.report_involves_user(p_report, p_user);
end
$$;

create or replace function private.report_context_json(p_report public.reports)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_title text; v_href text; v_summary text;
begin
  if p_report.target_type = 'listing' then
    select title into v_title from public.listings where listing_id = p_report.target_id;
    v_href := '/listings/' || p_report.target_id::text; v_summary := 'Listing yang dilaporkan.';
  elsif p_report.target_type = 'conversation' then
    select 'Percakapan · ' || listing.title into v_title from public.conversations conversation join public.listings listing on listing.listing_id = conversation.listing_id where conversation.conversation_id = p_report.target_id;
    v_href := '/chat/' || p_report.target_id::text; v_summary := 'Hanya percakapan yang terkait laporan ini yang menjadi konteks.';
  elsif p_report.target_type = 'barter' then
    v_title := 'Ruang barter ' || left(p_report.target_id::text, 8); v_href := '/transactions/' || p_report.target_id::text; v_summary := 'Snapshot dan event barter terkait laporan.';
  elsif p_report.target_type = 'review' then
    v_title := 'Ulasan ' || left(p_report.target_id::text, 8); v_href := '/profile'; v_summary := 'Ulasan yang dilaporkan; detail transaksi tidak dibuka otomatis.';
  else
    v_title := 'Pesanan ' || left(p_report.target_id::text, 8); v_href := '/orders/' || p_report.target_id::text; v_summary := 'Snapshot dan event pesanan terkait laporan.';
  end if;
  return jsonb_build_object('title', coalesce(v_title, 'Konteks tidak tersedia'), 'href', v_href, 'summary', v_summary);
end
$$;

create or replace function private.admin_report_dto(p_report_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_report public.reports%rowtype; v_decision jsonb;
begin
  select * into v_report from public.reports where report_id = p_report_id;
  if not found then return null; end if;
  select jsonb_build_object('outcome', outcome, 'rationale', rationale, 'decidedAt', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'adminName', profile.display_name)
  into v_decision
  from public.report_decisions decision join public.profiles profile on profile.id = decision.decided_by
  where decision.report_id = p_report_id order by decision.created_at desc limit 1;
  return jsonb_build_object(
    'id', v_report.report_id, 'targetType', v_report.target_type, 'targetId', v_report.target_id, 'reason', v_report.reason,
    'description', v_report.description, 'status', v_report.status, 'decisionVersion', v_report.decision_version,
    'createdAt', to_char(v_report.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'reporter', (select jsonb_build_object('id', profile.id, 'name', profile.display_name) from public.profiles profile where profile.id = v_report.reporter_id),
    'context', private.report_context_json(v_report), 'decision', v_decision,
    'evidence', coalesce((select jsonb_agg(jsonb_build_object('id', evidence.evidence_id, 'sourceType', evidence.source_type, 'sourceId', evidence.source_id, 'note', evidence.note, 'createdAt', to_char(evidence.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by evidence.created_at) from public.report_evidence evidence where evidence.report_id = p_report_id), '[]'::jsonb)
  );
end
$$;

create or replace function public.admin_list_reports(p_status text default 'open', p_cursor text default null, p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50)); v_cursor timestamptz; v_items jsonb; v_next text;
begin
  if not private.is_admin(v_actor) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  if p_cursor is not null and p_cursor <> '' then begin v_cursor := p_cursor::timestamptz; exception when others then raise exception using errcode = '22023', message = 'REPORT_CURSOR_INVALID'; end; end if;
  select coalesce(jsonb_agg(private.admin_report_dto(page.report_id) order by page.created_at desc, page.report_id desc), '[]'::jsonb), case when count(*) = v_limit then to_char(min(page.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else null end
  into v_items, v_next
  from (
    select report_id, created_at from public.reports
    where (p_status = 'all' or status = p_status) and (v_cursor is null or created_at < v_cursor)
    order by created_at desc, report_id desc limit v_limit
  ) page;
  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end
$$;

create or replace function public.admin_get_report(p_report_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  return private.admin_report_dto(p_report_id);
end
$$;

create or replace function public.admin_decide_report(p_report_id uuid, p_expected_version integer, p_outcome text, p_rationale text, p_action_user_id uuid default null, p_sanction_kind text default null, p_duration_days integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_report public.reports%rowtype; v_kind text := p_sanction_kind; v_until timestamptz;
begin
  if not private.is_admin(v_actor) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  select * into v_report from public.reports where report_id = p_report_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'REPORT_NOT_FOUND'; end if;
  if private.report_involves_user(v_report, v_actor) then raise insufficient_privilege using message = 'ADMIN_CONFLICT_OF_INTEREST'; end if;
  if v_report.decision_version <> p_expected_version then raise exception using errcode = 'P0001', message = 'REPORT_VERSION_CONFLICT'; end if;
  if v_report.status not in ('open', 'under_review') or p_outcome not in ('no_action', 'return_required', 'cancel_transaction', 'admin_complete', 'restrict_account', 'ban_account') or char_length(btrim(coalesce(p_rationale, ''))) not between 10 and 3000 then raise exception using errcode = '22023', message = 'REPORT_DECISION_INVALID'; end if;
  if p_outcome = 'restrict_account' and v_kind is null then v_kind := 'restriction'; end if;
  if p_outcome = 'ban_account' and v_kind is null then v_kind := 'ban'; end if;
  if p_outcome in ('restrict_account', 'ban_account') then
    if not private.report_target_user_allowed(v_report, p_action_user_id) or v_kind not in ('restriction', 'ban') or p_duration_days is null or p_duration_days not between 1 and 3650 then raise exception using errcode = '22023', message = 'REPORT_SANCTION_INVALID'; end if;
    v_until := statement_timestamp() + make_interval(days => p_duration_days);
  elsif p_action_user_id is not null or v_kind is not null or p_duration_days is not null then raise exception using errcode = '22023', message = 'REPORT_SANCTION_UNEXPECTED'; end if;
  insert into public.report_decisions(report_id, decided_by, outcome, rationale, action_user_id, sanction_kind, sanction_until) values (p_report_id, v_actor, p_outcome, btrim(p_rationale), p_action_user_id, v_kind, v_until);
  if p_action_user_id is not null then insert into public.account_sanctions(user_id, report_id, issued_by, kind, reason, ends_at) values (p_action_user_id, p_report_id, v_actor, v_kind, btrim(p_rationale), v_until); end if;
  update public.reports set status = 'resolved', assigned_admin_id = v_actor, decision_version = decision_version + 1, updated_at = statement_timestamp() where report_id = p_report_id;
  perform private.create_notification(v_report.reporter_id, 'report', 'Laporan diperbarui', 'Laporanmu sudah mendapat tindak lanjut admin.', '/profile', 'report_decision', p_report_id);
  return private.admin_report_dto(p_report_id);
end
$$;

create or replace function private.assert_active_account(p_actor uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from private.account_state where user_id = p_actor and account_status = 'active' and onboarding_step = 'complete') then raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_ACTIVE'; end if;
  if exists (select 1 from public.account_sanctions where user_id = p_actor and starts_at <= statement_timestamp() and (ends_at is null or ends_at > statement_timestamp())) then raise exception using errcode = 'P0001', message = 'ACCOUNT_RESTRICTED'; end if;
end
$$;

revoke all on function private.is_admin(uuid), private.report_involves_user(public.reports, uuid), private.report_target_user_allowed(public.reports, uuid), private.report_context_json(public.reports), private.admin_report_dto(uuid), public.admin_list_reports(text, text, integer), public.admin_get_report(uuid), public.admin_decide_report(uuid, integer, text, text, uuid, text, integer), private.assert_active_account(uuid) from public, anon, authenticated;
grant execute on function public.create_report(text, uuid, text, text), public.admin_list_reports(text, text, integer), public.admin_get_report(uuid), public.admin_decide_report(uuid, integer, text, text, uuid, text, integer) to authenticated;
