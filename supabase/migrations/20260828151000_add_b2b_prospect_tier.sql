alter table public.b2b_prospects
  add column if not exists prospect_tier text generated always as (
    case
      when score_status <> 'SCORED' or icp_score is null then null
      when icp_score >= 75 then 'A'
      when icp_score >= 60 then 'B'
      when icp_score >= 45 then 'C'
      else 'IGNORE'
    end
  ) stored;

create index if not exists b2b_prospects_prospect_tier_idx
  on public.b2b_prospects(prospect_tier);
