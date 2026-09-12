create or replace function public.list_my_transactions(p_kind text default 'all')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', item.id,
        'kind', item.kind,
        'lifecycle', item.lifecycle,
        'bucket', item.bucket,
        'actionRequired', item.action_required,
        'actorRole', item.actor_role,
        'counterpartName', item.counterpart_name,
        'publisherKind', item.publisher_kind,
        'publisherName', item.publisher_name,
        'title', item.title,
        'href', item.href,
        'updatedAt', to_char(item.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) order by item.updated_at desc, item.id desc
    ),
    '[]'::jsonb
  )
  from (
    select
      trade.transaction_id as id,
      'barter'::text as kind,
      trade.lifecycle,
      case
        when trade.lifecycle in ('completed', 'cancelled') then 'completed'
        when state.action_required then 'needs_action'
        else 'in_progress'
      end as bucket,
      state.action_required,
      case when trade.party_a = auth.uid() then 'party_a' else 'party_b' end as actor_role,
      case when trade.party_a = auth.uid() then party_b_profile.display_name else party_a_profile.display_name end as counterpart_name,
      case when publisher.publisher_store_id is null then 'personal' else 'store' end as publisher_kind,
      coalesce(publisher.publisher_store_name, party_a_profile.display_name) as publisher_name,
      'Barter dengan ' || case when trade.party_a = auth.uid() then party_b_profile.display_name else party_a_profile.display_name end as title,
      '/transactions/' || trade.transaction_id::text as href,
      trade.updated_at
    from public.transactions trade
    join public.profiles party_a_profile on party_a_profile.id = trade.party_a
    join public.profiles party_b_profile on party_b_profile.id = trade.party_b
    left join public.fulfillments fulfillment on fulfillment.transaction_id = trade.transaction_id
    left join lateral (
      select listing.store_id as publisher_store_id, store.name as publisher_store_name
      from public.transaction_revisions revision
      join public.transaction_items item on item.revision_id = revision.revision_id
      join public.listings listing on listing.listing_id = item.listing_id
      left join public.stores store on store.store_id = listing.store_id
      where revision.transaction_id = trade.transaction_id
        and revision.revision = trade.current_revision
        and item.offered_by = trade.party_a
        and item.listing_id is not null
      order by item.created_at, item.item_id
      limit 1
    ) publisher on true
    cross join lateral (
      select (
        (
          trade.lifecycle = 'negotiating'
          and (
            not exists (
              select 1
              from public.transaction_consents consent
              where consent.transaction_id = trade.transaction_id
                and consent.revision = trade.current_revision
                and consent.user_id = auth.uid()
                and consent.ready_at is not null
            )
            or (
              (select count(*) from public.transaction_consents consent where consent.transaction_id = trade.transaction_id and consent.revision = trade.current_revision and consent.ready_at is not null) = 2
              and not exists (
                select 1
                from public.transaction_consents consent
                where consent.transaction_id = trade.transaction_id
                  and consent.revision = trade.current_revision
                  and consent.user_id = auth.uid()
                  and consent.approved_at is not null
              )
            )
          )
        )
        or (
          trade.lifecycle = 'agreed'
          and (
            exists (
              select 1
              from public.payment_obligations obligation
              where obligation.transaction_id = trade.transaction_id
                and obligation.payee_id = auth.uid()
                and obligation.state = 'due'
            )
            or not coalesce(
              case
                when trade.party_a = auth.uid() then fulfillment.party_a_received_at is not null
                else fulfillment.party_b_received_at is not null
              end,
              false
            )
          )
        )
      ) as action_required
    ) state
    where p_kind in ('all', 'barter')
      and auth.uid() in (trade.party_a, trade.party_b)

    union all

    select
      order_row.order_id as id,
      'order'::text as kind,
      order_row.lifecycle,
      case
        when order_row.lifecycle in ('completed', 'cancelled') then 'completed'
        when state.action_required then 'needs_action'
        else 'in_progress'
      end as bucket,
      state.action_required,
      case when order_row.buyer_id = auth.uid() then 'buyer' else 'seller' end as actor_role,
      case when order_row.buyer_id = auth.uid() then seller_profile.display_name else buyer_profile.display_name end as counterpart_name,
      case when listing.store_id is null then 'personal' else 'store' end as publisher_kind,
      coalesce(store.name, seller_profile.display_name) as publisher_name,
      coalesce((
        select item.name
        from public.order_items item
        join public.order_revisions revision on revision.revision_id = item.revision_id
        where revision.order_id = order_row.order_id
          and revision.revision = order_row.current_revision
        order by item.order_item_id
        limit 1
      ), 'Pesanan') as title,
      '/orders/' || order_row.order_id::text as href,
      order_row.updated_at
    from public.orders order_row
    join public.profiles buyer_profile on buyer_profile.id = order_row.buyer_id
    join public.profiles seller_profile on seller_profile.id = order_row.seller_id
    join public.listings listing on listing.listing_id = order_row.listing_id
    left join public.stores store on store.store_id = listing.store_id
    left join public.order_fulfillments fulfillment on fulfillment.order_id = order_row.order_id
    cross join lateral (
      select (
        (order_row.buyer_id = auth.uid() and order_row.lifecycle = 'quoted')
        or (
          order_row.buyer_id = auth.uid()
          and order_row.lifecycle in ('ready', 'awaiting_receipt')
          and fulfillment.buyer_received_at is null
        )
        or (
          order_row.seller_id = auth.uid()
          and order_row.lifecycle in ('confirmed', 'processing', 'ready')
        )
        or (
          order_row.seller_id = auth.uid()
          and order_row.lifecycle = 'awaiting_dp'
          and exists (
            select 1
            from public.order_payment_obligations obligation
            where obligation.order_id = order_row.order_id
              and obligation.payee_id = auth.uid()
              and obligation.state = 'due'
          )
        )
      ) as action_required
    ) state
    where p_kind in ('all', 'order')
      and auth.uid() in (order_row.buyer_id, order_row.seller_id)
  ) item
$$;

revoke all on function public.list_my_transactions(text) from public, anon, authenticated;
grant execute on function public.list_my_transactions(text) to authenticated;
