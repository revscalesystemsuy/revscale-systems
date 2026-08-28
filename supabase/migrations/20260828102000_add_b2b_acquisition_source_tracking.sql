alter table public.b2b_opportunities
  add column if not exists acquisition_source text not null default 'UNKNOWN',
  add column if not exists acquisition_detail text,
  add column if not exists acquisition_campaign text;

alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_acquisition_source_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_acquisition_source_check check (
  acquisition_source in ('UNKNOWN','WEBSITE','WHATSAPP','EMAIL','LINKEDIN','REFERRAL','PARTNER','OUTBOUND','EVENT','OTHER')
);

create index if not exists b2b_opportunities_acquisition_source_idx
  on public.b2b_opportunities (acquisition_source, created_at desc);

update public.b2b_opportunities
set acquisition_source = 'WEBSITE'
where acquisition_source = 'UNKNOWN'
  and source_type in ('WEBSITE_DIAGNOSTIC','PLAN_REQUEST');

create or replace function private.sync_b2b_from_commercial_diagnostic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.platform_admins order by created_at asc limit 1;
  if v_owner is null then raise exception 'No platform admin available for B2B ownership'; end if;

  insert into public.b2b_opportunities (
    source_type, source_id, company, contact_name, email, phone, source_status, stage,
    sales_owner_id, primary_channel, plan_interest, next_step, next_step_due_at,
    acquisition_source,
    icp_team_size, icp_monthly_inquiries, icp_lead_sources, icp_whatsapp_daily, icp_followup_pain,
    icp_growth_investment, icp_decision_access, icp_geography_fit,
    created_at, updated_at
  ) values (
    'WEBSITE_DIAGNOSTIC', new.id, new.company, new.name, new.email, new.phone, new.status, 'NEW',
    v_owner, 'WEB', 'UNKNOWN',
    case when new.recommendation = 'PILOT' then 'Revisar diagnóstico y proponer pilot' else 'Revisar diagnóstico y contactar' end,
    now() + interval '1 day',
    'WEBSITE',
    new.team_size, new.monthly_inquiries, new.lead_sources, new.whatsapp_daily, new.followup_pain,
    new.growth_investment, new.role in ('OWNER','MANAGER'), new.location in ('MONTEVIDEO','MALDONADO','CANELONES'),
    new.created_at, now()
  )
  on conflict (source_type, source_id) do update
  set company=excluded.company,
      contact_name=excluded.contact_name,
      email=excluded.email,
      phone=excluded.phone,
      source_status=excluded.source_status,
      icp_team_size=excluded.icp_team_size,
      icp_monthly_inquiries=excluded.icp_monthly_inquiries,
      icp_lead_sources=excluded.icp_lead_sources,
      icp_whatsapp_daily=excluded.icp_whatsapp_daily,
      icp_followup_pain=excluded.icp_followup_pain,
      icp_growth_investment=excluded.icp_growth_investment,
      icp_decision_access=excluded.icp_decision_access,
      icp_geography_fit=excluded.icp_geography_fit,
      updated_at=now();
  return new;
end;
$$;

create or replace function private.sync_b2b_from_plan_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_paid boolean := (new.payment_status = 'PAID' or new.status = 'ACTIVE');
begin
  select user_id into v_owner from public.platform_admins order by created_at asc limit 1;
  if v_owner is null then raise exception 'No platform admin available for B2B ownership'; end if;

  insert into public.b2b_opportunities (
    source_type, source_id, company, contact_name, email, phone, source_status, stage,
    sales_owner_id, primary_channel, plan_interest, next_step, next_step_due_at,
    acquisition_source, created_at, updated_at
  ) values (
    'PLAN_REQUEST', new.id, coalesce(nullif(trim(new.company),''),'Sin empresa'), new.name, new.email, new.phone,
    coalesce(new.status,'PENDING'), case when v_paid then 'PAID' else 'NEW' end,
    v_owner, 'WEB', case when upper(coalesce(new.plan,'')) in ('STARTER','PROFESSIONAL','ENTERPRISE') then upper(new.plan) else 'UNKNOWN' end,
    case when v_paid then 'Revisar activación y onboarding' else 'Contactar sobre solicitud de plan' end,
    case when v_paid then now() + interval '7 days' else now() + interval '1 day' end,
    'WEBSITE', coalesce(new.created_at, now()), now()
  )
  on conflict (source_type, source_id) do update
  set company = excluded.company,
      contact_name = excluded.contact_name,
      email = excluded.email,
      phone = excluded.phone,
      source_status = excluded.source_status,
      plan_interest = excluded.plan_interest,
      stage = case when public.b2b_opportunities.stage = 'NEW' and v_paid then 'PAID' else public.b2b_opportunities.stage end,
      updated_at = now();
  return new;
end;
$$;
