alter table public.b2b_prospects
  add column if not exists decision_maker_notes text,
  add column if not exists decision_maker_researched_at timestamptz;

create index if not exists b2b_prospects_decision_maker_researched_idx
  on public.b2b_prospects (decision_maker_researched_at, decision_maker_quality, department);