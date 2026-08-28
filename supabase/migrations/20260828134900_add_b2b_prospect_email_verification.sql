alter table public.b2b_prospects
  add column if not exists email_quality text not null default 'UNKNOWN' check (email_quality in ('UNKNOWN','VERIFIED')),
  add column if not exists email_evidence_url text,
  add column if not exists email_researched_at timestamptz,
  add column if not exists email_notes text;

update public.b2b_prospects
set email_quality = case when public_email is not null then 'VERIFIED' else 'UNKNOWN' end,
    email_researched_at = coalesce(email_researched_at, now())
where email_researched_at is null;
