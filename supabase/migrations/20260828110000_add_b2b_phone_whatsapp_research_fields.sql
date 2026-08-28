alter table public.b2b_prospects
  add column if not exists phone_quality text not null default 'UNKNOWN' check (phone_quality in ('UNKNOWN','VERIFIED')),
  add column if not exists phone_evidence_url text,
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_quality text not null default 'UNKNOWN' check (whatsapp_quality in ('UNKNOWN','VERIFIED')),
  add column if not exists whatsapp_evidence_url text,
  add column if not exists phone_whatsapp_notes text,
  add column if not exists phone_whatsapp_researched_at timestamptz;

create index if not exists b2b_prospects_phone_whatsapp_quality_idx
  on public.b2b_prospects (phone_quality, whatsapp_quality, department, status);