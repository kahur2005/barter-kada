begin;
select plan(30);

select has_table('public', 'conversations', 'conversations table exists');
select has_table('public', 'conversation_members', 'conversation members table exists');
select has_table('public', 'messages', 'messages table exists');
select has_table('public', 'blocks', 'blocks table exists');
select ok(exists (
  select 1 from pg_catalog.pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
), 'committed messages are published to Realtime');

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'chat-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '92000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'chat-buyer@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-8000-000000000003', '93000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'chat-stranger@example.test', '', now(), now(), now());
update public.profiles set display_name = case id
  when '91000000-0000-4000-8000-000000000001' then 'Bu Rina'
  when '92000000-0000-4000-8000-000000000002' then 'Dita'
  else 'Orang lain'
end where id in (
  '91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002',
  '93000000-0000-4000-8000-000000000003'
);
update private.account_state
set account_status = 'active', onboarding_step = 'complete'
where user_id in (
  '91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002',
  '93000000-0000-4000-8000-000000000003'
);
insert into public.service_areas(area_id, name, enabled, boundary_source, boundary_version)
values ('chat-test', 'Depok chat test', true, 'pgTAP fixture', 'test-only');
insert into public.listings(listing_id, owner_id, category_id, title, description, condition, defects, negotiable, fulfillment_kind, base_price_rupiah, lifecycle, availability, version, area_id, area_label, published_at)
values ('94000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000001', 'home', 'Kursi kayu', 'Kursi untuk diambil di lingkungan sekitar.', 'good', 'Gores ringan.', true, 'ready_stock', 150000, 'active', 'available', 1, 'chat-test', 'Depok chat test', now());
insert into public.listing_modes(listing_id, mode) values ('94000000-0000-4000-8000-000000000004', 'sale');

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select set_config('test.conversation', public.open_conversation('94000000-0000-4000-8000-000000000004')->>'conversationId', true);
select ok(current_setting('test.conversation')::uuid is not null, 'buyer opens a listing-scoped conversation');
select is(public.open_conversation('94000000-0000-4000-8000-000000000004')->>'conversationId', current_setting('test.conversation'), 'opening the same listing and pair is idempotent');
select is((select count(*) from public.conversation_members where conversation_id = current_setting('test.conversation')::uuid), 2::bigint, 'conversation has exactly two members');
select is((public.send_message(current_setting('test.conversation')::uuid, '95000000-0000-4000-8000-000000000005', 'text', '{"text":"  Masih tersedia?  "}'::jsonb, null)->>'seq')::integer, 1, 'first committed message receives sequence one');
select is(public.send_message(current_setting('test.conversation')::uuid, '95000000-0000-4000-8000-000000000005', 'text', '{"text":"Masih tersedia?"}'::jsonb, null)->'body'->>'text', 'Masih tersedia?', 'message text is normalized');
select is((public.send_message(current_setting('test.conversation')::uuid, '95000000-0000-4000-8000-000000000005', 'text', '{"text":"Masih tersedia?"}'::jsonb, null)->>'seq')::integer, 1, 'retry with the same client id returns the committed message');
select is((select count(*) from public.messages where conversation_id = current_setting('test.conversation')::uuid), 1::bigint, 'idempotent retry does not duplicate a message');
select throws_ok(
  $$ select public.send_message(current_setting('test.conversation')::uuid, '95000000-0000-4000-8000-000000000005', 'text', '{"text":"Isi berbeda"}'::jsonb, null) $$,
  'P0001', 'IDEMPOTENCY_CONFLICT', 'reusing a client id for different content is rejected'
);
select is((public.send_message(current_setting('test.conversation')::uuid, '96000000-0000-4000-8000-000000000006', 'text', '{"text":"Saya minat."}'::jsonb, null)->>'seq')::integer, 2, 'next committed message receives the next sequence');
select is(jsonb_array_length(public.list_messages(current_setting('test.conversation')::uuid, null, 50)->'items'), 2, 'message history returns committed messages');
select is((public.list_messages(current_setting('test.conversation')::uuid, null, 50)->>'hasMore')::boolean, false, 'short history has no older page');
select lives_ok($$ select public.mark_conversation_read(current_setting('test.conversation')::uuid, 2) $$, 'member can advance the read cursor');
select is((select last_read_seq from public.conversation_members where conversation_id = current_setting('test.conversation')::uuid and user_id = '92000000-0000-4000-8000-000000000002'), 2::bigint, 'read cursor stores the committed sequence');
select lives_ok($$ select public.mark_conversation_read(current_setting('test.conversation')::uuid, 1) $$, 'lower read acknowledgements are harmless');
select is((select last_read_seq from public.conversation_members where conversation_id = current_setting('test.conversation')::uuid and user_id = '92000000-0000-4000-8000-000000000002'), 2::bigint, 'read cursor never moves backwards');
select throws_ok($$ select public.mark_conversation_read(current_setting('test.conversation')::uuid, 3) $$, '22023', 'READ_CURSOR_INVALID', 'cursor cannot pass the committed sequence');

reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((public.list_conversations()->0->>'unreadCount')::integer, 2, 'counterpart inbox counts unread committed messages');

reset role;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select throws_ok($$ select public.list_messages(current_setting('test.conversation')::uuid, null, 50) $$, '42501', 'CONVERSATION_FORBIDDEN', 'non-member cannot call message history RPC');
select is((select count(*) from public.messages where conversation_id = current_setting('test.conversation')::uuid), 0::bigint, 'RLS hides messages from a non-member');

reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok($$ select public.block_user('92000000-0000-4000-8000-000000000002') $$, 'a user can block the counterpart');

reset role;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_ok(
  $$ select public.send_message(current_setting('test.conversation')::uuid, '97000000-0000-4000-8000-000000000007', 'text', '{"text":"Pesan saat diblokir"}'::jsonb, null) $$,
  'P0001', 'CHAT_BLOCKED', 'either-side block stops new general messages'
);

reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok($$ select public.unblock_user('92000000-0000-4000-8000-000000000002') $$, 'blocker can unblock the counterpart');

reset role;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((public.send_message(current_setting('test.conversation')::uuid, '98000000-0000-4000-8000-000000000008', 'text', '{"text":"Pesan setelah dibuka"}'::jsonb, null)->>'seq')::integer, 3, 'messaging resumes after unblock');
select throws_ok(
  $$ insert into public.messages(conversation_id, sender_id, seq, client_message_id, type, body) values (current_setting('test.conversation')::uuid, '92000000-0000-4000-8000-000000000002', 99, gen_random_uuid(), 'text', '{"text":"bypass"}'::jsonb) $$,
  '42501', null, 'browser role cannot bypass append-only message commands'
);

reset role;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select throws_ok($$ select count(*) from public.messages $$, '42501', null, 'anonymous users cannot read private messages');

select * from finish();
rollback;
