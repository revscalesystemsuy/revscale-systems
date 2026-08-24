alter table public.plan_requests
  add column if not exists billing_cycle text not null default 'MONTHLY',
  add column if not exists price_usd numeric(10,2),
  add column if not exists payment_status text not null default 'UNPAID',
  add column if not exists billing_provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_transaction_id text,
  add column if not exists paid_at timestamptz;

update public.plan_requests
set price_usd = case upper(plan)
  when 'STARTER' then 99
  when 'PRO' then 249
  when 'PROFESSIONAL' then 249
  when 'ENTERPRISE' then 499
  else 99
end
where price_usd is null;

update public.plan_requests set payment_status = 'MANUAL'
where status = 'ACTIVE' and payment_status = 'UNPAID';

alter table public.plan_requests alter column price_usd set not null;

do $$ begin
  alter table public.plan_requests add constraint plan_requests_billing_cycle_check check (billing_cycle in ('MONTHLY','ANNUAL'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.plan_requests add constraint plan_requests_payment_status_check check (payment_status in ('UNPAID','PAID','MANUAL','FAILED','REFUNDED'));
exception when duplicate_object then null; end $$;

alter table public.subscriptions
  add column if not exists billing_cycle text,
  add column if not exists billing_provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists billing_email text,
  add column if not exists last_payment_status text;

do $$ begin
  alter table public.subscriptions add constraint subscriptions_billing_cycle_check check (billing_cycle is null or billing_cycle in ('MONTHLY','ANNUAL'));
exception when duplicate_object then null; end $$;

create unique index if not exists subscriptions_organization_id_unique_idx on public.subscriptions (organization_id);
create unique index if not exists subscriptions_provider_subscription_unique_idx on public.subscriptions (provider_subscription_id) where provider_subscription_id is not null;

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  plan_request_id uuid references public.plan_requests(id) on delete set null,
  provider_subscription_id text,
  provider_transaction_id text,
  provider_customer_id text,
  provider_status text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_text text
);
create index if not exists billing_events_subscription_idx on public.billing_events (provider_subscription_id, received_at desc);
create index if not exists billing_events_request_idx on public.billing_events (plan_request_id, received_at desc);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from public, anon, authenticated;
grant all on public.billing_events to service_role;

create or replace function private.billing_price_usd(p_plan text, p_cycle text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare
  v_plan text := upper(coalesce(p_plan, ''));
  v_cycle text := upper(coalesce(p_cycle, 'MONTHLY'));
begin
  if v_plan = 'PRO' then v_plan := 'PROFESSIONAL'; end if;
  if v_cycle not in ('MONTHLY','ANNUAL') then raise exception 'Invalid billing cycle' using errcode = '22023'; end if;
  return case v_plan
    when 'STARTER' then case when v_cycle = 'ANNUAL' then 990 else 99 end
    when 'PROFESSIONAL' then case when v_cycle = 'ANNUAL' then 2490 else 249 end
    when 'ENTERPRISE' then case when v_cycle = 'ANNUAL' then 4990 else 499 end
    else null
  end;
end;
$$;
revoke all on function private.billing_price_usd(text,text) from public, anon, authenticated;

create or replace function public.submit_billing_plan_request(
  p_name text, p_company text, p_email text, p_phone text, p_plan text, p_billing_cycle text default 'MONTHLY'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_company text := trim(coalesce(p_company, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := trim(coalesce(p_phone, ''));
  v_plan text := upper(trim(coalesce(p_plan, 'STARTER')));
  v_cycle text := upper(trim(coalesce(p_billing_cycle, 'MONTHLY')));
  v_now timestamptz := now();
  v_count integer;
  v_window timestamptz;
  v_email_key text;
  v_request_id uuid;
  v_price numeric;
begin
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Invalid name' using errcode = '22023'; end if;
  if length(v_company) < 2 or length(v_company) > 160 then raise exception 'Invalid company' using errcode = '22023'; end if;
  if length(v_email) < 5 or length(v_email) > 320 or position('@' in v_email) < 2 then raise exception 'Invalid email' using errcode = '22023'; end if;
  if length(v_phone) > 50 then raise exception 'Invalid phone' using errcode = '22023'; end if;
  if v_plan = 'PRO' then v_plan := 'PROFESSIONAL'; end if;
  if v_plan not in ('STARTER','PROFESSIONAL','ENTERPRISE') then raise exception 'Invalid plan' using errcode = '22023'; end if;
  if v_cycle not in ('MONTHLY','ANNUAL') then raise exception 'Invalid billing cycle' using errcode = '22023'; end if;
  v_price := private.billing_price_usd(v_plan, v_cycle);

  insert into private.plan_request_rate_limits as rl (rate_key, window_started_at, request_count, updated_at)
  values ('global', v_now, 1, v_now)
  on conflict (rate_key) do update
  set request_count = case when rl.window_started_at <= v_now - interval '1 minute' then 1 else rl.request_count + 1 end,
      window_started_at = case when rl.window_started_at <= v_now - interval '1 minute' then v_now else rl.window_started_at end,
      updated_at = v_now
  returning request_count, window_started_at into v_count, v_window;
  if v_count > 60 then raise exception 'Too many requests' using errcode = 'P0001'; end if;

  v_email_key := 'email:' || encode(extensions.digest(v_email, 'sha256'), 'hex');
  insert into private.plan_request_rate_limits as rl (rate_key, window_started_at, request_count, updated_at)
  values (v_email_key, v_now, 1, v_now)
  on conflict (rate_key) do update
  set request_count = case when rl.window_started_at <= v_now - interval '1 hour' then 1 else rl.request_count + 1 end,
      window_started_at = case when rl.window_started_at <= v_now - interval '1 hour' then v_now else rl.window_started_at end,
      updated_at = v_now
  returning request_count, window_started_at into v_count, v_window;
  if v_count > 3 then raise exception 'Too many requests for this email' using errcode = 'P0001'; end if;

  select pr.id into v_request_id from public.plan_requests pr
  where lower(pr.email)=v_email
    and upper(case when pr.plan='PRO' then 'PROFESSIONAL' else pr.plan end)=v_plan
    and pr.billing_cycle=v_cycle
    and coalesce(pr.status,'PENDING')='PENDING'
    and pr.created_at >= v_now - interval '24 hours'
  order by pr.created_at desc limit 1;
  if v_request_id is not null then return v_request_id; end if;

  insert into public.plan_requests(name,company,email,phone,plan,status,billing_cycle,price_usd,payment_status)
  values(v_name,v_company,v_email,nullif(v_phone,''),v_plan,'PENDING',v_cycle,v_price,'UNPAID')
  returning id into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function public.submit_billing_plan_request(text,text,text,text,text,text) from public;
grant execute on function public.submit_billing_plan_request(text,text,text,text,text,text) to anon, authenticated;

create or replace function public.submit_plan_request(p_name text,p_company text,p_email text,p_phone text,p_plan text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform public.submit_billing_plan_request(p_name,p_company,p_email,p_phone,p_plan,'MONTHLY');
  return true;
end;
$$;
revoke all on function public.submit_plan_request(text,text,text,text,text) from public;
grant execute on function public.submit_plan_request(text,text,text,text,text) to anon, authenticated;

create or replace function public.get_plan_checkout_config(p_request_id uuid)
returns table(plan text,billing_cycle text,price_usd numeric,payment_status text,request_status text)
language sql security definer set search_path = '' as $$
  select case when upper(pr.plan)='PRO' then 'PROFESSIONAL' else upper(pr.plan) end,
         pr.billing_cycle,pr.price_usd,pr.payment_status,coalesce(pr.status,'PENDING')
  from public.plan_requests pr
  where pr.id=p_request_id and coalesce(pr.status,'PENDING') in ('PENDING','ACTIVE')
  limit 1;
$$;
revoke all on function public.get_plan_checkout_config(uuid) from public;
grant execute on function public.get_plan_checkout_config(uuid) to anon, authenticated;
