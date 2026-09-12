create or replace function public.list_my_transactions(p_kind text default 'all')
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', item.id, 'kind', item.kind, 'lifecycle', item.lifecycle, 'counterpartName', item.counterpart_name,
    'title', item.title, 'href', item.href, 'updatedAt', to_char(item.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) order by item.updated_at desc, item.id desc), '[]'::jsonb)
  from (
    select trade.transaction_id as id, 'barter'::text as kind, trade.lifecycle,
      case when trade.party_a = auth.uid() then party_b_profile.display_name else party_a_profile.display_name end as counterpart_name,
      'Barter dengan ' || case when trade.party_a = auth.uid() then party_b_profile.display_name else party_a_profile.display_name end as title,
      '/transactions/' || trade.transaction_id::text as href, trade.updated_at
    from public.transactions trade
    join public.profiles party_a_profile on party_a_profile.id = trade.party_a
    join public.profiles party_b_profile on party_b_profile.id = trade.party_b
    where p_kind in ('all', 'barter') and auth.uid() in (trade.party_a, trade.party_b)
    union all
    select order_row.order_id as id, 'order'::text as kind, order_row.lifecycle,
      case when order_row.buyer_id = auth.uid() then seller_profile.display_name else buyer_profile.display_name end as counterpart_name,
      coalesce((select item.name from public.order_items item join public.order_revisions revision on revision.revision_id = item.revision_id where revision.order_id = order_row.order_id and revision.revision = order_row.current_revision order by item.order_item_id limit 1), 'Pesanan') as title,
      '/orders/' || order_row.order_id::text as href, order_row.updated_at
    from public.orders order_row
    join public.profiles buyer_profile on buyer_profile.id = order_row.buyer_id
    join public.profiles seller_profile on seller_profile.id = order_row.seller_id
    where p_kind in ('all', 'order') and auth.uid() in (order_row.buyer_id, order_row.seller_id)
  ) item
$$;
revoke all on function public.list_my_transactions(text) from public, anon, authenticated;
grant execute on function public.list_my_transactions(text) to authenticated;
