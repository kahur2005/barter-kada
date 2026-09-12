alter function private.search_listings_command(jsonb) rename to search_listings_command_legacy;

create table private.promotion_rotation (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  last_served_at timestamptz,
  served_count bigint not null default 0,
  updated_at timestamptz not null default statement_timestamp(),
  constraint promotion_rotation_count check (served_count >= 0)
);
alter table private.promotion_rotation enable row level security;
revoke all on private.promotion_rotation from public, anon, authenticated;

create or replace function private.claim_promotion_ids(p_listing_ids uuid[], p_slot_limit integer)
returns uuid[] language plpgsql volatile security definer set search_path = '' as $$
declare v_selected uuid[] := array[]::uuid[]; v_listing_id uuid; v_owner_id uuid;
begin
  if coalesce(array_length(p_listing_ids, 1), 0) = 0 or coalesce(p_slot_limit, 0) <= 0 then return v_selected; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('barter-promotion-rotation', 1));
  with one_per_owner as (
    select distinct on (listing.owner_id) listing.listing_id, listing.owner_id, listing.created_at
    from public.listings listing
    join public.stores store on store.store_id = listing.store_id
    where listing.listing_id = any(p_listing_ids)
      and listing.lifecycle = 'active' and listing.hidden_at is null and listing.availability = 'available'
      and listing.store_id is not null and private.store_public_visible(listing.store_id)
      and (listing.fulfillment_kind <> 'preorder' or exists (select 1 from public.preorder_batches batch where batch.listing_id = listing.listing_id and batch.state = 'open' and batch.order_closes_at > statement_timestamp()))
    order by listing.owner_id, listing.created_at desc, listing.listing_id desc
  ), ranked as (
    select candidate.listing_id, candidate.owner_id, rotation.last_served_at, rotation.served_count
    from one_per_owner candidate
    left join private.promotion_rotation rotation on rotation.owner_id = candidate.owner_id
    order by (rotation.owner_id is not null), rotation.last_served_at nulls first, coalesce(rotation.served_count, 0), candidate.owner_id
    limit least(p_slot_limit, greatest(0, array_length(p_listing_ids, 1) / 10))
  )
  select coalesce(array_agg(ranked.listing_id), array[]::uuid[]) into v_selected from ranked;
  foreach v_listing_id in array v_selected loop
    select listing.owner_id into strict v_owner_id from public.listings listing where listing.listing_id = v_listing_id;
    insert into private.promotion_rotation(owner_id, last_served_at, served_count) values (v_owner_id, statement_timestamp(), 1)
    on conflict (owner_id) do update set last_served_at = statement_timestamp(), served_count = private.promotion_rotation.served_count + 1, updated_at = statement_timestamp();
  end loop;
  return v_selected;
end
$$;

create or replace function private.search_listings_command(p_query jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_result jsonb; v_items jsonb := '[]'::jsonb; v_promoted uuid[]; v_item jsonb; v_listing_id uuid; v_index integer := 0; v_slots integer;
begin
  v_result := private.search_listings_command_legacy(p_query);
  v_items := coalesce(v_result->'items', '[]'::jsonb);
  v_slots := jsonb_array_length(v_items) / 10;
  if v_slots > 0 then
    select private.claim_promotion_ids(array(select (item->>'id')::uuid from jsonb_array_elements(v_items) item), v_slots) into v_promoted;
    while v_index < jsonb_array_length(v_items) loop
      v_item := v_items->v_index;
      begin v_listing_id := (v_item->>'id')::uuid; exception when others then v_listing_id := null; end;
      if v_listing_id is not null and v_listing_id = any(coalesce(v_promoted, array[]::uuid[])) then
        v_items := jsonb_set(v_items, array[v_index::text, 'promoted'], 'true'::jsonb, true);
      end if;
      v_index := v_index + 1;
    end loop;
  end if;
  return jsonb_set(v_result, '{items}', v_items, true);
end
$$;

create or replace function public.search_listings(p_query jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select private.search_listings_command(p_query) $$;

revoke all on function private.search_listings_command_legacy(jsonb), private.claim_promotion_ids(uuid[], integer), private.search_listings_command(jsonb) from public, anon, authenticated;
grant execute on function private.search_listings_command(jsonb) to anon, authenticated;
