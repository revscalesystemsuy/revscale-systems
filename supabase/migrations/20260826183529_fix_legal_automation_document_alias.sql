create or replace function private.refresh_legal_automation_rules()
returns integer language plpgsql security definer set search_path=''
as $$
declare
  r record; doc record; l record; om record; v_count integer:=0; v_dedupe text; v_date date:=(now() at time zone 'America/Montevideo')::date;
begin
  for r in
    select ar.* from public.automation_rules ar
    join public.subscriptions s on s.organization_id=ar.organization_id
    where ar.enabled and upper(coalesce(s.status,''))='ACTIVE' and upper(coalesce(s.plan,''))='ENTERPRISE'
      and ar.trigger_type like 'LEGAL_%'
  loop
    if r.trigger_type='LEGAL_REVIEW_PENDING' then
      for doc in select * from public.documents
        where organization_id=r.organization_id and legal_review_required and legal_review_status='PENDING'
          and status in ('DRAFT','GENERATED') and created_at <= now()-make_interval(hours=>coalesce((r.condition_json->>'hours')::int,24))
      loop
        for om in select user_id from public.organization_members where organization_id=doc.organization_id and status='ACTIVE' and role in ('OWNER','MANAGER') loop
          v_dedupe:='legal:review:'||r.id||':'||doc.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(doc.organization_id,r.id,'document',doc.id,'Revisión documental pendiente',v_dedupe) then
            insert into public.notifications(organization_id,user_id,type,priority,title,body,action_url,dedupe_key)
            values(doc.organization_id,om.user_id,'LEGAL_REVIEW_PENDING','HIGH','Revisión documental pendiente',doc.reference_code||' · '||doc.title||' requiere revisión antes de continuar.','/protected/documents/'||doc.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    elsif r.trigger_type='LEGAL_SIGNATURE_PENDING' then
      for doc in select * from public.documents
        where organization_id=r.organization_id and status in ('SENT','VIEWED') and sent_at is not null
          and sent_at <= now()-make_interval(hours=>coalesce((r.condition_json->>'hours')::int,48))
      loop
        for om in select distinct user_id from public.organization_members where organization_id=doc.organization_id and status='ACTIVE' and (role in ('OWNER','MANAGER') or user_id=doc.created_by) loop
          v_dedupe:='legal:signature:'||r.id||':'||doc.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(doc.organization_id,r.id,'document',doc.id,'Firma pendiente',v_dedupe) then
            insert into public.notifications(organization_id,user_id,type,priority,title,body,action_url,dedupe_key)
            values(doc.organization_id,om.user_id,'LEGAL_SIGNATURE_PENDING','HIGH','Firma pendiente',doc.reference_code||' sigue sin firma después del plazo configurado.','/protected/documents/'||doc.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    elsif r.trigger_type='LEGAL_DOCUMENT_EXPIRING' then
      for doc in select * from public.documents
        where organization_id=r.organization_id and status in ('SENT','VIEWED') and expires_at is not null
          and expires_at::date between v_date and v_date + coalesce((r.condition_json->>'days')::int,2)
      loop
        for om in select distinct user_id from public.organization_members where organization_id=doc.organization_id and status='ACTIVE' and (role in ('OWNER','MANAGER') or user_id=doc.created_by) loop
          v_dedupe:='legal:expiring:'||r.id||':'||doc.id||':'||om.user_id||':'||to_char(v_date,'YYYYMMDD');
          if private.log_automation_run(doc.organization_id,r.id,'document',doc.id,'Documento próximo a vencer',v_dedupe) then
            insert into public.notifications(organization_id,user_id,type,priority,title,body,action_url,dedupe_key)
            values(doc.organization_id,om.user_id,'LEGAL_DOCUMENT_EXPIRING','HIGH','Documento próximo a vencer',doc.reference_code||' vence el '||to_char(doc.expires_at at time zone 'America/Montevideo','DD/MM/YYYY HH24:MI')||'.','/protected/documents/'||doc.id,v_dedupe);
            v_count:=v_count+1;
          end if;
        end loop;
      end loop;
    elsif r.trigger_type='LEGAL_RESERVATION_DOCUMENT_MISSING' then
      for l in select * from public.leads lead_row
        where lead_row.organization_id=r.organization_id and lead_row.pipeline_stage='RESERVED'
          and coalesce(lead_row.stage_entered_at,lead_row.updated_at,lead_row.created_at) <= now()-make_interval(hours=>coalesce((r.condition_json->>'hours')::int,2))
          and not exists(select 1 from public.documents doc2 where doc2.organization_id=lead_row.organization_id and doc2.lead_id=lead_row.id and doc2.document_type='RESERVATION' and doc2.status not in ('VOIDED','DECLINED','EXPIRED'))
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

  update public.documents doc3
     set status='EXPIRED', updated_at=now()
   where doc3.status in ('SENT','VIEWED') and doc3.expires_at is not null and doc3.expires_at < now()
     and private.organization_has_legal_automation_access(doc3.organization_id);
  return v_count;
end;$$;
revoke all on function private.refresh_legal_automation_rules() from public, anon, authenticated;
