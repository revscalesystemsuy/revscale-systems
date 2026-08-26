create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  agent_id uuid,
  operation text not null default 'ALL',
  brokerage_rate numeric(7,4) not null default 3.0000,
  agent_split_rate numeric(7,4) not null default 50.0000,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commission_rules_operation_check check (operation in ('ALL','COMPRA','ALQUILER')),
  constraint commission_rules_brokerage_rate_check check (brokerage_rate >= 0 and brokerage_rate <= 100),
  constraint commission_rules_agent_split_rate_check check (agent_split_rate >= 0 and agent_split_rate <= 100)
);

create unique index if not exists commission_rules_org_agent_operation_uidx on public.commission_rules(organization_id, coalesce(agent_id,'00000000-0000-0000-0000-000000000000'::uuid), operation);
create index if not exists commission_rules_org_active_idx on public.commission_rules(organization_id,is_active);
create index if not exists commission_rules_agent_idx on public.commission_rules(agent_id) where agent_id is not null;

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid,
  operation text,
  currency text not null default 'USD',
  deal_amount numeric(18,2),
  deal_amount_source text not null default 'ESTIMATED',
  brokerage_rate numeric(7,4) not null default 3.0000,
  gross_commission numeric(18,2) not null default 0,
  agent_split_rate numeric(7,4) not null default 50.0000,
  agent_commission numeric(18,2) not null default 0,
  office_commission numeric(18,2) not null default 0,
  collected_amount numeric(18,2) not null default 0,
  payment_status text not null default 'PENDING',
  due_date date,
  paid_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commissions_lead_unique unique (organization_id,lead_id),
  constraint commissions_operation_check check (operation is null or operation in ('COMPRA','ALQUILER')),
  constraint commissions_deal_source_check check (deal_amount_source in ('ESTIMATED','ACTUAL')),
  constraint commissions_payment_status_check check (payment_status in ('PENDING','PARTIAL','PAID','CANCELLED')),
  constraint commissions_rates_check check (brokerage_rate >= 0 and brokerage_rate <= 100 and agent_split_rate >= 0 and agent_split_rate <= 100),
  constraint commissions_amounts_check check (coalesce(deal_amount,0) >= 0 and gross_commission >= 0 and agent_commission >= 0 and office_commission >= 0 and collected_amount >= 0)
);

create index if not exists commissions_org_status_idx on public.commissions(organization_id,payment_status,created_at desc);
create index if not exists commissions_agent_idx on public.commissions(agent_id,created_at desc) where agent_id is not null;
create index if not exists commissions_lead_idx on public.commissions(lead_id);

grant select,insert,update,delete on public.commission_rules to authenticated;
grant select,insert,update,delete on public.commissions to authenticated;
alter table public.commission_rules enable row level security;
alter table public.commissions enable row level security;

drop policy if exists commission_rules_select on public.commission_rules;
create policy commission_rules_select on public.commission_rules for select to authenticated using (
  exists(select 1 from public.organization_members om where om.organization_id=commission_rules.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))
);
drop policy if exists commission_rules_manage on public.commission_rules;
drop policy if exists commission_rules_insert on public.commission_rules;
create policy commission_rules_insert on public.commission_rules for insert to authenticated with check (
  exists(select 1 from public.organization_members om where om.organization_id=commission_rules.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))
);
drop policy if exists commission_rules_update on public.commission_rules;
create policy commission_rules_update on public.commission_rules for update to authenticated using (
  exists(select 1 from public.organization_members om where om.organization_id=commission_rules.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))
) with check (
  exists(select 1 from public.organization_members om where om.organization_id=commission_rules.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))
);
drop policy if exists commission_rules_delete on public.commission_rules;
create policy commission_rules_delete on public.commission_rules for delete to authenticated using (
  exists(select 1 from public.organization_members om where om.organization_id=commission_rules.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role='OWNER')
);

drop policy if exists commissions_select on public.commissions;
create policy commissions_select on public.commissions for select to authenticated using (
  exists(select 1 from public.organization_members om where om.organization_id=commissions.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and (om.role in ('OWNER','MANAGER') or commissions.agent_id=om.user_id))
);
drop policy if exists commissions_manage on public.commissions;
create policy commissions_manage on public.commissions for insert to authenticated with check (
  exists(select 1 from public.organization_members om where om.organization_id=commissions.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))
);
drop policy if exists commissions_update on public.commissions;
create policy commissions_update on public.commissions for update to authenticated using (
  exists(select 1 from public.organization_members om where om.organization_id=commissions.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))
) with check (
  exists(select 1 from public.organization_members om where om.organization_id=commissions.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))
);
drop policy if exists commissions_delete on public.commissions;
create policy commissions_delete on public.commissions for delete to authenticated using (
  exists(select 1 from public.organization_members om where om.organization_id=commissions.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role='OWNER')
);

create or replace function private.recalculate_commission_values()
returns trigger language plpgsql set search_path='' as $$
begin
  new.gross_commission := round(coalesce(new.deal_amount,0) * coalesce(new.brokerage_rate,0) / 100.0,2);
  new.agent_commission := round(new.gross_commission * coalesce(new.agent_split_rate,0) / 100.0,2);
  new.office_commission := greatest(new.gross_commission - new.agent_commission,0);
  if new.payment_status='PAID' and new.paid_at is null then new.paid_at:=now(); end if;
  if new.payment_status<>'PAID' then new.paid_at:=null; end if;
  new.updated_at:=now();
  return new;
end; $$;
revoke all on function private.recalculate_commission_values() from public, anon, authenticated;

drop trigger if exists trg_recalculate_commission_values on public.commissions;
create trigger trg_recalculate_commission_values before insert or update of deal_amount,brokerage_rate,agent_split_rate,payment_status on public.commissions for each row execute function private.recalculate_commission_values();

create or replace function private.create_commission_on_won()
returns trigger language plpgsql security definer set search_path='' as $$
declare r record; v_brokerage numeric:=3; v_split numeric:=50;
begin
  if new.pipeline_stage='WON' and (tg_op='INSERT' or old.pipeline_stage is distinct from new.pipeline_stage) then
    select cr.brokerage_rate,cr.agent_split_rate into r
    from public.commission_rules cr
    where cr.organization_id=new.organization_id and cr.is_active and cr.operation in (coalesce(new.operation,'COMPRA'),'ALL') and (cr.agent_id=new.assigned_to or cr.agent_id is null)
    order by (cr.agent_id is not null) desc,(cr.operation<>'ALL') desc limit 1;
    if found then v_brokerage:=r.brokerage_rate; v_split:=r.agent_split_rate; end if;
    insert into public.commissions(organization_id,lead_id,agent_id,operation,currency,deal_amount,deal_amount_source,brokerage_rate,agent_split_rate,created_by)
    values(new.organization_id,new.id,new.assigned_to,case when upper(coalesce(new.operation,''))='ALQUILER' then 'ALQUILER' else 'COMPRA' end,coalesce(new.currency,'USD'),new.budget_max,'ESTIMATED',v_brokerage,v_split,new.assigned_to)
    on conflict (organization_id,lead_id) do nothing;
  end if;
  return new;
end; $$;
revoke all on function private.create_commission_on_won() from public, anon, authenticated;

drop trigger if exists trg_create_commission_on_won on public.leads;
create trigger trg_create_commission_on_won after insert or update of pipeline_stage on public.leads for each row execute function private.create_commission_on_won();

insert into public.commissions(organization_id,lead_id,agent_id,operation,currency,deal_amount,deal_amount_source,brokerage_rate,agent_split_rate,created_by)
select l.organization_id,l.id,l.assigned_to,case when upper(coalesce(l.operation,''))='ALQUILER' then 'ALQUILER' else 'COMPRA' end,coalesce(l.currency,'USD'),l.budget_max,'ESTIMATED',3,50,l.assigned_to
from public.leads l
join public.subscriptions s on s.organization_id=l.organization_id and upper(coalesce(s.status,''))='ACTIVE'
where l.pipeline_stage='WON' and upper(coalesce(s.plan,'')) in ('PROFESSIONAL','PRO','ENTERPRISE')
on conflict (organization_id,lead_id) do nothing;
