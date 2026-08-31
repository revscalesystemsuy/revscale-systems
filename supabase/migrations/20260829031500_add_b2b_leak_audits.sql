create table if not exists public.b2b_leak_audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company text,
  contact_name text,
  contact_email text,
  source_filename text,
  row_count integer not null check (row_count between 1 and 5000),
  score integer not null check (score between 0 and 100),
  unowned_count integer not null default 0,
  no_next_step_count integer not null default 0,
  overdue_followup_count integer not null default 0,
  high_intent_inactive_count integer not null default 0,
  reactivation_candidate_count integer not null default 0,
  median_age_days numeric,
  median_first_response_minutes numeric,
  stage_distribution jsonb not null default '{}'::jsonb,
  metric_snapshot jsonb not null default '{}'::jsonb,
  methodology_version text not null default 'leak-audit-v1',
  disclaimer text not null default 'Score operativo individual; no es benchmark de mercado ni promesa de resultados.',
  check (jsonb_typeof(stage_distribution) = 'object'),
  check (jsonb_typeof(metric_snapshot) = 'object')
);
create index if not exists b2b_leak_audits_created_idx on public.b2b_leak_audits(created_at desc);
alter table public.b2b_leak_audits enable row level security;
drop policy if exists "platform admins can view leak audits" on public.b2b_leak_audits;
create policy "platform admins can view leak audits" on public.b2b_leak_audits for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

create or replace function public.submit_leak_audit(
  p_company text,
  p_contact_name text,
  p_contact_email text,
  p_source_filename text,
  p_row_count integer,
  p_score integer,
  p_unowned_count integer,
  p_no_next_step_count integer,
  p_overdue_followup_count integer,
  p_high_intent_inactive_count integer,
  p_reactivation_candidate_count integer,
  p_median_age_days numeric,
  p_median_first_response_minutes numeric,
  p_stage_distribution jsonb,
  p_metric_snapshot jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_row_count < 1 or p_row_count > 5000 then raise exception 'row_count_out_of_range'; end if;
  if p_score < 0 or p_score > 100 then raise exception 'score_out_of_range'; end if;
  insert into public.b2b_leak_audits (
    company,contact_name,contact_email,source_filename,row_count,score,
    unowned_count,no_next_step_count,overdue_followup_count,high_intent_inactive_count,
    reactivation_candidate_count,median_age_days,median_first_response_minutes,
    stage_distribution,metric_snapshot
  ) values (
    nullif(trim(p_company),''),nullif(trim(p_contact_name),''),nullif(lower(trim(p_contact_email)),''),nullif(trim(p_source_filename),''),
    p_row_count,p_score,p_unowned_count,p_no_next_step_count,p_overdue_followup_count,p_high_intent_inactive_count,
    p_reactivation_candidate_count,p_median_age_days,p_median_first_response_minutes,
    coalesce(p_stage_distribution,'{}'::jsonb),coalesce(p_metric_snapshot,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.submit_leak_audit(text,text,text,text,integer,integer,integer,integer,integer,integer,integer,numeric,numeric,jsonb,jsonb) to anon, authenticated;