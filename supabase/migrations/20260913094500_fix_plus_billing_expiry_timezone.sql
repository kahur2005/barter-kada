-- Keep the dummy invoice response in UTC. Parenthesize the timestamptz
-- expression before applying AT TIME ZONE so PostgreSQL does not try to
-- convert the interval itself.
create or replace function public.create_plus_billing_order(p_method text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  perform private.assert_active_account(v_actor);
  if p_method not in ('qris', 'virtual_account') then raise exception using errcode = '22023', message = 'BILLING_METHOD_INVALID'; end if;
  insert into public.billing_orders(buyer_id, method) values (v_actor, p_method) returning billing_order_id into v_id;
  return jsonb_build_object('id', v_id, 'amountRupiah', '20000', 'method', p_method, 'mode', 'dummy', 'status', 'pending', 'expiresAt', to_char((statement_timestamp() + interval '30 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
end
$$;
