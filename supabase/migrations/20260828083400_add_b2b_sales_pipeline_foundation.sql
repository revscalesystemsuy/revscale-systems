create table if not exists public.b2b_opportunities (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('WEBSITE_DIAGNOSTIC','PLAN_REQUEST','MANUAL')),
  source_id uuid,
  company text not null,
  contact_name text,
  email text,
  phone text,
  source_status text,
  stage text not null default 'NEW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists b2b_opportunities_stage_created_idx on public.b2b_opportunities (stage, created_at desc);
create index if not exists b2b_opportunities_company_idx on public.b2b_opportunities (lower(company));

alter table public.b2b_opportunities enable row level security;
revoke all on table public.b2b_opportunities from anon, public;
grant select on table public.b2b_opportunities to authenticated;
grant select, insert, update, delete on table public.b2b_opportunities to service_role;

create policy "platform admins can view b2b opportunities"
on public.b2b_opportunities
for select
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

create or replace function private.sync_b2b_from_commercial_diagnostic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.b2b_opportunities (
    source_type, source_id, company, contact_name, email, phone, source_status, stage, created_at, updated_at
  ) values (
    'WEBSITE_DIAGNOSTIC', new.id, new.company, new.name, new.email, new.phone, new.status, 'NEW', new.created_at, now()
  )
  on conflict (source_type, source_id) do update
  set company = excluded.company,
      contact_name = excluded.contact_name,
      email = excluded.email,
      phone = excluded.phone,
      source_status = excluded.source_status,
      updated_at = now();
  return new;
end;
$$;

revoke all on function private.sync_b2b_from_commercial_diagnostic() from public, anon, authenticated;

drop trigger if exists sync_b2b_commercial_diagnostic on public.commercial_diagnostics;
create trigger sync_b2b_commercial_diagnostic
after insert or update on public.commercial_diagnostics
for each row execute function private.sync_b2b_from_commercial_diagnostic();

create or replace function private.sync_b2b_from_plan_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.b2b_opportunities (
    source_type, source_id, company, contact_name, email, phone, source_status, stage, created_at, updated_at
  ) values (
    'PLAN_REQUEST', new.id, coalesce(nullif(trim(new.company),''),'Sin empresa'), new.name, new.email, new.phone,
    coalesce(new.status,'PENDING'),
    case when new.payment_status = 'PAID' or new.status = 'ACTIVE' then 'PAID' else 'NEW' end,
    coalesce(new.created_at, now()), now()
  )
  on conflict (source_type, source_id) do update
  set company = excluded.company,
      contact_name = excluded.contact_name,
      email = excluded.email,
      phone = excluded.phone,
      source_status = excluded.source_status,
      stage = case
        when public.b2b_opportunities.stage = 'NEW' and (new.payment_status = 'PAID' or new.status = 'ACTIVE') then 'PAID'
        else public.b2b_opportunities.stage
      end,
      updated_at = now();
  return new;
end;
$$;

revoke all on function private.sync_b2b_from_plan_request() from public, anon, authenticated;

drop trigger if exists sync_b2b_plan_request on public.plan_requests;
create trigger sync_b2b_plan_request
after insert or update on public.plan_requests
for each row execute function private.sync_b2b_from_plan_request();

insert into public.b2b_opportunities (source_type, source_id, company, contact_name, email, phone, source_status, stage, created_at, updated_at)
select 'WEBSITE_DIAGNOSTIC', d.id, d.company, d.name, d.email, d.phone, d.status, 'NEW', d.created_at, now()
from public.commercial_diagnostics d
on conflict (source_type, source_id) do nothing;

insert into public.b2b_opportunities (source_type, source_id, company, contact_name, email, phone, source_status, stage, created_at, updated_at)
select 'PLAN_REQUEST', p.id, coalesce(nullif(trim(p.company),''),'Sin empresa'), p.name, p.email, p.phone,
       coalesce(p.status,'PENDING'),
       case when p.payment_status = 'PAID' or p.status = 'ACTIVE' then 'PAID' else 'NEW' end,
       coalesce(p.created_at, now()), now()
from public.plan_requests p
on conflict (source_type, source_id) do nothing;
