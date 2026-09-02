create index if not exists contact_consents_lead_idx on public.contact_consents (lead_id) where lead_id is not null;
create index if not exists contact_consents_inquiry_idx on public.contact_consents (inquiry_id) where inquiry_id is not null;
