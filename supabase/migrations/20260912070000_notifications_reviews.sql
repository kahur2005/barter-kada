create table public.notifications (
  notification_id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  href text not null,
  source_type text not null,
  source_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint notifications_kind check (kind in ('message', 'barter', 'order', 'payment', 'handover', 'report', 'plus', 'review', 'system')),
  constraint notifications_title check (char_length(title) between 1 and 120),
  constraint notifications_body check (char_length(body) between 1 and 500),
  constraint notifications_href check (left(href, 1) = '/'),
  constraint notifications_source_type check (char_length(source_type) between 1 and 40),
  constraint notifications_source_unique unique (recipient_id, source_type, source_id)
);
create index notifications_recipient_recent_idx on public.notifications(recipient_id, created_at desc, notification_id desc);
alter table public.notifications enable row level security;
create policy notifications_recipient_read on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;

create or replace function private.create_notification(
  p_recipient_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_href text,
  p_source_type text,
  p_source_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_recipient_id is null or p_source_id is null then return; end if;
  insert into public.notifications(recipient_id, kind, title, body, href, source_type, source_id)
  values (p_recipient_id, p_kind, left(btrim(p_title), 120), left(btrim(p_body), 500), p_href, p_source_type, p_source_id)
  on conflict (recipient_id, source_type, source_id) do nothing;
end
$$;

create or replace function private.notify_message_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_recipient uuid;
begin
  if new.sender_id is null then return new; end if;
  for v_recipient in
    select member.user_id from public.conversation_members member
    where member.conversation_id = new.conversation_id and member.user_id <> new.sender_id
  loop
    perform private.create_notification(v_recipient, 'message', 'Pesan baru', 'Kamu menerima pesan baru.', '/chat/' || new.conversation_id::text, 'message', new.message_id);
  end loop;
  return new;
end
$$;
drop trigger if exists messages_notification_insert on public.messages;
create trigger messages_notification_insert after insert on public.messages for each row execute function private.notify_message_insert();

create or replace function private.notify_trade_event_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_recipient uuid; v_title text := 'Pembaruan barter'; v_body text := 'Ada pembaruan pada ruang barter.';
begin
  for v_recipient in
    select party_a from public.transactions where transaction_id = new.transaction_id and party_a is distinct from new.actor_id
    union all
    select party_b from public.transactions where transaction_id = new.transaction_id and party_b is distinct from new.actor_id
  loop
    perform private.create_notification(v_recipient, 'barter', v_title, v_body, '/transactions/' || new.transaction_id::text, 'barter_event', new.event_id);
  end loop;
  return new;
end
$$;
drop trigger if exists transaction_events_notification_insert on public.transaction_events;
create trigger transaction_events_notification_insert after insert on public.transaction_events for each row execute function private.notify_trade_event_insert();

create or replace function private.notify_order_event_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_recipient uuid; v_title text := 'Pembaruan pesanan'; v_body text := 'Ada pembaruan pada ringkasan pesanan.';
begin
  for v_recipient in
    select buyer_id from public.orders where order_id = new.order_id and buyer_id is distinct from new.actor_id
    union all
    select seller_id from public.orders where order_id = new.order_id and seller_id is distinct from new.actor_id
  loop
    perform private.create_notification(v_recipient, 'order', v_title, v_body, '/orders/' || new.order_id::text, 'order_event', new.event_id);
  end loop;
  return new;
end
$$;
drop trigger if exists order_events_notification_insert on public.order_events;
create trigger order_events_notification_insert after insert on public.order_events for each row execute function private.notify_order_event_insert();

create or replace function public.list_notifications(p_cursor text default null, p_limit integer default 20)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_cursor timestamptz; v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  v_items jsonb; v_next text;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  if p_cursor is not null and p_cursor <> '' then
    begin v_cursor := p_cursor::timestamptz; exception when others then raise exception using errcode = '22023', message = 'NOTIFICATION_CURSOR_INVALID'; end;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', page.notification_id, 'kind', page.kind, 'title', page.title, 'body', page.body, 'href', page.href,
    'readAt', page.read_at, 'createdAt', to_char(page.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) order by page.created_at desc, page.notification_id desc), '[]'::jsonb),
  case when count(*) = v_limit then to_char(min(page.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else null end
  into v_items, v_next
  from (
    select * from public.notifications notification
    where notification.recipient_id = v_actor and (v_cursor is null or notification.created_at < v_cursor)
    order by notification.created_at desc, notification.notification_id desc
    limit v_limit
  ) page;
  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_read_at timestamptz;
begin
  if v_actor is null then raise insufficient_privilege using message = 'AUTH_REQUIRED'; end if;
  update public.notifications set read_at = coalesce(read_at, statement_timestamp())
  where notification_id = p_notification_id and recipient_id = v_actor
  returning read_at into v_read_at;
  if v_read_at is null then raise exception using errcode = 'P0001', message = 'NOTIFICATION_NOT_FOUND'; end if;
  return jsonb_build_object('readAt', v_read_at);
end
$$;
revoke all on function private.create_notification(uuid, text, text, text, text, text, uuid), public.list_notifications(text, integer), public.mark_notification_read(uuid) from public, anon, authenticated;
grant execute on function public.list_notifications(text, integer), public.mark_notification_read(uuid) to authenticated;

create table public.reviews (
  review_id uuid primary key default gen_random_uuid(),
  transaction_kind text not null,
  transaction_id uuid not null,
  author_id uuid not null references auth.users(id) on delete restrict,
  subject_id uuid not null references auth.users(id) on delete restrict,
  rating smallint not null,
  comment text not null default '',
  status text not null default 'published',
  created_at timestamptz not null default statement_timestamp(),
  constraint reviews_kind check (transaction_kind in ('barter', 'order')),
  constraint reviews_distinct_users check (author_id <> subject_id),
  constraint reviews_rating check (rating between 1 and 5),
  constraint reviews_comment check (char_length(comment) <= 1000),
  constraint reviews_status check (status in ('published', 'hidden')),
  constraint reviews_author_once unique (transaction_kind, transaction_id, author_id)
);
create index reviews_subject_recent_idx on public.reviews(subject_id, created_at desc);
alter table public.reviews enable row level security;
create policy reviews_public_read on public.reviews for select to anon, authenticated using (status = 'published' or author_id = (select auth.uid()) or subject_id = (select auth.uid()));
revoke all on public.reviews from public, anon, authenticated;
grant select on public.reviews to anon, authenticated;

create or replace function public.submit_review(p_transaction_kind text, p_transaction_id uuid, p_rating integer, p_comment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_subject uuid; v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if p_transaction_kind not in ('barter', 'order') or p_rating not between 1 and 5 or char_length(btrim(coalesce(p_comment, ''))) > 1000 then raise exception using errcode = '22023', message = 'REVIEW_PAYLOAD_INVALID'; end if;
  if p_transaction_kind = 'barter' then
    select case when party_a = v_actor then party_b else party_a end into v_subject
    from public.transactions where transaction_id = p_transaction_id and lifecycle = 'completed' and v_actor in (party_a, party_b);
  else
    select case when buyer_id = v_actor then seller_id else buyer_id end into v_subject
    from public.orders where order_id = p_transaction_id and lifecycle = 'completed' and v_actor in (buyer_id, seller_id);
  end if;
  if v_subject is null then raise insufficient_privilege using message = 'REVIEW_NOT_ELIGIBLE'; end if;
  insert into public.reviews(transaction_kind, transaction_id, author_id, subject_id, rating, comment)
  values (p_transaction_kind, p_transaction_id, v_actor, v_subject, p_rating, btrim(p_comment))
  on conflict (transaction_kind, transaction_id, author_id) do nothing
  returning review_id into v_id;
  if v_id is null then raise exception using errcode = 'P0001', message = 'REVIEW_ALREADY_EXISTS'; end if;
  perform private.create_notification(v_subject, 'review', 'Ulasan baru', 'Kamu menerima ulasan setelah transaksi selesai.', '/profile', 'review', v_id);
  return jsonb_build_object('id', v_id, 'status', 'published');
end
$$;
revoke all on function public.submit_review(text, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.submit_review(text, uuid, integer, text) to authenticated;

do $$ begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') and not exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then alter publication supabase_realtime add table public.notifications; end if;
end $$;

create or replace function private.reputation_json(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'rating', (select round(avg(rating)::numeric, 2) from public.reviews where subject_id = p_user_id and status = 'published'),
    'reviewCount', (select count(*) from public.reviews where subject_id = p_user_id and status = 'published')
  )
$$;

alter function private.public_listing_dto(uuid, integer) rename to public_listing_dto_base;
create or replace function private.public_listing_dto(p_listing_id uuid, p_distance integer)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_set(
    jsonb_set(base.dto, '{publisher,rating}', reputation.value->'rating', true),
    '{publisher,reviewCount}', reputation.value->'reviewCount', true
  )
  from (select private.public_listing_dto_base(p_listing_id, p_distance) as dto) base
  join public.listings listing on listing.listing_id = p_listing_id
  cross join lateral (select private.reputation_json(listing.owner_id) as value) reputation
$$;

create or replace function public.search_stores(p_query jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('items', coalesce(jsonb_agg(jsonb_build_object(
    'id', store.store_id, 'slug', store.slug, 'name', store.name, 'description', store.description, 'category', store.category,
    'area', jsonb_build_object('id', store.area_id, 'name', store.area_label, 'distanceKm', 0), 'hours', store.operating_hours,
    'handoverMethods', store.handover_methods, 'publicAddress', case when store.public_address_consent then store.public_address else null end,
    'publicAddressConsent', store.public_address_consent, 'rating', (private.reputation_json(store.owner_id)->>'rating')::numeric,
    'reviewCount', (private.reputation_json(store.owner_id)->>'reviewCount')::integer, 'image', null
  ) order by store.created_at desc), '[]'::jsonb), 'nextCursor', null)
  from public.stores store where private.store_public_visible(store.store_id) and (coalesce(p_query->>'query', '') = '' or store.name ilike '%' || (p_query->>'query') || '%')
$$;

create or replace function public.get_store(p_slug text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', store.store_id, 'slug', store.slug, 'name', store.name, 'description', store.description, 'category', store.category,
    'area', jsonb_build_object('id', store.area_id, 'name', store.area_label, 'distanceKm', 0), 'hours', store.operating_hours,
    'handoverMethods', store.handover_methods, 'publicAddress', case when store.public_address_consent then store.public_address else null end,
    'publicAddressConsent', store.public_address_consent, 'rating', (private.reputation_json(store.owner_id)->>'rating')::numeric,
    'reviewCount', (private.reputation_json(store.owner_id)->>'reviewCount')::integer, 'image', null
  ) from public.stores store where store.slug = p_slug and private.store_public_visible(store.store_id)
$$;

revoke all on function private.reputation_json(uuid), private.public_listing_dto_base(uuid, integer), private.public_listing_dto(uuid, integer) from public, anon, authenticated;
grant execute on function private.public_listing_dto(uuid, integer) to anon, authenticated;
