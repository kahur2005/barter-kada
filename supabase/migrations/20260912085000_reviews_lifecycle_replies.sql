alter table public.reviews add column if not exists publish_after timestamptz;
alter table public.reviews add column if not exists published_at timestamptz;
update public.reviews set published_at = coalesce(published_at, created_at) where status = 'published';
alter table public.reviews drop constraint if exists reviews_status;
alter table public.reviews add constraint reviews_status check (status in ('pending', 'published', 'hidden'));
create index if not exists reviews_publish_due_idx on public.reviews(status, publish_after) where status = 'pending';

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select to anon, authenticated using (status = 'published' or author_id = (select auth.uid()));

create table public.review_replies (
  reply_id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(review_id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint review_replies_body check (char_length(body) between 1 and 1000),
  constraint review_replies_once unique (review_id)
);
create index review_replies_review_idx on public.review_replies(review_id, created_at);
alter table public.review_replies enable row level security;
create policy review_replies_public_read on public.review_replies for select to anon, authenticated using (exists (select 1 from public.reviews review where review.review_id = review_replies.review_id and review.status = 'published'));
revoke all on public.review_replies from public, anon, authenticated;
grant select on public.review_replies to anon, authenticated;

create or replace function public.submit_review(p_transaction_kind text, p_transaction_id uuid, p_rating integer, p_comment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_subject uuid; v_id uuid; v_status text; v_completed_at timestamptz; v_publish_after timestamptz;
begin
  perform private.assert_active_account(v_actor);
  if p_transaction_kind not in ('barter', 'order') or p_rating not between 1 and 5 or char_length(btrim(coalesce(p_comment, ''))) > 1000 then raise exception using errcode = '22023', message = 'REVIEW_PAYLOAD_INVALID'; end if;
  if p_transaction_kind = 'barter' then
    select case when party_a = v_actor then party_b else party_a end, completed_at into v_subject, v_completed_at
    from public.transactions where transaction_id = p_transaction_id and lifecycle = 'completed' and v_actor in (party_a, party_b) for update;
    v_status := 'pending'; v_publish_after := v_completed_at + interval '14 days';
  else
    select case when buyer_id = v_actor then seller_id else buyer_id end into v_subject
    from public.orders where order_id = p_transaction_id and lifecycle = 'completed' and v_actor in (buyer_id, seller_id) for update;
    v_status := 'published'; v_publish_after := null;
  end if;
  if v_subject is null then raise insufficient_privilege using message = 'REVIEW_NOT_ELIGIBLE'; end if;
  insert into public.reviews(transaction_kind, transaction_id, author_id, subject_id, rating, comment, status, publish_after, published_at)
  values (p_transaction_kind, p_transaction_id, v_actor, v_subject, p_rating, btrim(p_comment), v_status, v_publish_after, case when v_status = 'published' then statement_timestamp() else null end)
  on conflict (transaction_kind, transaction_id, author_id) do nothing
  returning review_id into v_id;
  if v_id is null then raise exception using errcode = 'P0001', message = 'REVIEW_ALREADY_EXISTS'; end if;
  if p_transaction_kind = 'barter' and (select count(*) from public.reviews where transaction_kind = 'barter' and transaction_id = p_transaction_id) = 2 then
    update public.reviews set status = 'published', published_at = coalesce(published_at, statement_timestamp()), publish_after = null where transaction_kind = 'barter' and transaction_id = p_transaction_id and status = 'pending';
    v_status := 'published';
  end if;
  if v_status = 'published' then
    perform private.create_notification(review.subject_id, 'review', 'Ulasan baru', 'Kamu menerima ulasan setelah transaksi selesai.', '/reviews?subjectId=' || review.subject_id::text, 'review', review.review_id)
    from public.reviews review where review.transaction_kind = p_transaction_kind and review.transaction_id = p_transaction_id and review.status = 'published';
  end if;
  return jsonb_build_object('id', v_id, 'status', v_status);
end
$$;

create or replace function public.list_reviews(p_subject_id uuid, p_cursor text default null, p_limit integer default 20)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_cursor timestamptz; v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50)); v_items jsonb; v_next text;
begin
  if p_cursor is not null and p_cursor <> '' then begin v_cursor := p_cursor::timestamptz; exception when others then raise exception using errcode = '22023', message = 'REVIEW_CURSOR_INVALID'; end; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', page.review_id, 'kind', page.transaction_kind, 'transactionId', page.transaction_id, 'authorName', profile.display_name, 'rating', page.rating, 'comment', page.comment,
    'createdAt', to_char(page.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'reply', case when reply.reply_id is null then null else jsonb_build_object('id', reply.reply_id, 'body', reply.body, 'createdAt', to_char(reply.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end,
    'canReply', page.subject_id = v_actor
  ) order by page.created_at desc, page.review_id desc), '[]'::jsonb), case when count(*) = v_limit then to_char(min(page.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else null end
  into v_items, v_next
  from (select * from public.reviews review where review.subject_id = p_subject_id and review.status = 'published' and (v_cursor is null or review.created_at < v_cursor) order by review.created_at desc, review.review_id desc limit v_limit) page
  join public.profiles profile on profile.id = page.author_id
  left join public.review_replies reply on reply.review_id = page.review_id;
  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end
$$;

create or replace function public.reply_review(p_review_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_review public.reviews%rowtype; v_id uuid; v_created_at timestamptz;
begin
  perform private.assert_active_account(v_actor);
  select * into strict v_review from public.reviews where review_id = p_review_id and status = 'published' and subject_id = v_actor for update;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 1000 then raise exception using errcode = '22023', message = 'REVIEW_REPLY_INVALID'; end if;
  insert into public.review_replies(review_id, author_id, body) values (p_review_id, v_actor, btrim(p_body)) returning reply_id, created_at into v_id, v_created_at;
  perform private.create_notification(v_review.author_id, 'review', 'Balasan ulasan', 'Pemilik profil membalas ulasanmu.', '/reviews?subjectId=' || v_actor::text, 'review_reply', p_review_id);
  return jsonb_build_object('id', v_id, 'reviewId', p_review_id, 'body', btrim(p_body), 'createdAt', to_char(v_created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
exception when no_data_found then raise exception using errcode = 'P0001', message = 'REVIEW_REPLY_FORBIDDEN';
end
$$;

create or replace function public.publish_due_reviews()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer := 0; v_review record;
begin
  for v_review in select review_id, subject_id from public.reviews where status = 'pending' and publish_after is not null and publish_after <= statement_timestamp() for update loop
    update public.reviews set status = 'published', published_at = statement_timestamp(), publish_after = null where review_id = v_review.review_id;
    perform private.create_notification(v_review.subject_id, 'review', 'Ulasan baru', 'Kamu menerima ulasan setelah transaksi selesai.', '/reviews?subjectId=' || v_review.subject_id::text, 'review', v_review.review_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end
$$;

revoke all on function public.submit_review(text, uuid, integer, text), public.list_reviews(uuid, text, integer), public.reply_review(uuid, text), public.publish_due_reviews() from public, anon, authenticated;
grant execute on function public.submit_review(text, uuid, integer, text), public.list_reviews(uuid, text, integer), public.reply_review(uuid, text) to authenticated;
grant execute on function public.list_reviews(uuid, text, integer) to anon;
grant execute on function public.publish_due_reviews() to service_role;
