alter table public.reviews add column if not exists store_id uuid references public.stores(store_id) on delete restrict;
create index if not exists reviews_store_recent_idx on public.reviews(store_id, created_at desc) where store_id is not null;

create or replace function private.store_reputation_json(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'rating', (select round(avg(rating)::numeric, 2) from public.reviews where store_id = p_store_id and status = 'published'),
    'reviewCount', (select count(*) from public.reviews where store_id = p_store_id and status = 'published')
  )
$$;

create or replace function public.submit_review(p_transaction_kind text, p_transaction_id uuid, p_rating integer, p_comment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_subject uuid; v_store_id uuid; v_id uuid; v_status text; v_completed_at timestamptz; v_publish_after timestamptz;
begin
  perform private.assert_active_account(v_actor);
  if p_transaction_kind not in ('barter', 'order') or p_rating not between 1 and 5 or char_length(btrim(coalesce(p_comment, ''))) > 1000 then raise exception using errcode = '22023', message = 'REVIEW_PAYLOAD_INVALID'; end if;
  if p_transaction_kind = 'barter' then
    select case when party_a = v_actor then party_b else party_a end, completed_at into v_subject, v_completed_at
    from public.transactions where transaction_id = p_transaction_id and lifecycle = 'completed' and v_actor in (party_a, party_b) for update;
    v_status := 'pending'; v_publish_after := v_completed_at + interval '14 days';
  else
    select case when order_row.buyer_id = v_actor then order_row.seller_id else order_row.buyer_id end, listing.store_id
    into v_subject, v_store_id
    from public.orders order_row join public.listings listing on listing.listing_id = order_row.listing_id
    where order_row.order_id = p_transaction_id and order_row.lifecycle = 'completed' and v_actor in (order_row.buyer_id, order_row.seller_id) for update;
    v_status := 'published'; v_publish_after := null;
  end if;
  if v_subject is null then raise insufficient_privilege using message = 'REVIEW_NOT_ELIGIBLE'; end if;
  insert into public.reviews(transaction_kind, transaction_id, author_id, subject_id, store_id, rating, comment, status, publish_after, published_at)
  values (p_transaction_kind, p_transaction_id, v_actor, v_subject, v_store_id, p_rating, btrim(p_comment), v_status, v_publish_after, case when v_status = 'published' then statement_timestamp() else null end)
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

create or replace function public.list_store_reviews(p_store_id uuid, p_cursor text default null, p_limit integer default 20)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_cursor timestamptz; v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50)); v_items jsonb; v_next text;
begin
  if not exists (select 1 from public.stores where store_id = p_store_id and private.store_public_visible(store_id)) then return jsonb_build_object('items', '[]'::jsonb, 'nextCursor', null); end if;
  if p_cursor is not null and p_cursor <> '' then begin v_cursor := p_cursor::timestamptz; exception when others then raise exception using errcode = '22023', message = 'REVIEW_CURSOR_INVALID'; end; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', page.review_id, 'kind', page.transaction_kind, 'transactionId', page.transaction_id, 'authorName', profile.display_name, 'rating', page.rating, 'comment', page.comment,
    'createdAt', to_char(page.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'reply', case when reply.reply_id is null then null else jsonb_build_object('id', reply.reply_id, 'body', reply.body, 'createdAt', to_char(reply.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end,
    'canReply', store.owner_id = v_actor
  ) order by page.created_at desc, page.review_id desc), '[]'::jsonb), case when count(*) = v_limit then to_char(min(page.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else null end
  into v_items, v_next
  from (select * from public.reviews review where review.store_id = p_store_id and review.status = 'published' and (v_cursor is null or review.created_at < v_cursor) order by review.created_at desc, review.review_id desc limit v_limit) page
  join public.profiles profile on profile.id = page.author_id
  join public.stores store on store.store_id = page.store_id
  left join public.review_replies reply on reply.review_id = page.review_id;
  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end
$$;

create or replace function public.search_stores(p_query jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('items', coalesce(jsonb_agg(jsonb_build_object(
    'id', store.store_id, 'slug', store.slug, 'name', store.name, 'description', store.description, 'category', store.category,
    'area', jsonb_build_object('id', store.area_id, 'name', store.area_label, 'distanceKm', 0), 'hours', store.operating_hours,
    'handoverMethods', store.handover_methods, 'publicAddress', case when store.public_address_consent then store.public_address else null end,
    'publicAddressConsent', store.public_address_consent, 'rating', (private.store_reputation_json(store.store_id)->>'rating')::numeric,
    'reviewCount', (private.store_reputation_json(store.store_id)->>'reviewCount')::integer, 'image', null
  ) order by store.created_at desc), '[]'::jsonb), 'nextCursor', null)
  from public.stores store where private.store_public_visible(store.store_id) and (coalesce(p_query->>'query', '') = '' or store.name ilike '%' || (p_query->>'query') || '%')
$$;

create or replace function public.get_store(p_slug text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', store.store_id, 'slug', store.slug, 'name', store.name, 'description', store.description, 'category', store.category,
    'area', jsonb_build_object('id', store.area_id, 'name', store.area_label, 'distanceKm', 0), 'hours', store.operating_hours,
    'handoverMethods', store.handover_methods, 'publicAddress', case when store.public_address_consent then store.public_address else null end,
    'publicAddressConsent', store.public_address_consent, 'rating', (private.store_reputation_json(store.store_id)->>'rating')::numeric,
    'reviewCount', (private.store_reputation_json(store.store_id)->>'reviewCount')::integer, 'image', null
  ) from public.stores store where store.slug = p_slug and private.store_public_visible(store.store_id)
$$;

revoke all on function private.store_reputation_json(uuid), public.list_store_reviews(uuid, text, integer), public.submit_review(text, uuid, integer, text), public.search_stores(jsonb), public.get_store(text) from public, anon, authenticated;
grant execute on function public.list_store_reviews(uuid, text, integer) to anon, authenticated;
grant execute on function public.submit_review(text, uuid, integer, text) to authenticated;
grant execute on function public.search_stores(jsonb), public.get_store(text) to anon, authenticated;
