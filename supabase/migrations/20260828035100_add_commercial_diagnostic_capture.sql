create table if not exists public.commercial_diagnostics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  role text not null,
  location text not null,
  team_size integer not null check (team_size between 1 and 500),
  monthly_inquiries integer not null check (monthly_inquiries between 0 and 1000000),
  property_count integer not null check (property_count between 0 and 10000000),
  lead_sources integer not null check (lead_sources between 1 and 100),
  whatsapp_daily boolean not null default false,
  followup_pain boolean not null default false,
  growth_investment boolean not null default false,
  score integer not null check (score between 0 and 100),
  tier text not null check (tier in ('A','B','C','LOW')),
  recommendation text not null check (recommendation in ('PILOT','DIAGNOSTIC_REVIEW','DEMO_FIRST')),
  source text not null default 'WEBSITE_DIAGNOSTIC',
  status text not null default 'NEW' check (status in ('NEW','CONTACTED','QUALIFIED','DISQUALIFIED'))
);

create index if not exists commercial_diagnostics_created_at_idx on public.commercial_diagnostics (created_at desc);
create index if not exists commercial_diagnostics_tier_status_idx on public.commercial_diagnostics (tier, status, created_at desc);
create index if not exists commercial_diagnostics_email_idx on public.commercial_diagnostics (lower(email));

alter table public.commercial_diagnostics enable row level security;
revoke all on table public.commercial_diagnostics from anon, authenticated, public;
grant select, insert, update, delete on table public.commercial_diagnostics to service_role;

drop policy if exists commercial_diagnostics_no_direct_access on public.commercial_diagnostics;
create policy commercial_diagnostics_no_direct_access
on public.commercial_diagnostics
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create or replace function private.submit_commercial_diagnostic(
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_role text,
  p_location text,
  p_team_size integer,
  p_monthly_inquiries integer,
  p_property_count integer,
  p_lead_sources integer,
  p_whatsapp_daily boolean,
  p_followup_pain boolean,
  p_growth_investment boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_company text := trim(coalesce(p_company, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := trim(coalesce(p_phone, ''));
  v_role text := upper(trim(coalesce(p_role, '')));
  v_location text := upper(trim(coalesce(p_location, '')));
  v_score integer := 0;
  v_tier text;
  v_recommendation text;
  v_id uuid;
  v_now timestamptz := now();
  v_count integer;
  v_window timestamptz;
  v_email_key text;
begin
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Invalid name' using errcode='22023'; end if;
  if length(v_company) < 2 or length(v_company) > 160 then raise exception 'Invalid company' using errcode='22023'; end if;
  if length(v_email) < 5 or length(v_email) > 320 or position('@' in v_email) < 2 then raise exception 'Invalid email' using errcode='22023'; end if;
  if length(v_phone) > 50 then raise exception 'Invalid phone' using errcode='22023'; end if;
  if v_role not in ('OWNER','MANAGER','AGENT','OTHER') then raise exception 'Invalid role' using errcode='22023'; end if;
  if v_location not in ('MONTEVIDEO','MALDONADO','CANELONES','OTHER') then raise exception 'Invalid location' using errcode='22023'; end if;
  if p_team_size is null or p_team_size < 1 or p_team_size > 500 then raise exception 'Invalid team size' using errcode='22023'; end if;
  if p_monthly_inquiries is null or p_monthly_inquiries < 0 or p_monthly_inquiries > 1000000 then raise exception 'Invalid inquiry volume' using errcode='22023'; end if;
  if p_property_count is null or p_property_count < 0 or p_property_count > 10000000 then raise exception 'Invalid property count' using errcode='22023'; end if;
  if p_lead_sources is null or p_lead_sources < 1 or p_lead_sources > 100 then raise exception 'Invalid lead sources' using errcode='22023'; end if;

  insert into private.plan_request_rate_limits as rl (rate_key, window_started_at, request_count, updated_at)
  values ('diag:global', v_now, 1, v_now)
  on conflict (rate_key) do update
  set request_count = case when rl.window_started_at <= v_now - interval '1 minute' then 1 else rl.request_count + 1 end,
      window_started_at = case when rl.window_started_at <= v_now - interval '1 minute' then v_now else rl.window_started_at end,
      updated_at = v_now
  returning request_count, window_started_at into v_count, v_window;
  if v_count > 120 then raise exception 'Too many requests' using errcode='P0001'; end if;

  v_email_key := 'diag:email:' || encode(extensions.digest(v_email, 'sha256'), 'hex');
  insert into private.plan_request_rate_limits as rl (rate_key, window_started_at, request_count, updated_at)
  values (v_email_key, v_now, 1, v_now)
  on conflict (rate_key) do update
  set request_count = case when rl.window_started_at <= v_now - interval '1 hour' then 1 else rl.request_count + 1 end,
      window_started_at = case when rl.window_started_at <= v_now - interval '1 hour' then v_now else rl.window_started_at end,
      updated_at = v_now
  returning request_count, window_started_at into v_count, v_window;
  if v_count > 5 then raise exception 'Too many requests for this email' using errcode='P0001'; end if;

  v_score := v_score + case when p_team_size between 5 and 20 then 20 when p_team_size between 2 and 4 then 10 when p_team_size > 20 then 15 else 5 end;
  v_score := v_score + case when p_monthly_inquiries >= 150 then 20 when p_monthly_inquiries >= 75 then 12 when p_monthly_inquiries >= 30 then 6 else 2 end;
  v_score := v_score + case when p_lead_sources >= 2 then 15 else 5 end;
  v_score := v_score + case when coalesce(p_whatsapp_daily, false) then 10 else 0 end;
  v_score := v_score + case when coalesce(p_followup_pain, false) then 15 else 0 end;
  v_score := v_score + case when coalesce(p_growth_investment, false) then 10 else 0 end;
  v_score := v_score + case when v_role in ('OWNER','MANAGER') then 5 else 0 end;
  v_score := v_score + case when v_location in ('MONTEVIDEO','MALDONADO','CANELONES') then 5 else 0 end;

  v_tier := case when v_score >= 75 then 'A' when v_score >= 60 then 'B' when v_score >= 45 then 'C' else 'LOW' end;
  v_recommendation := case when v_score >= 60 then 'PILOT' when v_score >= 45 then 'DIAGNOSTIC_REVIEW' else 'DEMO_FIRST' end;

  insert into public.commercial_diagnostics (
    name, company, email, phone, role, location, team_size, monthly_inquiries, property_count,
    lead_sources, whatsapp_daily, followup_pain, growth_investment, score, tier, recommendation
  ) values (
    v_name, v_company, v_email, nullif(v_phone,''), v_role, v_location, p_team_size, p_monthly_inquiries,
    p_property_count, p_lead_sources, coalesce(p_whatsapp_daily,false), coalesce(p_followup_pain,false),
    coalesce(p_growth_investment,false), v_score, v_tier, v_recommendation
  ) returning id into v_id;

  return jsonb_build_object('id', v_id, 'score', v_score, 'tier', v_tier, 'recommendation', v_recommendation);
end;
$$;

revoke all on function private.submit_commercial_diagnostic(text,text,text,text,text,text,integer,integer,integer,integer,boolean,boolean,boolean) from public;
grant execute on function private.submit_commercial_diagnostic(text,text,text,text,text,text,integer,integer,integer,integer,boolean,boolean,boolean) to anon, authenticated, service_role;

create or replace function public.submit_commercial_diagnostic(
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_role text,
  p_location text,
  p_team_size integer,
  p_monthly_inquiries integer,
  p_property_count integer,
  p_lead_sources integer,
  p_whatsapp_daily boolean,
  p_followup_pain boolean,
  p_growth_investment boolean
)
returns jsonb
language sql
set search_path = ''
as $$
  select private.submit_commercial_diagnostic(
    p_name, p_company, p_email, p_phone, p_role, p_location, p_team_size, p_monthly_inquiries,
    p_property_count, p_lead_sources, p_whatsapp_daily, p_followup_pain, p_growth_investment
  )
$$;

revoke all on function public.submit_commercial_diagnostic(text,text,text,text,text,text,integer,integer,integer,integer,boolean,boolean,boolean) from public;
grant execute on function public.submit_commercial_diagnostic(text,text,text,text,text,text,integer,integer,integer,integer,boolean,boolean,boolean) to anon, authenticated, service_role;