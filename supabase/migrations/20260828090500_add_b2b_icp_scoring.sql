alter table public.b2b_opportunities
  add column if not exists icp_team_size integer,
  add column if not exists icp_monthly_inquiries integer,
  add column if not exists icp_lead_sources integer,
  add column if not exists icp_whatsapp_daily boolean,
  add column if not exists icp_followup_pain boolean,
  add column if not exists icp_growth_investment boolean,
  add column if not exists icp_decision_access boolean,
  add column if not exists icp_geography_fit boolean,
  add column if not exists icp_score integer,
  add column if not exists tier text not null default 'UNSCORED',
  add column if not exists score_updated_at timestamptz;

alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_icp_team_size_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_icp_team_size_check check (icp_team_size is null or icp_team_size between 1 and 500);
alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_icp_monthly_inquiries_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_icp_monthly_inquiries_check check (icp_monthly_inquiries is null or icp_monthly_inquiries between 0 and 1000000);
alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_icp_lead_sources_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_icp_lead_sources_check check (icp_lead_sources is null or icp_lead_sources between 1 and 100);
alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_icp_score_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_icp_score_check check (icp_score is null or icp_score between 0 and 100);
alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_tier_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_tier_check check (tier in ('A','B','C','LOW','UNSCORED'));

create index if not exists b2b_opportunities_tier_score_idx on public.b2b_opportunities (tier, icp_score desc, created_at desc);

create or replace function private.recalculate_b2b_icp_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_score integer;
begin
  if new.icp_team_size is null or new.icp_monthly_inquiries is null or new.icp_lead_sources is null
     or new.icp_whatsapp_daily is null or new.icp_followup_pain is null or new.icp_growth_investment is null
     or new.icp_decision_access is null or new.icp_geography_fit is null then
    new.icp_score := null;
    new.tier := 'UNSCORED';
    new.score_updated_at := null;
    return new;
  end if;

  v_score := 0;
  v_score := v_score + case when new.icp_team_size between 5 and 20 then 20 when new.icp_team_size between 2 and 4 then 10 when new.icp_team_size > 20 then 15 else 5 end;
  v_score := v_score + case when new.icp_monthly_inquiries >= 150 then 20 when new.icp_monthly_inquiries >= 75 then 12 when new.icp_monthly_inquiries >= 30 then 6 else 2 end;
  v_score := v_score + case when new.icp_lead_sources >= 2 then 15 else 5 end;
  v_score := v_score + case when new.icp_whatsapp_daily then 10 else 0 end;
  v_score := v_score + case when new.icp_followup_pain then 15 else 0 end;
  v_score := v_score + case when new.icp_growth_investment then 10 else 0 end;
  v_score := v_score + case when new.icp_decision_access then 5 else 0 end;
  v_score := v_score + case when new.icp_geography_fit then 5 else 0 end;

  new.icp_score := v_score;
  new.tier := case when v_score >= 75 then 'A' when v_score >= 60 then 'B' when v_score >= 45 then 'C' else 'LOW' end;
  new.score_updated_at := now();
  return new;
end;
$$;

revoke all on function private.recalculate_b2b_icp_score() from public, anon, authenticated;

drop trigger if exists recalculate_b2b_icp_score on public.b2b_opportunities;
create trigger recalculate_b2b_icp_score
before insert or update of icp_team_size, icp_monthly_inquiries, icp_lead_sources, icp_whatsapp_daily, icp_followup_pain, icp_growth_investment, icp_decision_access, icp_geography_fit
on public.b2b_opportunities
for each row execute function private.recalculate_b2b_icp_score();

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
    icp_team_size, icp_monthly_inquiries, icp_lead_sources, icp_whatsapp_daily, icp_followup_pain,
    icp_growth_investment, icp_decision_access, icp_geography_fit,
    created_at, updated_at
  ) values (
    'WEBSITE_DIAGNOSTIC', new.id, new.company, new.name, new.email, new.phone, new.status, 'NEW',
    v_owner, 'WEB', 'UNKNOWN',
    case when new.recommendation = 'PILOT' then 'Revisar diagnóstico y proponer pilot' else 'Revisar diagnóstico y contactar' end,
    now() + interval '1 day',
    new.team_size, new.monthly_inquiries, new.lead_sources, new.whatsapp_daily, new.followup_pain,
    new.growth_investment, new.role in ('OWNER','MANAGER'), new.location in ('MONTEVIDEO','MALDONADO','CANELONES'),
    new.created_at, now()
  )
  on conflict (source_type, source_id) do update
  set company=excluded.company, contact_name=excluded.contact_name, email=excluded.email, phone=excluded.phone,
      source_status=excluded.source_status, icp_team_size=excluded.icp_team_size,
      icp_monthly_inquiries=excluded.icp_monthly_inquiries, icp_lead_sources=excluded.icp_lead_sources,
      icp_whatsapp_daily=excluded.icp_whatsapp_daily, icp_followup_pain=excluded.icp_followup_pain,
      icp_growth_investment=excluded.icp_growth_investment, icp_decision_access=excluded.icp_decision_access,
      icp_geography_fit=excluded.icp_geography_fit, updated_at=now();
  return new;
end;
$$;

revoke all on function private.sync_b2b_from_commercial_diagnostic() from public, anon, authenticated;
