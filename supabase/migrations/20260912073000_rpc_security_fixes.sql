create or replace function public.mark_notification_read(p_notification_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
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

create or replace function public.create_plus_billing_order(p_method text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if p_method not in ('qris', 'virtual_account') then raise exception using errcode = '22023', message = 'BILLING_METHOD_INVALID'; end if;
  insert into public.billing_orders(buyer_id, method) values (v_actor, p_method) returning billing_order_id into v_id;
  return jsonb_build_object('id', v_id, 'amountRupiah', '20000', 'method', p_method, 'mode', 'dummy', 'status', 'pending', 'expiresAt', to_char(statement_timestamp() + interval '30 minutes' at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
end
$$;

create or replace function public.simulate_plus_billing(p_billing_order_id uuid, p_result text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_order public.billing_orders%rowtype; v_expiry timestamptz;
begin
  perform private.assert_active_account(v_actor);
  select * into strict v_order from public.billing_orders where billing_order_id = p_billing_order_id and buyer_id = v_actor for update;
  if p_result not in ('succeeded', 'failed', 'expired') then raise exception using errcode = '22023', message = 'BILLING_RESULT_INVALID'; end if;
  if v_order.status <> 'pending' then return jsonb_build_object('id', v_order.billing_order_id, 'status', v_order.status, 'active', private.plus_active(v_actor)); end if;
  update public.billing_orders set status = p_result, activated_at = case when p_result = 'succeeded' then statement_timestamp() else null end where billing_order_id = v_order.billing_order_id;
  if p_result = 'succeeded' then
    select greatest(coalesce((select paid_through from public.subscriptions where user_id = v_actor), statement_timestamp()), statement_timestamp()) + interval '1 month' into v_expiry;
    insert into public.subscriptions(user_id, paid_through, source, last_billing_order_id) values (v_actor, v_expiry, 'dummy', v_order.billing_order_id)
    on conflict (user_id) do update set paid_through = excluded.paid_through, source = excluded.source, last_billing_order_id = excluded.last_billing_order_id, updated_at = statement_timestamp();
  end if;
  return jsonb_build_object('id', v_order.billing_order_id, 'status', p_result, 'active', private.plus_active(v_actor));
end
$$;

create or replace function public.create_store(p_slug text, p_name text, p_description text, p_category text, p_area_id text, p_area_label text, p_operating_hours text, p_handover_methods text[], p_public_address text, p_public_address_consent boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if not private.plus_active(v_actor) then raise exception using errcode = 'P0001', message = 'PLUS_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':stores', 1));
  if (select count(*) from public.stores where owner_id = v_actor) >= 3 then raise exception using errcode = 'P0001', message = 'STORE_LIMIT_REACHED'; end if;
  if p_public_address_consent = false then p_public_address := null; end if;
  insert into public.stores(owner_id, slug, name, description, category, area_id, area_label, operating_hours, handover_methods, public_address, public_address_consent)
  values (v_actor, lower(btrim(p_slug)), btrim(p_name), left(btrim(coalesce(p_description, '')), 2000), btrim(p_category), p_area_id, btrim(p_area_label), left(btrim(coalesce(p_operating_hours, '')), 500), p_handover_methods, p_public_address, p_public_address_consent) returning store_id into v_id;
  return (select jsonb_build_object('id', store_id, 'slug', slug, 'name', name, 'description', description, 'category', category, 'areaLabel', area_label, 'status', status) from public.stores where store_id = v_id);
exception when unique_violation then raise exception using errcode = 'P0001', message = 'STORE_SLUG_TAKEN';
end
$$;
