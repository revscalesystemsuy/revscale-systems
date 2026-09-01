alter table public.b2b_leak_audits
  add column if not exists attribution_source text,
  add column if not exists attribution_medium text,
  add column if not exists attribution_campaign text,
  add column if not exists attribution_term text,
  add column if not exists attribution_content text,
  add column if not exists attribution_gclid text,
  add column if not exists attribution_fbclid text,
  add column if not exists attribution_landing_path text;
create index if not exists b2b_leak_audits_attribution_idx on public.b2b_leak_audits(attribution_campaign, created_at desc);
create index if not exists b2b_leak_audits_contact_email_idx on public.b2b_leak_audits(lower(contact_email)) where contact_email is not null;

create table if not exists public.b2b_paid_media_spend (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('GOOGLE_SEARCH','META_RETARGETING')),
  campaign_key text not null,
  spend_date date not null,
  spend_usd numeric not null check (spend_usd >= 0),
  impressions integer check (impressions is null or impressions >= 0),
  clicks integer check (clicks is null or clicks >= 0),
  source_reference text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel,campaign_key,spend_date),
  check (nullif(trim(source_reference),'') is not null)
);

create table if not exists public.b2b_paid_optimization_reviews (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('GOOGLE_SEARCH','META_RETARGETING')),
  campaign_key text not null,
  period_start date not null,
  period_end date not null,
  spend_usd numeric not null check (spend_usd >= 0),
  qualified_demo_count integer not null check (qualified_demo_count >= 0),
  cost_per_qualified_demo_usd numeric check (cost_per_qualified_demo_usd is null or cost_per_qualified_demo_usd >= 0),
  expected_first_year_gross_profit_usd numeric check (expected_first_year_gross_profit_usd is null or expected_first_year_gross_profit_usd > 0),
  cpqd_to_gross_profit_ratio numeric check (cpqd_to_gross_profit_ratio is null or cpqd_to_gross_profit_ratio >= 0),
  traffic_quality text not null default 'UNKNOWN' check (traffic_quality in ('UNKNOWN','CLEAN','MIXED','NON_ICP')),
  verdict text not null check (verdict in ('NO_DATA','NEEDS_GROSS_PROFIT','NO_QUALIFIED_DEMOS','KEEP_TESTING','ADJUST','PAUSE_OR_REWORK')),
  reason text not null,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (jsonb_typeof(evidence_snapshot)='object')
);
create index if not exists b2b_paid_media_spend_campaign_idx on public.b2b_paid_media_spend(channel,campaign_key,spend_date desc);
create index if not exists b2b_paid_optimization_reviews_campaign_idx on public.b2b_paid_optimization_reviews(channel,campaign_key,created_at desc);
alter table public.b2b_paid_media_spend enable row level security;
alter table public.b2b_paid_optimization_reviews enable row level security;
drop policy if exists "platform admins can view paid media spend" on public.b2b_paid_media_spend;
create policy "platform admins can view paid media spend" on public.b2b_paid_media_spend for select using (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));
drop policy if exists "platform admins can insert paid media spend" on public.b2b_paid_media_spend;
create policy "platform admins can insert paid media spend" on public.b2b_paid_media_spend for insert with check (created_by=(select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));
drop policy if exists "platform admins can update paid media spend" on public.b2b_paid_media_spend;
create policy "platform admins can update paid media spend" on public.b2b_paid_media_spend for update using (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));
drop policy if exists "platform admins can view paid optimization reviews" on public.b2b_paid_optimization_reviews;
create policy "platform admins can view paid optimization reviews" on public.b2b_paid_optimization_reviews for select using (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));
drop policy if exists "platform admins can insert paid optimization reviews" on public.b2b_paid_optimization_reviews;
create policy "platform admins can insert paid optimization reviews" on public.b2b_paid_optimization_reviews for insert with check (created_by=(select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));

create or replace function public.submit_leak_audit_attributed(
  p_company text,p_contact_name text,p_contact_email text,p_source_filename text,p_row_count integer,p_score integer,
  p_unowned_count integer,p_no_next_step_count integer,p_overdue_followup_count integer,p_high_intent_inactive_count integer,
  p_reactivation_candidate_count integer,p_median_age_days numeric,p_median_first_response_minutes numeric,p_stage_distribution jsonb,p_metric_snapshot jsonb,
  p_attribution_source text default null,p_attribution_medium text default null,p_attribution_campaign text default null,p_attribution_term text default null,
  p_attribution_content text default null,p_attribution_gclid text default null,p_attribution_fbclid text default null,p_attribution_landing_path text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  v_id:=public.submit_leak_audit(p_company,p_contact_name,p_contact_email,p_source_filename,p_row_count,p_score,p_unowned_count,p_no_next_step_count,p_overdue_followup_count,p_high_intent_inactive_count,p_reactivation_candidate_count,p_median_age_days,p_median_first_response_minutes,p_stage_distribution,p_metric_snapshot);
  update public.b2b_leak_audits set
    attribution_source=nullif(left(trim(coalesce(p_attribution_source,'')),120),''), attribution_medium=nullif(left(trim(coalesce(p_attribution_medium,'')),120),''),
    attribution_campaign=nullif(left(trim(coalesce(p_attribution_campaign,'')),160),''), attribution_term=nullif(left(trim(coalesce(p_attribution_term,'')),200),''),
    attribution_content=nullif(left(trim(coalesce(p_attribution_content,'')),200),''), attribution_gclid=nullif(left(trim(coalesce(p_attribution_gclid,'')),255),''),
    attribution_fbclid=nullif(left(trim(coalesce(p_attribution_fbclid,'')),255),''), attribution_landing_path=nullif(left(trim(coalesce(p_attribution_landing_path,'')),255),'')
  where id=v_id;
  return v_id;
end $$;
grant execute on function public.submit_leak_audit_attributed(text,text,text,text,integer,integer,integer,integer,integer,integer,integer,numeric,numeric,jsonb,jsonb,text,text,text,text,text,text,text,text) to anon,authenticated;

create or replace function public.get_paid_optimization_snapshot(p_channel text,p_campaign_key text,p_period_start date,p_period_end date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_spend numeric:=0; v_qualified integer:=0; v_cpqd numeric;
begin
  if v_user is null or not exists(select 1 from public.platform_admins where user_id=v_user) then raise exception 'admin_required'; end if;
  if p_channel not in ('GOOGLE_SEARCH','META_RETARGETING') then raise exception 'invalid_channel'; end if;
  if p_period_end<p_period_start then raise exception 'invalid_period'; end if;
  select coalesce(sum(spend_usd),0) into v_spend from public.b2b_paid_media_spend where channel=p_channel and campaign_key=p_campaign_key and spend_date between p_period_start and p_period_end;
  with qualified_discovery as (
    select distinct opportunity_id from public.b2b_discovery_sessions
    where status='COMPLETED' and disposition='QUALIFIED'
      and qualification_pain_explicit is true and qualification_volume_sufficient is true and qualification_sponsor_authority is true
      and qualification_urgency_trigger is true and qualification_stack_fit is true and qualification_habit_change is true and qualification_economic_value is true
  ), demo_rows as (
    select o.id,o.email,coalesce(o.demo_completed_at,(select max(e.occurred_at) from public.b2b_conversion_events e where e.opportunity_id=o.id and e.event_type='DEMO_SHOW')) as demo_at,
      coalesce(nullif(o.acquisition_campaign,''),(select nullif(a.attribution_campaign,'') from public.b2b_leak_audits a where o.email is not null and a.contact_email is not null and lower(a.contact_email)=lower(o.email) and nullif(a.attribution_campaign,'') is not null order by a.created_at desc limit 1)) as attributed_campaign
    from public.b2b_opportunities o join qualified_discovery q on q.opportunity_id=o.id where o.demo_attendance='SHOW'
  ) select count(*)::integer into v_qualified from demo_rows where attributed_campaign=p_campaign_key and demo_at::date between p_period_start and p_period_end;
  if v_qualified>0 then v_cpqd:=round(v_spend/v_qualified,2); end if;
  return jsonb_build_object('channel',p_channel,'campaign_key',p_campaign_key,'period_start',p_period_start,'period_end',p_period_end,'spend_usd',v_spend,'qualified_demo_count',v_qualified,'cost_per_qualified_demo_usd',v_cpqd);
end $$;