alter table public.leads drop constraint if exists leads_pipeline_stage_check;

alter table public.leads
  add constraint leads_pipeline_stage_check
  check (
    pipeline_stage = any (
      array[
        'NEW'::text,
        'CONTACTED'::text,
        'QUALIFIED'::text,
        'VISIT'::text,
        'NEGOTIATION'::text,
        'RESERVED'::text,
        'DOCUMENTATION'::text,
        'CONTRACT'::text,
        'HANDOVER'::text,
        'WON'::text,
        'LOST'::text
      ]
    )
  );

comment on column public.leads.pipeline_stage is
  'Commercial stage. COMPRA uses RESERVED before WON; ALQUILER uses DOCUMENTATION, CONTRACT and HANDOVER before WON.';
