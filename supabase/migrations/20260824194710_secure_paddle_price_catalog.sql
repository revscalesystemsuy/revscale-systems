revoke execute on function public.get_plan_checkout_config(uuid) from anon, authenticated;

create table if not exists public.billing_price_catalog (
  plan text not null,
  billing_cycle text not null,
  price_usd numeric(10,2) not null,
  paddle_price_id text unique,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (plan, billing_cycle),
  constraint billing_price_catalog_plan_check check (plan in ('STARTER','PROFESSIONAL','ENTERPRISE')),
  constraint billing_price_catalog_cycle_check check (billing_cycle in ('MONTHLY','ANNUAL'))
);

insert into public.billing_price_catalog(plan,billing_cycle,price_usd)
values
  ('STARTER','MONTHLY',99),('STARTER','ANNUAL',990),
  ('PROFESSIONAL','MONTHLY',249),('PROFESSIONAL','ANNUAL',2490),
  ('ENTERPRISE','MONTHLY',499),('ENTERPRISE','ANNUAL',4990)
on conflict(plan,billing_cycle) do update set price_usd=excluded.price_usd, updated_at=now();

alter table public.billing_price_catalog enable row level security;
revoke all on public.billing_price_catalog from public, anon, authenticated;
grant all on public.billing_price_catalog to service_role;
