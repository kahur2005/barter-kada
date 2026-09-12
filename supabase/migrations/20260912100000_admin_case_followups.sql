alter table public.report_decisions add column if not exists follow_up_kind text;
alter table public.report_decisions add column if not exists follow_up_due_at timestamptz;
alter table public.report_decisions drop constraint if exists report_decisions_followup_kind;
alter table public.report_decisions add constraint report_decisions_followup_kind check (follow_up_kind is null or follow_up_kind in ('return_goods'));
alter table public.report_decisions drop constraint if exists report_decisions_followup_fields;
alter table public.report_decisions add constraint report_decisions_followup_fields check ((follow_up_kind is null and follow_up_due_at is null) or (follow_up_kind = 'return_goods' and action_user_id is not null and follow_up_due_at is not null));

create or replace function private.admin_report_dto(p_report_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_report public.reports%rowtype; v_decision jsonb;
begin
  select * into v_report from public.reports where report_id = p_report_id;
  if not found then return null; end if;
  select jsonb_build_object(
    'outcome', outcome, 'rationale', rationale, 'decidedAt', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'adminName', profile.display_name,
    'actionUserId', action_user_id, 'followUpKind', follow_up_kind,
    'followUpDueAt', case when follow_up_due_at is null then null else to_char(follow_up_due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
  )
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

drop function if exists public.admin_decide_report(uuid, integer, text, text, uuid, text, integer);
create or replace function public.admin_decide_report(
  p_report_id uuid, p_expected_version integer, p_outcome text, p_rationale text,
  p_action_user_id uuid default null, p_sanction_kind text default null, p_duration_days integer default null,
  p_follow_up_kind text default null, p_follow_up_due_at timestamptz default null
)
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
    if not private.report_target_user_allowed(v_report, p_action_user_id) or v_kind not in ('restriction', 'ban') or p_duration_days is null or p_duration_days not between 1 and 3650 or p_follow_up_kind is not null or p_follow_up_due_at is not null then raise exception using errcode = '22023', message = 'REPORT_SANCTION_INVALID'; end if;
    v_until := statement_timestamp() + make_interval(days => p_duration_days);
  elsif p_outcome = 'return_required' then
    if not private.report_target_user_allowed(v_report, p_action_user_id) or p_follow_up_kind <> 'return_goods' or p_follow_up_due_at is null or p_follow_up_due_at <= statement_timestamp() or p_sanction_kind is not null or p_duration_days is not null then raise exception using errcode = '22023', message = 'REPORT_RETURN_FOLLOWUP_INVALID'; end if;
  elsif p_action_user_id is not null or v_kind is not null or p_duration_days is not null or p_follow_up_kind is not null or p_follow_up_due_at is not null then
    raise exception using errcode = '22023', message = 'REPORT_DECISION_FIELDS_UNEXPECTED';
  end if;
  insert into public.report_decisions(report_id, decided_by, outcome, rationale, action_user_id, sanction_kind, sanction_until, follow_up_kind, follow_up_due_at)
  values (p_report_id, v_actor, p_outcome, btrim(p_rationale), p_action_user_id, v_kind, v_until, p_follow_up_kind, p_follow_up_due_at);
  if p_outcome in ('restrict_account', 'ban_account') then
    insert into public.account_sanctions(user_id, report_id, issued_by, kind, reason, ends_at) values (p_action_user_id, p_report_id, v_actor, v_kind, btrim(p_rationale), v_until);
  elsif p_outcome = 'return_required' then
    perform private.create_notification(p_action_user_id, 'report', 'Tindak lanjut pengembalian barang', 'Admin menetapkan barang perlu dikembalikan sebelum tenggat yang tercatat pada kasus.', '/profile', 'report_return_followup', p_report_id);
  end if;
  update public.reports set status = 'resolved', assigned_admin_id = v_actor, decision_version = decision_version + 1, updated_at = statement_timestamp() where report_id = p_report_id;
  perform private.create_notification(v_report.reporter_id, 'report', 'Laporan diperbarui', 'Laporanmu sudah mendapat tindak lanjut admin.', '/profile', 'report_decision', p_report_id);
  return private.admin_report_dto(p_report_id);
end
$$;

revoke all on function private.admin_report_dto(uuid), public.admin_decide_report(uuid, integer, text, text, uuid, text, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_decide_report(uuid, integer, text, text, uuid, text, integer, text, timestamptz) to authenticated;
