begin;
select plan(18);

select has_table('private', 'admin_roles', 'admin role table exists outside public projection');
select has_table('public', 'report_evidence', 'report evidence table exists');
select has_table('public', 'report_decisions', 'report decision audit table exists');
select has_table('public', 'account_sanctions', 'account sanctions table exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'private.admin_roles'::regclass), 'admin roles are protected by RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.report_evidence'::regclass), 'evidence is protected by RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.report_decisions'::regclass), 'decisions are protected by RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.account_sanctions'::regclass), 'sanctions are protected by RLS');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'admin_list_reports'), 'admin report queue RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'admin_get_report'), 'admin scoped case RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'admin_decide_report'), 'admin decision RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'attach_report_evidence'), 'reporter evidence RPC exists');
select ok(exists (select 1 from pg_catalog.pg_proc where proname = 'is_admin'), 'server-side admin capability helper exists');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'reports_decision_version_positive'), 'report decision version is positive');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'report_evidence_unique'), 'evidence attachment is idempotent');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'report_decisions_rationale'), 'decision rationale is mandatory');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'account_sanctions_window'), 'sanction expiry cannot precede start');
select ok(exists (select 1 from pg_catalog.pg_constraint where conname = 'reviews_author_once'), 'review uniqueness remains present beside cases');

select * from finish();
rollback;
