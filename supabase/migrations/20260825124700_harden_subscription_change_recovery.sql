create or replace function public.cancel_pending_subscription_change(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Usuario no autenticado'; end if;

  update public.subscription_change_requests scr
  set status='CANCELED',processed_at=now(),error_text=coalesce(error_text,'No se pudo iniciar el cambio en el proveedor')
  where scr.id=p_request_id
    and scr.requested_by=v_user_id
    and scr.status='PENDING'
    and exists (
      select 1 from public.organization_members om
      where om.organization_id=scr.organization_id
        and om.user_id=v_user_id
        and om.status='ACTIVE'
        and om.role='OWNER'
    );

  return found;
end;
$$;

revoke all on function public.cancel_pending_subscription_change(uuid) from public, anon;
grant execute on function public.cancel_pending_subscription_change(uuid) to authenticated;

create or replace function public.process_paddle_billing_event(
  p_event_id text,
  p_event_type text,
  p_plan_request_id uuid default null,
  p_subscription_id text default null,
  p_transaction_id text default null,
  p_customer_id text default null,
  p_status text default null,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_price_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_change public.subscription_change_requests%rowtype;
  v_event_id uuid;
  v_type text := lower(coalesce(p_event_type,''));
  v_status text := lower(coalesce(p_status,''));
  v_limit_agents integer;
  v_limit_leads integer;
  v_limit_properties integer;
begin
  if p_subscription_id is not null and p_price_id is not null
     and v_type in ('subscription.created','subscription.updated')
     and v_status in ('active','trialing') then

    select scr.* into v_change
    from public.subscription_change_requests scr
    join public.billing_price_catalog c
      on c.plan=scr.to_plan
     and c.billing_cycle=scr.to_billing_cycle
     and c.active=true
     and c.paddle_price_id=p_price_id
    where scr.provider_subscription_id=p_subscription_id
      and scr.status in ('PENDING','PROCESSING')
    order by scr.created_at desc
    limit 1
    for update of scr;

    if v_change.id is not null then
      insert into public.billing_events(
        provider,provider_event_id,event_type,provider_subscription_id,
        provider_transaction_id,provider_customer_id,provider_status
      ) values (
        'PADDLE',p_event_id,v_type,p_subscription_id,
        nullif(p_transaction_id,''),nullif(p_customer_id,''),nullif(v_status,'')
      )
      on conflict(provider_event_id) do nothing
      returning id into v_event_id;

      if v_event_id is null then
        return jsonb_build_object('ok',true,'duplicate',true);
      end if;

      v_limit_agents := case v_change.to_plan when 'STARTER' then 3 when 'PROFESSIONAL' then 15 else 30 end;
      v_limit_leads := case v_change.to_plan when 'STARTER' then 500 else 1000000 end;
      v_limit_properties := case v_change.to_plan when 'STARTER' then 100 else 1000000 end;

      update public.subscriptions
      set plan=v_change.to_plan,
          billing_cycle=v_change.to_billing_cycle,
          status='ACTIVE',
          max_agents=v_limit_agents,
          max_leads=v_limit_leads,
          max_properties=v_limit_properties,
          billing_provider='PADDLE',
          provider_customer_id=coalesce(nullif(p_customer_id,''),provider_customer_id),
          provider_subscription_id=p_subscription_id,
          current_period_end=coalesce(p_period_end,current_period_end),
          cancel_at_period_end=coalesce(p_cancel_at_period_end,false),
          last_payment_status=upper(coalesce(nullif(v_status,''),'ACTIVE')),
          updated_at=now()
      where organization_id=v_change.organization_id;

      update public.subscription_change_requests
      set status='COMPLETED',processed_at=now(),error_text=null
      where id=v_change.id;

      update public.billing_events
      set processed_at=now()
      where id=v_event_id;

      return jsonb_build_object(
        'ok',true,
        'changed',true,
        'organization_id',v_change.organization_id,
        'plan',v_change.to_plan,
        'billing_cycle',v_change.to_billing_cycle
      );
    end if;
  end if;

  return public.process_paddle_billing_event_initial(
    p_event_id,p_event_type,p_plan_request_id,p_subscription_id,p_transaction_id,
    p_customer_id,p_status,p_period_end,p_cancel_at_period_end,p_price_id
  );
end;
$$;

revoke all on function public.process_paddle_billing_event(text,text,uuid,text,text,text,text,timestamptz,boolean,text)
  from public,anon,authenticated;
grant execute on function public.process_paddle_billing_event(text,text,uuid,text,text,text,text,timestamptz,boolean,text)
  to service_role;
