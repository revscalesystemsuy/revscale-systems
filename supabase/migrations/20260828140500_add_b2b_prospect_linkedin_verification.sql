alter table public.b2b_prospects
  add column if not exists linkedin_company_quality text not null default 'UNKNOWN' check (linkedin_company_quality in ('UNKNOWN','VERIFIED')),
  add column if not exists linkedin_company_evidence_url text,
  add column if not exists linkedin_dm_quality text not null default 'UNKNOWN' check (linkedin_dm_quality in ('UNKNOWN','VERIFIED')),
  add column if not exists linkedin_dm_evidence_url text,
  add column if not exists linkedin_researched_at timestamptz,
  add column if not exists linkedin_notes text;

update public.b2b_prospects
set linkedin_researched_at = coalesce(linkedin_researched_at, now()),
    linkedin_company_quality = coalesce(linkedin_company_quality, 'UNKNOWN'),
    linkedin_dm_quality = coalesce(linkedin_dm_quality, 'UNKNOWN')
where linkedin_researched_at is null;
