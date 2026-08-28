alter table public.b2b_opportunities
  add column if not exists loss_reason text,
  add column if not exists loss_notes text,
  add column if not exists lost_at timestamptz;

alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_loss_reason_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_loss_reason_check check (
  loss_reason is null or loss_reason in ('NO_FIT','NO_RESPONSE','PRICE','TIMING','COMPETITOR','NO_DECISION','INTERNAL_PRIORITY','TECHNICAL_GAP','OTHER')
);

alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_loss_state_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_loss_state_check check (
  (stage = 'LOST' and loss_reason is not null and lost_at is not null)
  or
  (stage <> 'LOST' and loss_reason is null and loss_notes is null and lost_at is null)
);

create index if not exists b2b_opportunities_loss_reason_idx
  on public.b2b_opportunities (loss_reason, lost_at desc)
  where stage = 'LOST';
