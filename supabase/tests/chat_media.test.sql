begin;
select plan(14);

select has_table('private', 'chat_assets', 'private chat asset registry exists');
select results_eq($$ select count(*) from storage.buckets where id in ('chat-quarantine', 'chat-media') and not public $$, $$ values (2::bigint) $$, 'both chat buckets are private');

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'media-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'media-buyer@example.test', '', now(), now(), now());
update public.profiles set display_name = case when id = 'a1000000-0000-4000-8000-000000000001' then 'Pemilik' else 'Pembeli' end
where id in ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002');
update private.account_state set account_status = 'active', onboarding_step = 'complete'
where user_id in ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002');
insert into public.service_areas(area_id, name, enabled, boundary_source, boundary_version)
values ('chat-media-test', 'Area media test', true, 'pgTAP fixture', 'test-only');
insert into public.listings(listing_id, owner_id, category_id, title, description, condition, defects, negotiable, fulfillment_kind, base_price_rupiah, lifecycle, availability, version, area_id, area_label, published_at)
values ('a3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'home', 'Meja kecil', 'Meja kecil untuk tetangga.', 'good', '', false, 'ready_stock', 100000, 'active', 'available', 1, 'chat-media-test', 'Area media test', now());
insert into public.listing_modes(listing_id, mode) values ('a3000000-0000-4000-8000-000000000003', 'sale');

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select set_config('test.media_conversation', public.open_conversation('a3000000-0000-4000-8000-000000000003')->>'conversationId', true);
select set_config('test.media_reservation', public.reserve_chat_asset(current_setting('test.media_conversation')::uuid, 'image/png', 1024)::text, true);
select ok((current_setting('test.media_reservation')::jsonb->>'assetId')::uuid is not null, 'participant can reserve a valid chat image');
select is(current_setting('test.media_reservation')::jsonb->>'quarantinePath', 'a2000000-0000-4000-8000-000000000002/' || (current_setting('test.media_reservation')::jsonb->>'assetId') || '/source', 'quarantine path is deterministic and actor-scoped');
select throws_ok($$ select count(*) from private.chat_assets $$, '42501', null, 'browser cannot inspect private asset state');

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select is(public.get_chat_asset_processing_context((current_setting('test.media_reservation')::jsonb->>'assetId')::uuid, 'a2000000-0000-4000-8000-000000000002')->>'processedPath', 'a2000000-0000-4000-8000-000000000002/' || (current_setting('test.media_reservation')::jsonb->>'assetId') || '.webp', 'media worker receives only deterministic processing context');
select lives_ok(
  $$ select public.mark_chat_asset_processed((current_setting('test.media_reservation')::jsonb->>'assetId')::uuid, 'a2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002/' || (current_setting('test.media_reservation')::jsonb->>'assetId') || '.webp', 640, 480, repeat('a', 64)) $$,
  'service worker can commit sanitized metadata'
);

reset role;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select set_config('test.media_message', public.send_chat_images(current_setting('test.media_conversation')::uuid, 'a4000000-0000-4000-8000-000000000004', array[(current_setting('test.media_reservation')::jsonb->>'assetId')::uuid])::text, true);
select is(current_setting('test.media_message')::jsonb->>'type', 'image', 'processed asset commits as an image message');
select is(jsonb_array_length(current_setting('test.media_message')::jsonb->'body'->'imagePaths'), 1, 'image message contains the expected private path count');
select is((public.send_chat_images(current_setting('test.media_conversation')::uuid, 'a4000000-0000-4000-8000-000000000004', array[(current_setting('test.media_reservation')::jsonb->>'assetId')::uuid])->>'seq')::integer, 1, 'image message retry is idempotent');

reset role;
select ok((select message_id is not null from private.chat_assets where asset_id = (current_setting('test.media_reservation')::jsonb->>'assetId')::uuid), 'committed image is bound to its immutable message');

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_ok(
  $$ select public.send_chat_images(current_setting('test.media_conversation')::uuid, gen_random_uuid(), array[(current_setting('test.media_reservation')::jsonb->>'assetId')::uuid, (current_setting('test.media_reservation')::jsonb->>'assetId')::uuid]) $$,
  '22023', 'CHAT_IMAGE_MESSAGE_INVALID', 'the same asset cannot be repeated in one message'
);
select throws_ok(
  $$ select public.send_chat_images(current_setting('test.media_conversation')::uuid, gen_random_uuid(), array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()]) $$,
  '22023', 'CHAT_IMAGE_MESSAGE_INVALID', 'an image message cannot exceed four files'
);
select throws_ok(
  $$ select public.send_message(current_setting('test.media_conversation')::uuid, gen_random_uuid(), 'image', '{"imagePaths":["forged.webp"]}'::jsonb, null) $$,
  '22023', 'MESSAGE_INVALID', 'generic browser command cannot forge image paths'
);

select * from finish();
rollback;
