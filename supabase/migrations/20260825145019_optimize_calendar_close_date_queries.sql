create index if not exists leads_org_expected_close_open_idx
  on public.leads (organization_id, expected_close_date)
  where expected_close_date is not null
    and pipeline_stage in ('NEW','CONTACTED','QUALIFIED','VISIT','NEGOTIATION');
