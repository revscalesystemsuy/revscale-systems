create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  description text,
  trigger_type text not null,
  condition_json jsonb not null default '{}'::jsonb,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  system_key text,
  enabled boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_rules_trigger_check check (trigger_type in ('LEAD_UNCONTACTED','VISIT_RECORDED','PROPERTY_CREATED','RESERVATION_CREATED','CLOSING_SOON')),
  constraint automation_rules_action_check check (action_type in ('NOTIFY_AGENT','CREATE_FOLLOWUP','CALCULATE_MATCHES','NOTIFY_ADMIN','NOTIFY_AGENT_AND_DIRECTOR')),
  constraint automation_rules_system_unique unique (organization_id, system_key)
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  rule_id uuid references public.automation_rules(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  status text not null default 'SUCCESS',
  summary text not null,
  dedupe_key text,
  created_at timestamptz not null default now(),
  constraint automation_runs_status_check check (status in ('SUCCESS','SKIPPED','ERROR'))
);

create unique index if not exists automation_runs_dedupe_idx on public.automation_runs(dedupe_key) where dedupe_key is not null;
create index if not exists automation_rules_org_idx on public.automation_rules(organization_id, enabled);
create index if not exists automation_runs_org_created_idx on public.automation_runs(organization_id, created_at desc);

grant select, insert, update, delete on public.automation_rules to authenticated;
grant select on public.automation_runs to authenticated;

alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;

drop policy if exists automation_rules_select on public.automation_rules;
create policy automation_rules_select on public.automation_rules for select to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = automation_rules.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE')
);
drop policy if exists automation_rules_manage on public.automation_rules;
create policy automation_rules_manage on public.automation_rules for all to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = automation_rules.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
) with check (
  exists (select 1 from public.organization_members om where om.organization_id = automation_rules.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
);
drop policy if exists automation_runs_select on public.automation_runs;
create policy automation_runs_select on public.automation_runs for select to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = automation_runs.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE')
);

create or replace function private.seed_default_automation_rules(target_org uuid, actor uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer := 0;
begin
  insert into public.automation_rules(organization_id,name,description,trigger_type,condition_json,action_type,action_config,system_key,created_by)
  values
    (target_org,'Lead sin contacto','Si un lead sigue sin contacto saliente después del plazo elegido, avisar al agente.','LEAD_UNCONTACTED','{"hours":24}'::jsonb,'NOTIFY_AGENT','{}'::jsonb,'lead-uncontacted',actor),
    (target_org,'Visita realizada','Al entrar un lead en Visita, crear automáticamente un seguimiento para el día siguiente.','VISIT_RECORDED','{}'::jsonb,'CREATE_FOLLOWUP','{"hours_after":24}'::jsonb,'visit-followup',actor),
    (target_org,'Propiedad nueva','Al crear una propiedad, recalcular automáticamente los clientes compatibles.','PROPERTY_CREATED','{}'::jsonb,'CALCULATE_MATCHES','{}'::jsonb,'property-matching',actor),
    (target_org,'Reserva creada','Cuando una venta entra en Reserva, avisar a Dirección y administración.','RESERVATION_CREATED','{}'::jsonb,'NOTIFY_ADMIN','{}'::jsonb,'reservation-admin',actor),
    (target_org,'Cierre próximo','Cuando la fecha estimada de cierre se acerca, avisar al agente y a Dirección.','CLOSING_SOON','{"days":2}'::jsonb,'NOTIFY_AGENT_AND_DIRECTOR','{}'::jsonb,'closing-soon',actor)
  on conflict (organization_id, system_key) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end; $$;
revoke all on function private.seed_default_automation_rules(uuid,uuid) from public, anon, authenticated;

create or replace function private.log_automation_run(p_org uuid,p_rule uuid,p_entity_type text,p_entity_id uuid,p_summary text,p_dedupe text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.automation_runs(organization_id,rule_id,entity_type,entity_id,status,summary,dedupe_key)
  values(p_org,p_rule,p_entity_type,p_entity_id,'SUCCESS',p_summary,p_dedupe)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return found;
end; $$;
revoke all on function private.log_automation_run(uuid,uuid,text,uuid,text,text) from public, anon, authenticated;

create or replace function private.automation_on_lead_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_followup_id uuid; v_dedupe text; v_owner uuid;
begin
  if tg_op = 'INSERT' then perform private.seed_default_automation_rules(new.organization_id,null); end if;

  if tg_op = 'UPDATE' and new.pipeline_stage is distinct from old.pipeline_stage and new.pipeline_stage = 'VISIT' then
    for r in select * from public.automation_rules where organization_id=new.organization_id and enabled and trigger_type='VISIT_RECORDED' loop
      v_dedupe := 'automation:visit:'||r.id||':'||new.id||':'||to_char(new.stage_entered_at,'YYYYMMDDHH24MISS');
      if private.log_automation_run(new.organization_id,r.id,'lead',new.id,'Seguimiento creado después de visita',v_dedupe) then
        insert into public.followups(organization_id,lead_id,assigned_to,title,notes,due_at,priority,status)
        values(new.organization_id,new.id,new.assigned_to,'Seguimiento post visita','Creado automáticamente por RevScale.',now() + make_interval(hours => coalesce((r.action_config->>'hours_after')::int,24)),'HIGH','PENDING')
        returning id into v_followup_id;
      end if;
    end loop;
  end if;

  if tg_op = 'UPDATE' and new.pipeline_stage is distinct from old.pipeline_stage and new.pipeline_stage='RESERVED' then
    for r in select * from public.automation_rules where organization_id=new.organization_id and enabled and trigger_type='RESERVATION_CREATED' loop
      for v_owner in select om.user_id from public.organization_members om where om.organization_id=new.organization_id and om.status='ACTIVE' and om.role in ('OWNER','MANAGER') loop
        v_dedupe := 'automation:reservation:'||r.id||':'||new.id||':'||v_owner;
        if private.log_automation_run(new.organization_id,r.id,'lead',new.id,'Administración avisada por reserva',v_dedupe) then
          insert into public.notifications(organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key)
          values(new.organization_id,v_owner,new.team_id,new.id,'AUTOMATION_RESERVATION','HIGH','Nueva reserva creada',coalesce(new.full_name,'Lead')||' entró en Reserva.','/protected/leads/'||new.id,v_dedupe);
        end if;
      end loop;
    end loop;
  end if;
  return new;
end; $$;

drop trigger if exists trg_automation_on_lead_change on public.leads;
create trigger trg_automation_on_lead_change after insert or update of pipeline_stage on public.leads for each row execute function private.automation_on_lead_change();

create or replace function private.automation_on_property_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_dedupe text;
begin
  perform private.seed_default_automation_rules(new.organization_id,null);
  for r in select * from public.automation_rules where organization_id=new.organization_id and enabled and trigger_type='PROPERTY_CREATED' loop
    v_dedupe := 'automation:property:'||r.id||':'||new.id;
    if private.log_automation_run(new.organization_id,r.id,'property',new.id,'Matching recalculado para propiedad nueva',v_dedupe) then
      perform private.refresh_property_matches(new.id);
    end if;
  end loop;
  return new;
end; $$;

drop trigger if exists trg_automation_on_property_insert on public.properties;
create trigger trg_automation_on_property_insert after insert on public.properties for each row execute function private.automation_on_property_insert();

create or replace function private.refresh_automation_rules()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; l record; om record; v_count integer:=0; v_dedupe text; v_date date := (now() at time zone 'America/Montevideo')::date;
begin
  for r in select ar.* from public.automation_rules ar join public.subscriptions s on s.organization_id=ar.organization_id where ar.enabled and upper(coalesce(s.status,''))='ACTIVE' and upper(coalesce(s.plan,'')) in ('PROFESSIONAL','PRO','ENTERPRISE') and ar.trigger_type in ('LEAD_UNCONTACTED','CLOSING_SOON') loop
    if r.trigger_type='LEAD_UNCONTACTED' then
      for l in select * from public.leads where organization_id=r.organization_id and pipeline_stage='NEW' and coalesce(created_at,stage_entered_at) <= now() - make_interval(hours=>coalesce((r.condition_json->>'hours')::int,24)) and not exists(select 1 from public.interactions i where i.organization_id=leads.organization_id and i.lead_id=leads.id and upper(coalesce(i.direction,''))='OUTBOUND') loop
        for om in select user_id from public.organization_members where organization_id=l.organization_id and status='ACTIVE' and (user_id=l.assigned_to or (l.assigned_to is null and role='OWNER')) loop
          v_dedupe := 'automation:uncontacted:'||r.id||':'||l.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(l.organization_id,r.id,'lead',l.id,'Alerta por lead sin contacto',v_dedupe) then
            insert into public.notifications(organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key)
            values(l.organization_id,om.user_id,l.team_id,l.id,'AUTOMATION_UNCONTACTED','HIGH','Lead sin contacto',coalesce(l.full_name,'Lead')||' superó el plazo configurado sin contacto saliente.','/protected/leads/'||l.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    elsif r.trigger_type='CLOSING_SOON' then
      for l in select * from public.leads where organization_id=r.organization_id and expected_close_date is not null and pipeline_stage not in ('WON','LOST') and expected_close_date between v_date and v_date + coalesce((r.condition_json->>'days')::int,2) loop
        for om in select user_id from public.organization_members where organization_id=l.organization_id and status='ACTIVE' and (role='OWNER' or user_id=l.assigned_to) loop
          v_dedupe := 'automation:closing:'||r.id||':'||l.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(l.organization_id,r.id,'lead',l.id,'Aviso de cierre próximo',v_dedupe) then
            insert into public.notifications(organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key)
            values(l.organization_id,om.user_id,l.team_id,l.id,'AUTOMATION_CLOSING_SOON','HIGH','Cierre próximo',coalesce(l.full_name,'Lead')||' tiene cierre estimado para '||to_char(l.expected_close_date,'DD/MM/YYYY')||'.','/protected/leads/'||l.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    end if;
  end loop;
  return v_count;
end; $$;
revoke all on function private.refresh_automation_rules() from public,anon,authenticated;

select cron.schedule('revscale-automation-engine-v1','*/15 * * * *',$$select private.refresh_automation_rules();$$)
where not exists(select 1 from cron.job where jobname='revscale-automation-engine-v1');

insert into public.automation_rules(organization_id,name,description,trigger_type,condition_json,action_type,action_config,system_key,created_by)
select s.organization_id,v.name,v.description,v.trigger_type,v.condition_json,v.action_type,v.action_config,v.system_key,null
from public.subscriptions s
cross join lateral (values
('Lead sin contacto','Si un lead sigue sin contacto saliente después del plazo elegido, avisar al agente.','LEAD_UNCONTACTED','{"hours":24}'::jsonb,'NOTIFY_AGENT','{}'::jsonb,'lead-uncontacted'),
('Visita realizada','Al entrar un lead en Visita, crear automáticamente un seguimiento para el día siguiente.','VISIT_RECORDED','{}'::jsonb,'CREATE_FOLLOWUP','{"hours_after":24}'::jsonb,'visit-followup'),
('Propiedad nueva','Al crear una propiedad, recalcular automáticamente los clientes compatibles.','PROPERTY_CREATED','{}'::jsonb,'CALCULATE_MATCHES','{}'::jsonb,'property-matching'),
('Reserva creada','Cuando una venta entra en Reserva, avisar a Dirección y administración.','RESERVATION_CREATED','{}'::jsonb,'NOTIFY_ADMIN','{}'::jsonb,'reservation-admin'),
('Cierre próximo','Cuando la fecha estimada de cierre se acerca, avisar al agente y a Dirección.','CLOSING_SOON','{"days":2}'::jsonb,'NOTIFY_AGENT_AND_DIRECTOR','{}'::jsonb,'closing-soon')
) as v(name,description,trigger_type,condition_json,action_type,action_config,system_key)
where upper(coalesce(s.status,''))='ACTIVE' and upper(coalesce(s.plan,'')) in ('PROFESSIONAL','PRO','ENTERPRISE')
on conflict (organization_id,system_key) do nothing;
