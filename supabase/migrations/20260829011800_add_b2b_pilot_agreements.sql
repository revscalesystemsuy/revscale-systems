create table if not exists public.b2b_pilot_agreements (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references public.b2b_opportunities(id) on delete cascade,
  proposal_id uuid references public.b2b_proposals(id) on delete set null,
  created_by uuid not null,
  status text not null default 'PREPARED' check (status in ('PREPARED','OFFERED','ACCEPTED','ACTIVE','COMPLETED','CANCELLED')),
  pilot_days integer not null default 45 check (pilot_days > 0),
  onboarding_days integer not null default 7 check (onboarding_days > 0),
  sponsor_name text,
  sponsor_role text,
  champion_name text,
  champion_role text,
  data_scope text,
  property_scope text,
  integration_scope text,
  decision_metrics text[] not null default '{}',
  activation_criteria text[] not null default array[
    '80% o más de los leads activos con responsable y próximo paso definido.',
    'Uso de Qué hacer hoy al menos 4 de 5 días laborales por el equipo núcleo.',
    'Revisión sistemática de matches y oportunidades de riesgo o reactivación.',
    'Revisión semanal de SLA y pendientes por parte de dirección o management.'
  ]::text[],
  target_start_date date,
  risks text,
  acceptance_notes text,
  offered_at timestamptz,
  accepted_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_pilot_agreements_status_idx
  on public.b2b_pilot_agreements(status, updated_at desc);

alter table public.b2b_pilot_agreements enable row level security;

drop policy if exists "platform admins can view b2b pilot agreements" on public.b2b_pilot_agreements;
create policy "platform admins can view b2b pilot agreements"
  on public.b2b_pilot_agreements for select
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b pilot agreements" on public.b2b_pilot_agreements;
create policy "platform admins can insert b2b pilot agreements"
  on public.b2b_pilot_agreements for insert
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
  );

drop policy if exists "platform admins can update b2b pilot agreements" on public.b2b_pilot_agreements;
create policy "platform admins can update b2b pilot agreements"
  on public.b2b_pilot_agreements for update
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can delete b2b pilot agreements" on public.b2b_pilot_agreements;
create policy "platform admins can delete b2b pilot agreements"
  on public.b2b_pilot_agreements for delete
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
