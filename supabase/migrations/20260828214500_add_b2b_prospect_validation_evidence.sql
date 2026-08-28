create table if not exists public.b2b_prospect_validation_evidence (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.b2b_prospects(id) on delete cascade,
  signal_key text not null check (signal_key in (
    'score_team_size',
    'score_lead_volume',
    'score_source_fragmentation',
    'score_whatsapp_centrality',
    'score_process_pain',
    'score_growth_investment',
    'score_decision_access'
  )),
  score_value integer not null,
  channel text not null check (channel in ('WHATSAPP','EMAIL','PHONE','OTHER')),
  response_text text not null check (length(trim(response_text)) > 0),
  evidence_note text,
  captured_by uuid not null,
  created_at timestamptz not null default now(),
  constraint b2b_validation_score_value_check check (
    (signal_key = 'score_team_size' and score_value in (5,10,15,20)) or
    (signal_key = 'score_lead_volume' and score_value in (2,6,12,20)) or
    (signal_key = 'score_source_fragmentation' and score_value in (5,15)) or
    (signal_key = 'score_whatsapp_centrality' and score_value in (0,10)) or
    (signal_key = 'score_process_pain' and score_value in (0,15)) or
    (signal_key = 'score_growth_investment' and score_value in (0,10)) or
    (signal_key = 'score_decision_access' and score_value in (0,5))
  )
);

create index if not exists b2b_prospect_validation_evidence_prospect_idx
  on public.b2b_prospect_validation_evidence(prospect_id, created_at desc);

alter table public.b2b_prospect_validation_evidence enable row level security;
revoke all on table public.b2b_prospect_validation_evidence from anon, public;
grant select, insert on table public.b2b_prospect_validation_evidence to authenticated;
grant select, insert, update, delete on table public.b2b_prospect_validation_evidence to service_role;

drop policy if exists "platform admins can view b2b prospect validation evidence" on public.b2b_prospect_validation_evidence;
create policy "platform admins can view b2b prospect validation evidence"
on public.b2b_prospect_validation_evidence for select to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b prospect validation evidence" on public.b2b_prospect_validation_evidence;
create policy "platform admins can insert b2b prospect validation evidence"
on public.b2b_prospect_validation_evidence for insert to authenticated
with check (
  captured_by = (select auth.uid()) and
  exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
);

create or replace function public.recalculate_b2b_prospect_score()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  signal_count integer;
begin
  new.score_geography := case when new.department in ('Montevideo','Maldonado','Canelones') then 5 else 0 end;

  signal_count :=
    (case when new.score_team_size is not null then 1 else 0 end) +
    (case when new.score_lead_volume is not null then 1 else 0 end) +
    (case when new.score_source_fragmentation is not null then 1 else 0 end) +
    (case when new.score_whatsapp_centrality is not null then 1 else 0 end) +
    (case when new.score_process_pain is not null then 1 else 0 end) +
    (case when new.score_growth_investment is not null then 1 else 0 end) +
    (case when new.score_decision_access is not null then 1 else 0 end) + 1;

  new.score_signal_count := signal_count;

  if signal_count = 8 then
    new.score_status := 'SCORED';
    new.icp_score :=
      new.score_team_size +
      new.score_lead_volume +
      new.score_source_fragmentation +
      new.score_whatsapp_centrality +
      new.score_process_pain +
      new.score_growth_investment +
      new.score_decision_access +
      new.score_geography;
    new.scored_at := coalesce(new.scored_at, now());
  else
    new.score_status := 'UNSCORED';
    new.icp_score := null;
    new.scored_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists b2b_prospects_recalculate_score on public.b2b_prospects;
create trigger b2b_prospects_recalculate_score
before insert or update of department, score_team_size, score_lead_volume, score_source_fragmentation,
  score_whatsapp_centrality, score_process_pain, score_growth_investment, score_decision_access, score_geography
on public.b2b_prospects
for each row execute function public.recalculate_b2b_prospect_score();

update public.b2b_prospects
set score_geography = case when department in ('Montevideo','Maldonado','Canelones') then 5 else 0 end;

create or replace function public.record_b2b_prospect_validation_evidence(
  p_prospect_id uuid,
  p_signal_key text,
  p_score_value integer,
  p_channel text,
  p_response_text text,
  p_evidence_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  ) then
    raise exception 'not_authorized';
  end if;

  if p_signal_key not in (
    'score_team_size',
    'score_lead_volume',
    'score_source_fragmentation',
    'score_whatsapp_centrality',
    'score_process_pain',
    'score_growth_investment',
    'score_decision_access'
  ) then
    raise exception 'invalid_signal';
  end if;

  if nullif(trim(p_response_text), '') is null then
    raise exception 'response_required';
  end if;

  insert into public.b2b_prospect_validation_evidence (
    prospect_id, signal_key, score_value, channel, response_text, evidence_note, captured_by
  ) values (
    p_prospect_id,
    p_signal_key,
    p_score_value,
    upper(p_channel),
    trim(p_response_text),
    nullif(trim(coalesce(p_evidence_note, '')), ''),
    (select auth.uid())
  );

  update public.b2b_prospects
  set
    score_team_size = case when p_signal_key = 'score_team_size' then p_score_value else score_team_size end,
    score_lead_volume = case when p_signal_key = 'score_lead_volume' then p_score_value else score_lead_volume end,
    score_source_fragmentation = case when p_signal_key = 'score_source_fragmentation' then p_score_value else score_source_fragmentation end,
    score_whatsapp_centrality = case when p_signal_key = 'score_whatsapp_centrality' then p_score_value else score_whatsapp_centrality end,
    score_process_pain = case when p_signal_key = 'score_process_pain' then p_score_value else score_process_pain end,
    score_growth_investment = case when p_signal_key = 'score_growth_investment' then p_score_value else score_growth_investment end,
    score_decision_access = case when p_signal_key = 'score_decision_access' then p_score_value else score_decision_access end,
    score_notes = concat_ws(E'\n', nullif(score_notes, ''), '[' || to_char(now() at time zone 'America/Montevideo', 'YYYY-MM-DD HH24:MI') || '] ' || p_signal_key || ': ' || coalesce(nullif(trim(p_evidence_note), ''), 'validado por respuesta directa')),
    updated_at = now()
  where id = p_prospect_id;

  if not found then
    raise exception 'prospect_not_found';
  end if;
end;
$$;

revoke all on function public.record_b2b_prospect_validation_evidence(uuid,text,integer,text,text,text) from public, anon;
grant execute on function public.record_b2b_prospect_validation_evidence(uuid,text,integer,text,text,text) to authenticated, service_role;
