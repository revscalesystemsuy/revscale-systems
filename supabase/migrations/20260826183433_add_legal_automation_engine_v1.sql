alter table public.automation_rules drop constraint if exists automation_rules_trigger_check;
alter table public.automation_rules add constraint automation_rules_trigger_check check (trigger_type = any (array['LEAD_UNCONTACTED','VISIT_RECORDED','PROPERTY_CREATED','RESERVATION_CREATED','CLOSING_SOON','LEGAL_REVIEW_PENDING','LEGAL_SIGNATURE_PENDING','LEGAL_DOCUMENT_EXPIRING','LEGAL_RESERVATION_DOCUMENT_MISSING']::text[]));

alter table public.automation_rules drop constraint if exists automation_rules_action_check;
alter table public.automation_rules add constraint automation_rules_action_check check (action_type = any (array['NOTIFY_AGENT','CREATE_FOLLOWUP','CALCULATE_MATCHES','NOTIFY_ADMIN','NOTIFY_AGENT_AND_DIRECTOR','LEGAL_NOTIFY_MANAGEMENT','LEGAL_NOTIFY_OWNER_AND_MANAGEMENT']::text[]));

create index if not exists documents_org_review_pending_idx on public.documents (organization_id, created_at) where legal_review_required and legal_review_status='PENDING' and status in ('DRAFT','GENERATED');
create index if not exists documents_org_signature_pending_idx on public.documents (organization_id, sent_at) where status in ('SENT','VIEWED');
create index if not exists documents_org_expires_open_idx on public.documents (organization_id, expires_at) where expires_at is not null and status in ('SENT','VIEWED');

create or replace function private.organization_has_legal_automation_access(org_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.organization_id=org_id
      and upper(coalesce(s.status,''))='ACTIVE'
      and upper(coalesce(s.plan,''))='ENTERPRISE'
  );
$$;
revoke all on function private.organization_has_legal_automation_access(uuid) from public, anon;
grant execute on function private.organization_has_legal_automation_access(uuid) to authenticated;

create or replace function private.seed_default_legal_automation_rules(target_org uuid, actor uuid default null)
returns integer language plpgsql security definer set search_path=''
as $$
declare inserted_count integer:=0;
begin
  if not private.organization_has_legal_automation_access(target_org) then return 0; end if;
  insert into public.automation_rules(organization_id,name,description,trigger_type,condition_json,action_type,action_config,system_key,created_by)
  values
    (target_org,'Revisión documental pendiente','Escala a Dirección/Gerencia los documentos que requieren revisión y siguen pendientes.','LEGAL_REVIEW_PENDING','{"hours":24}'::jsonb,'LEGAL_NOTIFY_MANAGEMENT','{}'::jsonb,'legal-review-pending',actor),
    (target_org,'Firma pendiente','Avisa al responsable y a gestión si un documento enviado sigue sin firma.','LEGAL_SIGNATURE_PENDING','{"hours":48}'::jsonb,'LEGAL_NOTIFY_OWNER_AND_MANAGEMENT','{}'::jsonb,'legal-signature-pending',actor),
    (target_org,'Documento próximo a vencer','Anticipa vencimientos documentales antes de que bloqueen una operación.','LEGAL_DOCUMENT_EXPIRING','{"days":2}'::jsonb,'LEGAL_NOTIFY_OWNER_AND_MANAGEMENT','{}'::jsonb,'legal-document-expiring',actor),
    (target_org,'Reserva sin expediente','Detecta leads en Reserva que todavía no tienen documento de reserva vinculado.','LEGAL_RESERVATION_DOCUMENT_MISSING','{"hours":2}'::jsonb,'LEGAL_NOTIFY_MANAGEMENT','{}'::jsonb,'legal-reservation-document-missing',actor)
  on conflict (organization_id,system_key) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;$$;
revoke all on function private.seed_default_legal_automation_rules(uuid,uuid) from public, anon, authenticated;

create or replace function private.seed_legal_rules_after_subscription()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if upper(coalesce(new.status,''))='ACTIVE' and upper(coalesce(new.plan,''))='ENTERPRISE' then
    perform private.seed_default_legal_automation_rules(new.organization_id,null);
  end if;
  return new;
end;$$;
revoke all on function private.seed_legal_rules_after_subscription() from public, anon, authenticated;
drop trigger if exists subscriptions_seed_legal_automation_rules on public.subscriptions;
create trigger subscriptions_seed_legal_automation_rules after insert or update of plan,status on public.subscriptions for each row execute function private.seed_legal_rules_after_subscription();

create or replace function private.refresh_legal_automation_rules()
returns integer language plpgsql security definer set search_path=''
as $$
declare
  r record; d record; l record; om record; v_count integer:=0; v_dedupe text; v_date date:=(now() at time zone 'America/Montevideo')::date;
begin
  for r in
    select ar.* from public.automation_rules ar
    join public.subscriptions s on s.organization_id=ar.organization_id
    where ar.enabled and upper(coalesce(s.status,''))='ACTIVE' and upper(coalesce(s.plan,''))='ENTERPRISE'
      and ar.trigger_type like 'LEGAL_%'
  loop
    if r.trigger_type='LEGAL_REVIEW_PENDING' then
      for d in select * from public.documents
        where organization_id=r.organization_id and legal_review_required and legal_review_status='PENDING'
          and status in ('DRAFT','GENERATED') and created_at <= now()-make_interval(hours=>coalesce((r.condition_json->>'hours')::int,24))
      loop
        for om in select user_id from public.organization_members where organization_id=d.organization_id and status='ACTIVE' and role in ('OWNER','MANAGER') loop
          v_dedupe:='legal:review:'||r.id||':'||d.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(d.organization_id,r.id,'document',d.id,'Revisión documental pendiente',v_dedupe) then
            insert into public.notifications(organization_id,user_id,type,priority,title,body,action_url,dedupe_key)
            values(d.organization_id,om.user_id,'LEGAL_REVIEW_PENDING','HIGH','Revisión documental pendiente',d.reference_code||' · '||d.title||' requiere revisión antes de continuar.','/protected/documents/'||d.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    elsif r.trigger_type='LEGAL_SIGNATURE_PENDING' then
      for d in select * from public.documents
        where organization_id=r.organization_id and status in ('SENT','VIEWED') and sent_at is not null
          and sent_at <= now()-make_interval(hours=>coalesce((r.condition_json->>'hours')::int,48))
      loop
        for om in select distinct user_id from public.organization_members where organization_id=d.organization_id and status='ACTIVE' and (role in ('OWNER','MANAGER') or user_id=d.created_by) loop
          v_dedupe:='legal:signature:'||r.id||':'||d.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(d.organization_id,r.id,'document',d.id,'Firma pendiente',v_dedupe) then
            insert into public.notifications(organization_id,user_id,type,priority,title,body,action_url,dedupe_key)
            values(d.organization_id,om.user_id,'LEGAL_SIGNATURE_PENDING','HIGH','Firma pendiente',d.reference_code||' sigue sin firma después del plazo configurado.','/protected/documents/'||d.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    elsif r.trigger_type='LEGAL_DOCUMENT_EXPIRING' then
      for d in select * from public.documents
        where organization_id=r.organization_id and status in ('SENT','VIEWED') and expires_at is not null
          and expires_at::date between v_date and v_date + coalesce((r.condition_json->>'days')::int,2)
      loop
        for om in select distinct user_id from public.organization_members where organization_id=d.organization_id and status='ACTIVE' and (role in ('OWNER','MANAGER') or user_id=d.created_by) loop
          v_dedupe:='legal:expiring:'||r.id||':'||d.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(d.organization_id,r.id,'document',d.id,'Documento próximo a vencer',v_dedupe) then
            insert into public.notifications(organization_id,user_id,type,priority,title,body,action_url,dedupe_key)
            values(d.organization_id,om.user_id,'LEGAL_DOCUMENT_EXPIRING','HIGH','Documento próximo a vencer',d.reference_code||' vence el '||to_char(d.expires_at at time zone 'America/Montevideo','DD/MM/YYYY HH24:MI')||'.','/protected/documents/'||d.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    elsif r.trigger_type='LEGAL_RESERVATION_DOCUMENT_MISSING' then
      for l in select * from public.leads
        where organization_id=r.organization_id and pipeline_stage='RESERVED'
          and coalesce(stage_entered_at,updated_at,created_at) <= now()-make_interval(hours=>coalesce((r.condition_json->>'hours')::int,2))
          and not exists(select 1 from public.documents d where d.organization_id=leads.organization_id and d.lead_id=leads.id and d.document_type='RESERVATION' and d.status not in ('VOIDED','DECLINED','EXPIRED'))
      loop
        for om in select user_id from public.organization_members where organization_id=l.organization_id and status='ACTIVE' and role in ('OWNER','MANAGER') loop
          v_dedupe:='legal:reservation-missing:'||r.id||':'||l.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(l.organization_id,r.id,'lead',l.id,'Reserva sin expediente documental',v_dedupe) then
            insert into public.notifications(organization_id,user_id,lead_id,type,priority,title,body,action_url,dedupe_key)
            values(l.organization_id,om.user_id,l.id,'LEGAL_RESERVATION_DOCUMENT_MISSING','URGENT','Reserva sin expediente',coalesce(l.full_name,'Lead')||' está en Reserva sin documento de reserva vinculado.','/protected/leads/'||l.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    end if;
  end loop;

  update public.documents d
     set status='EXPIRED', updated_at=now()
   where d.status in ('SENT','VIEWED') and d.expires_at is not null and d.expires_at < now()
     and private.organization_has_legal_automation_access(d.organization_id);
  return v_count;
end;$$;
revoke all on function private.refresh_legal_automation_rules() from public, anon, authenticated;

do $$ declare r record; begin
  for r in select organization_id from public.subscriptions where upper(coalesce(status,''))='ACTIVE' and upper(coalesce(plan,''))='ENTERPRISE' loop
    perform private.seed_default_legal_automation_rules(r.organization_id,null);
  end loop;
end $$;

do $$ declare j record; begin
  for j in select jobid from cron.job where jobname='revscale-legal-automation-engine' loop perform cron.unschedule(j.jobid); end loop;
  perform cron.schedule('revscale-legal-automation-engine','*/15 * * * *','select private.refresh_legal_automation_rules();');
end $$;
