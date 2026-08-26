create table public.nurture_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  operation text null check (operation is null or operation in ('COMPRA','ALQUILER')),
  temperatures text[] not null default array['WARM','COLD']::text[],
  eligible_stages text[] not null default array['NEW','CONTACTED','QUALIFIED']::text[],
  stop_stages text[] not null default array['VISIT','NEGOTIATION','RESERVATION','WON','LOST']::text[],
  stop_on_reply boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.nurture_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sequence_id uuid not null references public.nurture_sequences(id) on delete cascade,
  step_order integer not null check (step_order between 1 and 50),
  delay_days integer not null check (delay_days between 0 and 365),
  channel text not null default 'WHATSAPP' check (channel in ('WHATSAPP','FOLLOWUP')),
  message_template text not null check (char_length(message_template) between 1 and 3500),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, step_order)
);

create table public.nurture_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  sequence_id uuid not null references public.nurture_sequences(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED_REPLY','PAUSED_STAGE','PAUSED_HUMAN','COMPLETED','STOPPED')),
  enrolled_at timestamptz not null default now(),
  last_action_at timestamptz,
  next_step_order integer not null default 1,
  next_action_at timestamptz not null default now(),
  pause_reason text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (lead_id, sequence_id)
);

create table public.nurture_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  enrollment_id uuid not null references public.nurture_enrollments(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  sequence_id uuid not null references public.nurture_sequences(id) on delete cascade,
  step_id uuid not null references public.nurture_steps(id) on delete cascade,
  step_order integer not null,
  channel text not null check (channel in ('WHATSAPP','FOLLOWUP')),
  status text not null default 'READY' check (status in ('READY','BLOCKED_META','SENT','SKIPPED','CANCELLED','FAILED')),
  scheduled_at timestamptz not null,
  message_body text not null,
  reason text,
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, step_id)
);

create index nurture_sequences_org_enabled_idx on public.nurture_sequences(organization_id, enabled);
create index nurture_steps_sequence_order_idx on public.nurture_steps(sequence_id, step_order) where enabled;
create index nurture_enrollments_due_idx on public.nurture_enrollments(next_action_at) where status = 'ACTIVE';
create index nurture_enrollments_org_lead_idx on public.nurture_enrollments(organization_id, lead_id);
create index nurture_actions_org_status_scheduled_idx on public.nurture_actions(organization_id, status, scheduled_at);

alter table public.nurture_sequences enable row level security;
alter table public.nurture_steps enable row level security;
alter table public.nurture_enrollments enable row level security;
alter table public.nurture_actions enable row level security;

grant select, insert, update, delete on public.nurture_sequences to authenticated;
grant select, insert, update, delete on public.nurture_steps to authenticated;
grant select, update on public.nurture_enrollments to authenticated;
grant select on public.nurture_actions to authenticated;

create policy nurture_sequences_select on public.nurture_sequences for select to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=nurture_sequences.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE'));
create policy nurture_sequences_insert on public.nurture_sequences for insert to authenticated with check (exists (select 1 from public.organization_members om where om.organization_id=nurture_sequences.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER')));
create policy nurture_sequences_update on public.nurture_sequences for update to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=nurture_sequences.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))) with check (exists (select 1 from public.organization_members om where om.organization_id=nurture_sequences.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER')));
create policy nurture_sequences_delete on public.nurture_sequences for delete to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=nurture_sequences.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER')));

create policy nurture_steps_select on public.nurture_steps for select to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=nurture_steps.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE'));
create policy nurture_steps_insert on public.nurture_steps for insert to authenticated with check (exists (select 1 from public.organization_members om where om.organization_id=nurture_steps.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER')) and exists (select 1 from public.nurture_sequences ns where ns.id=nurture_steps.sequence_id and ns.organization_id=nurture_steps.organization_id));
create policy nurture_steps_update on public.nurture_steps for update to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=nurture_steps.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))) with check (exists (select 1 from public.organization_members om where om.organization_id=nurture_steps.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER')) and exists (select 1 from public.nurture_sequences ns where ns.id=nurture_steps.sequence_id and ns.organization_id=nurture_steps.organization_id));
create policy nurture_steps_delete on public.nurture_steps for delete to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=nurture_steps.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER')));

create policy nurture_enrollments_select on public.nurture_enrollments for select to authenticated using (exists (select 1 from public.leads l where l.id=nurture_enrollments.lead_id and l.organization_id=nurture_enrollments.organization_id and private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)));
create policy nurture_enrollments_update on public.nurture_enrollments for update to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=nurture_enrollments.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER'))) with check (exists (select 1 from public.organization_members om where om.organization_id=nurture_enrollments.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE' and om.role in ('OWNER','MANAGER')));
create policy nurture_actions_select on public.nurture_actions for select to authenticated using (exists (select 1 from public.leads l where l.id=nurture_actions.lead_id and l.organization_id=nurture_actions.organization_id and private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)));

create or replace function private.refresh_nurture_autopilot()
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_enrolled integer := 0;
  v_paused integer := 0;
  v_queued integer := 0;
begin
  insert into public.nurture_sequences (organization_id,name,operation,temperatures)
  select s.organization_id,x.name,x.operation,array['WARM','COLD']::text[]
  from public.subscriptions s
  cross join (values ('Autopilot compra','COMPRA'::text),('Autopilot alquiler','ALQUILER'::text)) x(name,operation)
  where upper(s.status)='ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
  on conflict (organization_id,name) do nothing;

  insert into public.nurture_steps (organization_id,sequence_id,step_order,delay_days,channel,message_template)
  select ns.organization_id,ns.id,x.step_order,x.delay_days,'WHATSAPP',x.template
  from public.nurture_sequences ns
  cross join (values
    (1,1,'Hola {{name}}, sigo atento a tu búsqueda. ¿Querés que te mande opciones nuevas que encajen mejor con lo que buscás?'),
    (2,3,'Hola {{name}}, revisé nuevamente tu búsqueda. Si cambió zona, presupuesto o dormitorios, decime y ajusto las opciones.'),
    (3,7,'Hola {{name}}, aparecieron movimientos nuevos en propiedades que podrían interesarte. ¿Seguís buscando?'),
    (4,14,'Hola {{name}}, quería saber si tu búsqueda sigue activa. Si querés, la actualizamos y priorizo solamente opciones realmente relevantes.'),
    (5,30,'Hola {{name}}, pasó un tiempo desde el último contacto. Puedo retomar tu búsqueda con disponibilidad y precios actuales.'),
    (6,60,'Hola {{name}}, sigo teniendo tu búsqueda guardada. Si todavía estás buscando, puedo actualizarla y revisar coincidencias nuevas.'),
    (7,90,'Hola {{name}}, cierro este seguimiento por ahora para no molestarte. Si tu búsqueda sigue vigente, respondeme y la retomamos enseguida.')
  ) x(step_order,delay_days,template)
  where ns.name in ('Autopilot compra','Autopilot alquiler')
  on conflict (sequence_id,step_order) do nothing;

  with candidates as (
    select l.id lead_id,l.organization_id,ns.id sequence_id,row_number() over(partition by l.id order by ns.created_at) rn
    from public.leads l
    join public.subscriptions s on s.organization_id=l.organization_id and upper(s.status)='ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
    join public.nurture_sequences ns on ns.organization_id=l.organization_id and ns.enabled and (ns.operation is null or ns.operation=l.operation) and coalesce(l.lead_temperature,'COLD')=any(ns.temperatures) and l.pipeline_stage=any(ns.eligible_stages)
    where coalesce(l.requires_human,false)=false and l.phone_normalized is not null
  ), ins as (
    insert into public.nurture_enrollments(organization_id,lead_id,sequence_id,status,enrolled_at,next_step_order,next_action_at)
    select organization_id,lead_id,sequence_id,'ACTIVE',now(),1,now()+interval '1 day' from candidates where rn=1
    on conflict (lead_id,sequence_id) do nothing returning 1
  ) select count(*) into v_enrolled from ins;

  with changed as (
    update public.nurture_enrollments ne
    set status=case when coalesce(l.requires_human,false) then 'PAUSED_HUMAN' when l.pipeline_stage=any(ns.stop_stages) then 'PAUSED_STAGE' else 'PAUSED_REPLY' end,
        pause_reason=case when coalesce(l.requires_human,false) then 'Atención humana requerida' when l.pipeline_stage=any(ns.stop_stages) then 'El lead avanzó de etapa' else 'El lead respondió' end,
        updated_at=now()
    from public.leads l,public.nurture_sequences ns
    where ne.lead_id=l.id and ne.sequence_id=ns.id and ne.status='ACTIVE' and (
      coalesce(l.requires_human,false) or l.pipeline_stage=any(ns.stop_stages) or (ns.stop_on_reply and exists(select 1 from public.interactions i where i.organization_id=ne.organization_id and i.lead_id=ne.lead_id and i.direction='INBOUND' and i.created_at>coalesce(ne.last_action_at,ne.enrolled_at)))
    ) returning 1
  ) select count(*) into v_paused from changed;

  with due as (
    select ne.id enrollment_id,ne.organization_id,ne.lead_id,ne.sequence_id,ne.next_step_order,l.full_name,st.id step_id,st.channel,st.message_template,
           exists(select 1 from public.whatsapp_connections wc where wc.organization_id=ne.organization_id and wc.status='CONNECTED' and wc.webhook_status='VERIFIED') has_meta,
           exists(select 1 from public.whatsapp_ai_settings ws where ws.organization_id=ne.organization_id and ws.mode='LIVE') is_live
    from public.nurture_enrollments ne
    join public.leads l on l.id=ne.lead_id and l.organization_id=ne.organization_id
    join public.nurture_steps st on st.sequence_id=ne.sequence_id and st.step_order=ne.next_step_order and st.enabled
    where ne.status='ACTIVE' and ne.next_action_at<=now()
  ), ins as (
    insert into public.nurture_actions(organization_id,enrollment_id,lead_id,sequence_id,step_id,step_order,channel,status,scheduled_at,message_body,reason)
    select d.organization_id,d.enrollment_id,d.lead_id,d.sequence_id,d.step_id,d.next_step_order,d.channel,
           case when d.channel='WHATSAPP' and not(d.has_meta and d.is_live) then 'BLOCKED_META' else 'READY' end,
           now(),replace(d.message_template,'{{name}}',coalesce(nullif(split_part(d.full_name,' ',1),''),'hola')),
           case when d.channel='WHATSAPP' and not(d.has_meta and d.is_live) then 'Esperando conexión Meta LIVE' else null end
    from due d on conflict(enrollment_id,step_id) do nothing returning enrollment_id
  ) select count(*) into v_queued from ins;

  update public.nurture_enrollments ne
  set last_action_at=now(),
      next_step_order=ne.next_step_order+1,
      next_action_at=coalesce((select ne.enrolled_at+make_interval(days=>ns.delay_days) from public.nurture_steps ns where ns.sequence_id=ne.sequence_id and ns.step_order=ne.next_step_order+1 and ns.enabled limit 1),now()),
      status=case when exists(select 1 from public.nurture_steps ns where ns.sequence_id=ne.sequence_id and ns.step_order=ne.next_step_order+1 and ns.enabled) then ne.status else 'COMPLETED' end,
      completed_at=case when exists(select 1 from public.nurture_steps ns where ns.sequence_id=ne.sequence_id and ns.step_order=ne.next_step_order+1 and ns.enabled) then ne.completed_at else now() end,
      updated_at=now()
  where ne.status='ACTIVE' and exists(select 1 from public.nurture_actions a where a.enrollment_id=ne.id and a.step_order=ne.next_step_order and a.created_at>=now()-interval '20 minutes');

  return jsonb_build_object('enrolled',v_enrolled,'paused',v_paused,'queued',v_queued,'ran_at',now());
end;
$$;

revoke all on function private.refresh_nurture_autopilot() from public,anon,authenticated;
grant execute on function private.refresh_nurture_autopilot() to postgres,service_role;

select cron.unschedule(jobid) from cron.job where jobname='revscale-nurture-autopilot';
select cron.schedule('revscale-nurture-autopilot','*/15 * * * *',$$select private.refresh_nurture_autopilot();$$);
select private.refresh_nurture_autopilot();
