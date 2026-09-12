create table private.product_events (
  event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default statement_timestamp(),
  source text not null default 'database_trigger',
  environment text not null default 'production',
  is_test boolean not null default false,
  source_key text not null unique,
  attributes_allowlist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint product_events_type check (event_type in (
    'account_completed', 'listing_visibility_started', 'message_sent',
    'transaction_completed', 'order_completed', 'store_activated', 'plus_activated'
  )),
  constraint product_events_entity_type check (entity_type in ('user', 'listing', 'message', 'barter', 'order', 'store')),
  constraint product_events_source check (source in ('database_trigger', 'server_rpc', 'backfill')),
  constraint product_events_environment check (environment in ('production', 'staging', 'development')),
  constraint product_events_source_key check (char_length(source_key) between 3 and 240),
  constraint product_events_attributes check (jsonb_typeof(attributes_allowlist) = 'object')
);
create index product_events_type_time_idx on private.product_events(event_type, occurred_at desc);
create index product_events_actor_time_idx on private.product_events(actor_id, occurred_at desc) where actor_id is not null;
alter table private.product_events enable row level security;
revoke all on private.product_events from public, anon, authenticated;

create table private.user_activity_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  first_event_at timestamptz not null,
  last_event_at timestamptz not null,
  event_count integer not null default 1,
  primary key (user_id, activity_date),
  constraint user_activity_days_count check (event_count > 0),
  constraint user_activity_days_order check (last_event_at >= first_event_at)
);
create index user_activity_days_date_idx on private.user_activity_days(activity_date, user_id);
alter table private.user_activity_days enable row level security;
revoke all on private.user_activity_days from public, anon, authenticated;

create table private.listing_visibility_periods (
  period_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(listing_id) on delete cascade,
  area_id text references public.service_areas(area_id) on delete restrict,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint listing_visibility_periods_order check (ended_at is null or ended_at > started_at)
);
create unique index listing_visibility_periods_open_uidx on private.listing_visibility_periods(listing_id) where ended_at is null;
create index listing_visibility_periods_area_time_idx on private.listing_visibility_periods(area_id, started_at, ended_at);
alter table private.listing_visibility_periods enable row level security;
revoke all on private.listing_visibility_periods from public, anon, authenticated;

create table private.metric_rollups (
  metric_id uuid primary key default gen_random_uuid(),
  metric_key text not null,
  bucket_start date not null,
  dimensions jsonb not null default '{}'::jsonb,
  value numeric(20, 4) not null,
  generated_at timestamptz not null default statement_timestamp(),
  unique (metric_key, bucket_start, dimensions),
  constraint metric_rollups_key check (char_length(metric_key) between 1 and 80),
  constraint metric_rollups_dimensions check (jsonb_typeof(dimensions) = 'object')
);
alter table private.metric_rollups enable row level security;
revoke all on private.metric_rollups from public, anon, authenticated;

create or replace function private.record_product_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_actor_id uuid,
  p_source_key text,
  p_occurred_at timestamptz default statement_timestamp(),
  p_attributes jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_event_id uuid;
  v_occurred_at timestamptz := coalesce(p_occurred_at, statement_timestamp());
  v_attributes jsonb := coalesce(p_attributes, '{}'::jsonb);
  v_activity_date date;
begin
  if p_event_type not in ('account_completed', 'listing_visibility_started', 'message_sent', 'transaction_completed', 'order_completed', 'store_activated', 'plus_activated')
     or p_entity_type not in ('user', 'listing', 'message', 'barter', 'order', 'store')
     or p_entity_id is null
     or char_length(btrim(coalesce(p_source_key, ''))) not between 3 and 240
     or jsonb_typeof(v_attributes) <> 'object' then
    raise exception using errcode = '22023', message = 'PRODUCT_EVENT_INVALID';
  end if;

  insert into private.product_events(event_type, entity_type, entity_id, actor_id, occurred_at, source_key, attributes_allowlist)
  values (p_event_type, p_entity_type, p_entity_id, p_actor_id, v_occurred_at, btrim(p_source_key), v_attributes)
  on conflict (source_key) do nothing
  returning event_id into v_event_id;

  if v_event_id is null then
    select event_id into v_event_id from private.product_events where source_key = btrim(p_source_key);
    return v_event_id;
  end if;

  if p_actor_id is not null then
    v_activity_date := (v_occurred_at at time zone 'UTC')::date;
    insert into private.user_activity_days(user_id, activity_date, first_event_at, last_event_at)
    values (p_actor_id, v_activity_date, v_occurred_at, v_occurred_at)
    on conflict (user_id, activity_date) do update set
      first_event_at = least(private.user_activity_days.first_event_at, excluded.first_event_at),
      last_event_at = greatest(private.user_activity_days.last_event_at, excluded.last_event_at),
      event_count = private.user_activity_days.event_count + 1;
  end if;
  return v_event_id;
end
$$;

create or replace function private.analytics_account_state_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.onboarding_step = 'complete' then
    if tg_op = 'INSERT' then
      perform private.record_product_event('account_completed', 'user', new.user_id, new.user_id, 'account-completed:' || new.user_id::text);
    elsif old.onboarding_step is distinct from new.onboarding_step then
      perform private.record_product_event('account_completed', 'user', new.user_id, new.user_id, 'account-completed:' || new.user_id::text);
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists account_state_analytics_event on private.account_state;
create trigger account_state_analytics_event after insert or update of onboarding_step on private.account_state for each row execute function private.analytics_account_state_event();

create or replace function private.analytics_listing_visibility_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old_visible boolean := false;
  v_new_visible boolean := false;
  v_area_changed boolean := false;
  v_period_id uuid;
begin
  if tg_op = 'UPDATE' then
    v_old_visible := old.lifecycle = 'active' and old.hidden_at is null;
    v_area_changed := old.area_id is distinct from new.area_id;
  end if;
  v_new_visible := new.lifecycle = 'active' and new.hidden_at is null;

  if v_old_visible and (not v_new_visible or v_area_changed) then
    update private.listing_visibility_periods
    set ended_at = greatest(statement_timestamp(), started_at + interval '1 microsecond')
    where listing_id = old.listing_id and ended_at is null;
  end if;

  if v_new_visible and (not v_old_visible or v_area_changed) then
    insert into private.listing_visibility_periods(listing_id, area_id, started_at)
    values (new.listing_id, new.area_id, coalesce(new.published_at, new.created_at, statement_timestamp()))
    returning period_id into v_period_id;
    perform private.record_product_event(
      'listing_visibility_started', 'listing', new.listing_id, new.owner_id,
      'listing-visible:' || v_period_id::text,
      coalesce(new.published_at, new.created_at, statement_timestamp()),
      jsonb_build_object('areaId', new.area_id, 'fulfillmentKind', new.fulfillment_kind)
    );
  end if;
  return new;
end
$$;
drop trigger if exists listings_analytics_visibility on public.listings;
create trigger listings_analytics_visibility after insert or update of lifecycle, hidden_at, area_id, published_at on public.listings for each row execute function private.analytics_listing_visibility_event();

create or replace function private.analytics_message_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.sender_id is not null then
    perform private.record_product_event('message_sent', 'message', new.message_id, new.sender_id, 'message-sent:' || new.message_id::text, new.created_at, jsonb_build_object('conversationId', new.conversation_id));
  end if;
  return new;
end
$$;
drop trigger if exists messages_analytics_event on public.messages;
create trigger messages_analytics_event after insert on public.messages for each row execute function private.analytics_message_event();

create or replace function private.analytics_trade_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'trade_completed' then
    perform private.record_product_event('transaction_completed', 'barter', new.transaction_id, new.actor_id, 'transaction-completed:' || new.transaction_id::text, new.created_at, '{}'::jsonb);
  end if;
  return new;
end
$$;
drop trigger if exists transaction_events_analytics_event on public.transaction_events;
create trigger transaction_events_analytics_event after insert on public.transaction_events for each row execute function private.analytics_trade_event();

create or replace function private.analytics_order_completion_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.lifecycle = 'completed' then
    if tg_op = 'INSERT' then
      perform private.record_product_event('order_completed', 'order', new.order_id, coalesce(auth.uid(), new.buyer_id), 'order-completed:' || new.order_id::text, new.updated_at, jsonb_build_object('kind', new.kind, 'listingId', new.listing_id));
    elsif old.lifecycle is distinct from new.lifecycle then
      perform private.record_product_event('order_completed', 'order', new.order_id, coalesce(auth.uid(), new.buyer_id), 'order-completed:' || new.order_id::text, new.updated_at, jsonb_build_object('kind', new.kind, 'listingId', new.listing_id));
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists orders_analytics_completion on public.orders;
create trigger orders_analytics_completion after insert or update of lifecycle on public.orders for each row execute function private.analytics_order_completion_event();

create or replace function private.analytics_store_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' then
    if tg_op = 'INSERT' then
      perform private.record_product_event('store_activated', 'store', new.store_id, new.owner_id, 'store-activated:' || new.store_id::text, new.created_at, jsonb_build_object('areaId', new.area_id, 'category', new.category));
    elsif old.status is distinct from new.status then
      perform private.record_product_event('store_activated', 'store', new.store_id, new.owner_id, 'store-activated:' || new.store_id::text, new.created_at, jsonb_build_object('areaId', new.area_id, 'category', new.category));
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists stores_analytics_event on public.stores;
create trigger stores_analytics_event after insert or update of status on public.stores for each row execute function private.analytics_store_event();

create or replace function private.analytics_plus_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.record_product_event('plus_activated', 'user', new.user_id, new.user_id, 'plus-activated:' || new.user_id::text || ':' || floor(extract(epoch from new.paid_through))::bigint::text, new.updated_at, '{}'::jsonb);
  elsif old.paid_through is distinct from new.paid_through then
    perform private.record_product_event('plus_activated', 'user', new.user_id, new.user_id, 'plus-activated:' || new.user_id::text || ':' || floor(extract(epoch from new.paid_through))::bigint::text, new.updated_at, '{}'::jsonb);
  end if;
  return new;
end
$$;
drop trigger if exists subscriptions_analytics_event on public.subscriptions;
create trigger subscriptions_analytics_event after insert or update of paid_through on public.subscriptions for each row execute function private.analytics_plus_event();

insert into private.listing_visibility_periods(listing_id, area_id, started_at)
select listing_id, area_id, coalesce(published_at, created_at, statement_timestamp())
from public.listings listing
where lifecycle = 'active' and hidden_at is null
  and not exists (select 1 from private.listing_visibility_periods period where period.listing_id = listing.listing_id and period.ended_at is null);

create or replace function public.get_product_metrics(p_from date default current_date - 28, p_to date default current_date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_from timestamptz := p_from::timestamptz;
  v_to timestamptz := (p_to + 1)::timestamptz;
  v_cohort integer := 0;
  v_d7 integer := 0;
  v_w1 integer := 0;
begin
  if not private.is_admin(v_actor) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 366 then raise exception using errcode = '22023', message = 'METRIC_WINDOW_INVALID'; end if;

  select count(distinct event.actor_id)::integer into v_cohort
  from private.product_events event
  where event.event_type = 'account_completed' and not event.is_test and event.actor_id is not null and event.occurred_at >= v_from and event.occurred_at < v_to;
  select count(distinct cohort.actor_id)::integer into v_d7
  from private.product_events cohort
  where cohort.event_type = 'account_completed' and not cohort.is_test and cohort.actor_id is not null and cohort.occurred_at >= v_from and cohort.occurred_at < v_to
    and exists (select 1 from private.user_activity_days activity where activity.user_id = cohort.actor_id and activity.activity_date = ((cohort.occurred_at at time zone 'UTC')::date + 7));
  select count(distinct cohort.actor_id)::integer into v_w1
  from private.product_events cohort
  where cohort.event_type = 'account_completed' and not cohort.is_test and cohort.actor_id is not null and cohort.occurred_at >= v_from and cohort.occurred_at < v_to
    and exists (select 1 from private.user_activity_days activity where activity.user_id = cohort.actor_id and activity.activity_date between ((cohort.occurred_at at time zone 'UTC')::date + 1) and ((cohort.occurred_at at time zone 'UTC')::date + 7));

  return jsonb_build_object(
    'window', jsonb_build_object('from', p_from, 'to', p_to),
    'activeListingsByArea', coalesce((select jsonb_agg(jsonb_build_object('weekStart', report.week_start, 'areaId', report.area_id, 'activeListings', report.active_listings) order by report.week_start, report.area_id) from (
      select bucket::date as week_start, period.area_id, count(distinct period.listing_id)::integer as active_listings
      from generate_series(date_trunc('week', v_from), date_trunc('week', v_to - interval '1 microsecond'), interval '1 week') bucket
      join private.listing_visibility_periods period on period.started_at < bucket + interval '1 week' and coalesce(period.ended_at, 'infinity'::timestamptz) > bucket
      where period.area_id is not null
      group by bucket::date, period.area_id
    ) report), '[]'::jsonb),
    'completedTransactions', coalesce((select jsonb_agg(jsonb_build_object('kind', report.kind, 'count', report.total) order by report.kind) from (
      select 'barter'::text as kind, count(*)::integer as total from private.product_events event where event.event_type = 'transaction_completed' and not event.is_test and event.occurred_at >= v_from and event.occurred_at < v_to
      union all
      select 'order'::text as kind, count(*)::integer as total from private.product_events event where event.event_type = 'order_completed' and not event.is_test and event.occurred_at >= v_from and event.occurred_at < v_to
    ) report), '[]'::jsonb),
    'averageChatResponseSeconds', (select round(extract(epoch from avg(report.next_created_at - report.created_at))::numeric, 2) from (
      select message.created_at, lead(message.sender_id) over (partition by message.conversation_id order by message.seq) as next_sender_id, lead(message.created_at) over (partition by message.conversation_id order by message.seq) as next_created_at, message.sender_id
      from public.messages message where message.sender_id is not null and message.created_at >= v_from and message.created_at < v_to
    ) report where report.next_sender_id is not null and report.next_sender_id is distinct from report.sender_id),
    'retention', jsonb_build_object('cohortUsers', v_cohort, 'd7Users', v_d7, 'd7Rate', case when v_cohort = 0 then null else round(v_d7::numeric / v_cohort, 4) end, 'w1Users', v_w1, 'w1Rate', case when v_cohort = 0 then null else round(v_w1::numeric / v_cohort, 4) end),
    'activeStoreCount', (select count(*)::integer from public.stores store where store.status = 'active' and private.plus_active(store.owner_id)),
    'activePlusUserCount', (select count(*)::integer from public.subscriptions subscription where subscription.paid_through > statement_timestamp()),
    'generatedAt', statement_timestamp()
  );
end
$$;

revoke all on function private.record_product_event(text, text, uuid, uuid, text, timestamptz, jsonb), private.analytics_account_state_event(), private.analytics_listing_visibility_event(), private.analytics_message_event(), private.analytics_trade_event(), private.analytics_order_completion_event(), private.analytics_store_event(), private.analytics_plus_event(), public.get_product_metrics(date, date) from public, anon, authenticated;
grant execute on function public.get_product_metrics(date, date) to authenticated;
