alter table public.b2b_prospects
  add column if not exists score_team_size integer check (score_team_size between 0 and 20),
  add column if not exists score_lead_volume integer check (score_lead_volume between 0 and 20),
  add column if not exists score_source_fragmentation integer check (score_source_fragmentation between 0 and 15),
  add column if not exists score_whatsapp_centrality integer check (score_whatsapp_centrality between 0 and 10),
  add column if not exists score_process_pain integer check (score_process_pain between 0 and 15),
  add column if not exists score_growth_investment integer check (score_growth_investment between 0 and 10),
  add column if not exists score_decision_access integer check (score_decision_access between 0 and 5),
  add column if not exists score_geography integer check (score_geography between 0 and 5),
  add column if not exists icp_score integer check (icp_score between 0 and 100),
  add column if not exists score_status text not null default 'UNSCORED' check (score_status in ('UNSCORED','SCORED')),
  add column if not exists score_signal_count integer not null default 0 check (score_signal_count between 0 and 8),
  add column if not exists score_notes text,
  add column if not exists scored_at timestamptz;

create index if not exists b2b_prospects_score_status_idx on public.b2b_prospects(score_status);
create index if not exists b2b_prospects_icp_score_idx on public.b2b_prospects(icp_score desc nulls last);

update public.b2b_prospects
set score_geography = case when department in ('Montevideo','Maldonado','Canelones') then 5 else 0 end,
    score_signal_count =
      (case when score_team_size is not null then 1 else 0 end) +
      (case when score_lead_volume is not null then 1 else 0 end) +
      (case when score_source_fragmentation is not null then 1 else 0 end) +
      (case when score_whatsapp_centrality is not null then 1 else 0 end) +
      (case when score_process_pain is not null then 1 else 0 end) +
      (case when score_growth_investment is not null then 1 else 0 end) +
      (case when score_decision_access is not null then 1 else 0 end) + 1,
    score_status = case when
      score_team_size is not null and score_lead_volume is not null and score_source_fragmentation is not null and
      score_whatsapp_centrality is not null and score_process_pain is not null and score_growth_investment is not null and
      score_decision_access is not null
      then 'SCORED' else 'UNSCORED' end,
    icp_score = case when
      score_team_size is not null and score_lead_volume is not null and score_source_fragmentation is not null and
      score_whatsapp_centrality is not null and score_process_pain is not null and score_growth_investment is not null and
      score_decision_access is not null
      then score_team_size + score_lead_volume + score_source_fragmentation + score_whatsapp_centrality + score_process_pain + score_growth_investment + score_decision_access + 5
      else null end,
    scored_at = case when
      score_team_size is not null and score_lead_volume is not null and score_source_fragmentation is not null and
      score_whatsapp_centrality is not null and score_process_pain is not null and score_growth_investment is not null and
      score_decision_access is not null
      then now() else null end;