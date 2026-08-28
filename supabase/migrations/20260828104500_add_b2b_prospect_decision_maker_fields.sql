alter table public.b2b_prospects
  add column if not exists decision_maker_name text,
  add column if not exists decision_maker_role text,
  add column if not exists decision_maker_linkedin_url text,
  add column if not exists decision_maker_evidence_url text,
  add column if not exists decision_maker_quality text not null default 'UNKNOWN' check (decision_maker_quality in ('UNKNOWN','PARTIAL','VERIFIED')),
  add column if not exists decision_maker_verified_at timestamptz;

create index if not exists b2b_prospects_decision_maker_quality_idx
  on public.b2b_prospects (decision_maker_quality, department, status);