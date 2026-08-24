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
  req public.plan_requests%rowtype;
  target_org_id uuid;
  inserted_event_id uuid;
  normalized_status text := lower(coalesce(p_status,''));
  normalized_type text := lower(coalesce(p_event_type,''));
  normalized_plan text;
  expected_price_id text;
  should_activate boolean := false;
  should_suspend boolean := false;
begin
  if p_event_id is null or length(p_event_id)<5 or length(p_event_id)>120 then raise exception 'Invalid event id' using errcode='22023'; end if;
  if normalized_type not in ('transaction.completed','subscription.created','subscription.updated','subscription.canceled') then
    return jsonb_build_object('ok',true,'ignored',true,'reason','event_type');
  end if;

  insert into public.billing_events(provider,provider_event_id,event_type,provider_subscription_id,provider_transaction_id,provider_customer_id,provider_status)
  values('PADDLE',p_event_id,normalized_type,nullif(p_subscription_id,''),nullif(p_transaction_id,''),nullif(p_customer_id,''),nullif(normalized_status,''))
  on conflict(provider_event_id) do nothing returning id into inserted_event_id;
  if inserted_event_id is null then return jsonb_build_object('ok',true,'duplicate',true); end if;

  if p_plan_request_id is not null then select * into req from public.plan_requests where id=p_plan_request_id for update; end if;
  if req.id is null and nullif(p_subscription_id,'') is not null then
    select * into req from public.plan_requests where provider_subscription_id=p_subscription_id order by created_at desc limit 1 for update;
  end if;
  if req.id is null then
    update public.billing_events set processed_at=now(),error_text='No matching plan request' where id=inserted_event_id;
    return jsonb_build_object('ok',true,'ignored',true,'reason','plan_request');
  end if;

  update public.billing_events set plan_request_id=req.id where id=inserted_event_id;
  normalized_plan := case when upper(req.plan)='PRO' then 'PROFESSIONAL' else upper(req.plan) end;
  select c.paddle_price_id into expected_price_id from public.billing_price_catalog c
  where c.plan=normalized_plan and c.billing_cycle=req.billing_cycle and c.active=true;

  if normalized_type='transaction.completed' or (normalized_type in ('subscription.created','subscription.updated') and normalized_status in ('active','trialing')) then
    if expected_price_id is null then
      update public.billing_events set processed_at=now(),error_text='Paddle price catalog not configured' where id=inserted_event_id;
      return jsonb_build_object('ok',false,'ignored',true,'reason','price_not_configured');
    end if;
    if nullif(p_price_id,'') is null or p_price_id <> expected_price_id then
      update public.billing_events set processed_at=now(),error_text='Paddle price mismatch' where id=inserted_event_id;
      return jsonb_build_object('ok',false,'ignored',true,'reason','price_mismatch');
    end if;
    should_activate:=true;
  elsif normalized_type='subscription.canceled' or (normalized_type='subscription.updated' and normalized_status in ('past_due','paused','canceled')) then
    should_suspend:=true;
  end if;

  update public.plan_requests set
    billing_provider='PADDLE',
    provider_customer_id=coalesce(nullif(p_customer_id,''),provider_customer_id),
    provider_subscription_id=coalesce(nullif(p_subscription_id,''),provider_subscription_id),
    provider_transaction_id=coalesce(nullif(p_transaction_id,''),provider_transaction_id),
    payment_status=case when should_activate then 'PAID' else payment_status end,
    paid_at=case when should_activate then coalesce(paid_at,now()) else paid_at end
  where id=req.id;

  if should_activate then
    if coalesce(req.status,'PENDING')='PENDING' then target_org_id:=private.activate_plan_request_core(req.id); else target_org_id:=req.organization_id; end if;
    if target_org_id is not null then
      update public.subscriptions set
        status='ACTIVE',billing_cycle=req.billing_cycle,billing_provider='PADDLE',
        provider_customer_id=coalesce(nullif(p_customer_id,''),provider_customer_id),
        provider_subscription_id=coalesce(nullif(p_subscription_id,''),provider_subscription_id),
        current_period_end=coalesce(p_period_end,current_period_end),
        cancel_at_period_end=coalesce(p_cancel_at_period_end,false),
        billing_email=req.email,
        last_payment_status=case when normalized_type='transaction.completed' then 'PAID' else upper(coalesce(nullif(normalized_status,''),'ACTIVE')) end,
        updated_at=now()
      where organization_id=target_org_id;
    end if;
  elsif should_suspend then
    target_org_id:=req.organization_id;
    if target_org_id is not null then
      update public.subscriptions set
        status='SUSPENDED',billing_provider='PADDLE',
        provider_customer_id=coalesce(nullif(p_customer_id,''),provider_customer_id),
        provider_subscription_id=coalesce(nullif(p_subscription_id,''),provider_subscription_id),
        current_period_end=coalesce(p_period_end,current_period_end),
        cancel_at_period_end=coalesce(p_cancel_at_period_end,false),
        billing_email=coalesce(billing_email,req.email),
        last_payment_status=upper(coalesce(nullif(normalized_status,''),'CANCELED')),
        updated_at=now()
      where organization_id=target_org_id;
    end if;
  end if;

  update public.billing_events set processed_at=now() where id=inserted_event_id;
  return jsonb_build_object('ok',true,'activated',should_activate,'suspended',should_suspend,'organization_id',target_org_id);
exception when others then
  if inserted_event_id is not null then update public.billing_events set error_text=left(sqlerrm,500) where id=inserted_event_id; end if;
  raise;
end;
$$;

revoke all on function public.process_paddle_billing_event(text,text,uuid,text,text,text,text,timestamptz,boolean,text) from public,anon,authenticated;
grant execute on function public.process_paddle_billing_event(text,text,uuid,text,text,text,text,timestamptz,boolean,text) to service_role;
