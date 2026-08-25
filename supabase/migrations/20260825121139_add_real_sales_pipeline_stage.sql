alter table public.leads
  add column if not exists pipeline_stage text not null default 'NEW';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_pipeline_stage_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_pipeline_stage_check
      check (pipeline_stage in ('NEW','CONTACTED','QUALIFIED','VISIT','NEGOTIATION','WON','LOST'));
  end if;
end $$;

update public.leads l
set pipeline_stage = case
  when exists (
    select 1 from public.interactions i
    where i.lead_id = l.id and i.detected_intent = 'AGENDAR_VISITA'
  ) then 'VISIT'
  when exists (
    select 1 from public.interactions i
    where i.lead_id = l.id and i.detected_intent in ('CONTACTAR_LEAD','ENVIAR_PROPIEDAD')
  ) then 'CONTACTED'
  else 'NEW'
end
where pipeline_stage = 'NEW';

create index if not exists leads_org_pipeline_stage_idx
  on public.leads (organization_id, pipeline_stage, created_at desc);
