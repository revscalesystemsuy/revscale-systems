alter table public.b2b_prospects
  add column if not exists official_website_url text,
  add column if not exists public_phone text,
  add column if not exists public_email text,
  add column if not exists linkedin_company_url text,
  add column if not exists instagram_url text,
  add column if not exists whatsapp_public boolean,
  add column if not exists team_size_hint integer check (team_size_hint is null or team_size_hint >= 1),
  add column if not exists lead_sources_hint integer check (lead_sources_hint is null or lead_sources_hint >= 1),
  add column if not exists portal_presence text[] not null default '{}',
  add column if not exists website_has_whatsapp boolean,
  add column if not exists enrichment_evidence jsonb not null default '{}'::jsonb,
  add column if not exists enrichment_quality text not null default 'UNVERIFIED' check (enrichment_quality in ('UNVERIFIED','PARTIAL','VERIFIED')),
  add column if not exists enriched_at timestamptz;

create index if not exists b2b_prospects_enrichment_quality_idx
  on public.b2b_prospects (enrichment_quality, status, department, city);