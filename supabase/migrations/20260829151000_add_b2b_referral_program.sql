create table if not exists public.b2b_referral_program_settings (
  program_key text primary key,
  customer_credit_fraction numeric not null default 0.50 check (customer_credit_fraction > 0 and customer_credit_fraction <= 1),
  annual_credit_cap_count integer check (annual_credit_cap_count is null or annual_credit_cap_count > 0),
  new_customer_benefit_default text not null default 'ONBOARDING_COMPED' check (new_customer_benefit_default in ('ONBOARDING_COMPED','OPTIMIZATION_SESSION')),
  is_active boolean not null default true,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.b2b_referral_program_settings (program_key, customer_credit_fraction, annual_credit_cap_count, new_customer_benefit_default, is_active)
values ('REVSCALE_NETWORK', 0.50, null, 'ONBOARDING_COMPED', true)
on conflict (program_key) do nothing;

create table if not exists public.b2b_referral_codes (
  id uuid primary key default gen_random_uuid(),
  referrer_organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','RETIRED')),
  eligibility_basis text not null check (eligibility_basis in ('FIRST_AHA','POSITIVE_BUSINESS_REVIEW','MANUAL_VERIFIED')),
  eligibility_evidence text not null,
  eligible_at timestamptz not null default now(),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(trim(eligibility_evidence), '') is not null)
);

create table if not exists public.b2b_referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.b2b_referral_codes(id) on delete restrict,
  referrer_organization_id uuid not null references public.organizations(id) on delete restrict,
  referred_organization_id uuid references public.organizations(id) on delete set null,
  opportunity_id uuid references public.b2b_opportunities(id) on delete set null,
  referred_company text not null,
  referred_contact_name text not null,
  referred_email text not null,
  referred_phone text,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','QUALIFIED','PAID_MONTH_1','ELIGIBLE_REWARD','REWARD_APPROVED','CREDIT_APPLIED','DISQUALIFIED')),
  disqualification_reason text,
  new_customer_benefit text not null check (new_customer_benefit in ('ONBOARDING_COMPED','OPTIMIZATION_SESSION')),
  new_customer_benefit_fulfilled_at timestamptz,
  billing_payment_count integer not null default 0 check (billing_payment_count >= 0),
  second_payment_completed_at timestamptz,
  referrer_credit_fraction numeric not null default 0.50 check (referrer_credit_fraction > 0 and referrer_credit_fraction <= 1),
  referrer_credit_amount_usd numeric check (referrer_credit_amount_usd is null or referrer_credit_amount_usd >= 0),
  discount_conflict_cleared_at timestamptz,
  annual_cap_checked_at timestamptz,
  reward_approved_at timestamptz,
  reward_approved_by uuid,
  credit_applied_at timestamptz,
  credit_application_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status <> 'DISQUALIFIED') or nullif(trim(coalesce(disqualification_reason,'')), '') is not null),
  check ((status <> 'REWARD_APPROVED' and status <> 'CREDIT_APPLIED') or (second_payment_completed_at is not null and referrer_credit_amount_usd is not null and discount_conflict_cleared_at is not null and annual_cap_checked_at is not null)),
  check (status <> 'CREDIT_APPLIED' or (credit_applied_at is not null and nullif(trim(coalesce(credit_application_reference,'')), '') is not null))
);
create unique index if not exists b2b_referrals_active_email_uidx on public.b2b_referrals (lower(referred_email)) where status <> 'DISQUALIFIED';
create index if not exists b2b_referrals_referrer_idx on public.b2b_referrals(referrer_organization_id, created_at desc);
create index if not exists b2b_referrals_status_idx on public.b2b_referrals(status, created_at desc);
create index if not exists b2b_referral_codes_org_idx on public.b2b_referral_codes(referrer_organization_id, status);

alter table public.b2b_referral_program_settings enable row level security;
alter table public.b2b_referral_codes enable row level security;
alter table public.b2b_referrals enable row level security;

drop policy if exists "platform admins can view referral settings" on public.b2b_referral_program_settings;
create policy "platform admins can view referral settings" on public.b2b_referral_program_settings for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update referral settings" on public.b2b_referral_program_settings;
create policy "platform admins can update referral settings" on public.b2b_referral_program_settings for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can view referral codes" on public.b2b_referral_codes;
create policy "platform admins can view referral codes" on public.b2b_referral_codes for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert referral codes" on public.b2b_referral_codes;
create policy "platform admins can insert referral codes" on public.b2b_referral_codes for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update referral codes" on public.b2b_referral_codes;
create policy "platform admins can update referral codes" on public.b2b_referral_codes for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can view referrals" on public.b2b_referrals;
create policy "platform admins can view referrals" on public.b2b_referrals for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update referrals" on public.b2b_referrals;
create policy "platform admins can update referrals" on public.b2b_referrals for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

create or replace function public.create_customer_referral_code(p_referrer_organization_id uuid,p_eligibility_basis text,p_eligibility_evidence text) returns text language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_code text;
begin
 if v_user is null or not exists(select 1 from public.platform_admins where user_id=v_user) then raise exception 'admin_required'; end if;
 if not exists(select 1 from public.organizations where id=p_referrer_organization_id) then raise exception 'organization_not_found'; end if;
 if p_eligibility_basis not in ('FIRST_AHA','POSITIVE_BUSINESS_REVIEW','MANUAL_VERIFIED') then raise exception 'invalid_eligibility_basis'; end if;
 if nullif(trim(coalesce(p_eligibility_evidence,'')),'') is null then raise exception 'eligibility_evidence_required'; end if;
 loop v_code:='RSN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); exit when not exists(select 1 from public.b2b_referral_codes where code=v_code); end loop;
 insert into public.b2b_referral_codes(referrer_organization_id,code,eligibility_basis,eligibility_evidence,created_by) values(p_referrer_organization_id,v_code,p_eligibility_basis,trim(p_eligibility_evidence),v_user);
 return v_code;
end $$;

create or replace function public.submit_customer_referral(p_code text,p_name text,p_company text,p_email text,p_phone text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_code public.b2b_referral_codes%rowtype; v_settings public.b2b_referral_program_settings%rowtype; v_referral_id uuid; v_opportunity_id uuid; v_referrer_billing_email text; v_email text:=lower(trim(coalesce(p_email,'')));
begin
 select * into v_settings from public.b2b_referral_program_settings where program_key='REVSCALE_NETWORK' and is_active=true; if not found then raise exception 'referral_program_inactive'; end if;
 select * into v_code from public.b2b_referral_codes where code=upper(trim(p_code)) and status='ACTIVE'; if not found then raise exception 'invalid_referral_code'; end if;
 if length(trim(coalesce(p_name,'')))<2 or length(trim(coalesce(p_company,'')))<2 then raise exception 'invalid_contact'; end if;
 if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
 select lower(trim(billing_email)) into v_referrer_billing_email from public.subscriptions where organization_id=v_code.referrer_organization_id and billing_email is not null order by updated_at desc limit 1;
 if v_referrer_billing_email is not null and v_referrer_billing_email=v_email then raise exception 'self_referral_not_allowed'; end if;
 begin
  insert into public.b2b_referrals(referral_code_id,referrer_organization_id,referred_company,referred_contact_name,referred_email,referred_phone,new_customer_benefit,referrer_credit_fraction)
  values(v_code.id,v_code.referrer_organization_id,trim(p_company),trim(p_name),v_email,nullif(trim(coalesce(p_phone,'')),''),v_settings.new_customer_benefit_default,v_settings.customer_credit_fraction) returning id into v_referral_id;
 exception when unique_violation then raise exception 'referral_already_attributed'; end;
 insert into public.b2b_opportunities(source_type,source_id,company,contact_name,email,phone,source_status,stage,primary_channel,plan_interest,next_step,next_step_due_at,acquisition_source,acquisition_detail,acquisition_campaign)
 values('MANUAL',v_referral_id,trim(p_company),trim(p_name),v_email,nullif(trim(coalesce(p_phone,'')),''),'REFERRAL_SUBMITTED','NEW','WEB','UNKNOWN','Validar fit del referido y confirmar atribución RevScale Network.',now()+interval '1 day','REFERRAL',v_code.code,'REVSCALE_NETWORK') returning id into v_opportunity_id;
 update public.b2b_referrals set opportunity_id=v_opportunity_id,updated_at=now() where id=v_referral_id;
 return jsonb_build_object('referral_id',v_referral_id,'opportunity_id',v_opportunity_id,'status','SUBMITTED');
end $$;
grant execute on function public.submit_customer_referral(text,text,text,text,text) to anon,authenticated;

create or replace function public.refresh_customer_referral_eligibility(p_referral_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_ref public.b2b_referrals%rowtype; v_provider_customer_id text; v_payment_count integer:=0; v_second_payment timestamptz; v_referrer_plan text; v_monthly_price numeric; v_status text;
begin
 if v_user is null or not exists(select 1 from public.platform_admins where user_id=v_user) then raise exception 'admin_required'; end if;
 select * into v_ref from public.b2b_referrals where id=p_referral_id for update; if not found then raise exception 'referral_not_found'; end if;
 if v_ref.referred_organization_id is null then raise exception 'referred_organization_required'; end if;
 select provider_customer_id into v_provider_customer_id from public.subscriptions where organization_id=v_ref.referred_organization_id order by updated_at desc limit 1;
 if v_provider_customer_id is not null then
  select count(*),max(received_at) filter(where rn=2) into v_payment_count,v_second_payment from (
   select min(received_at) as received_at,row_number() over(order by min(received_at)) as rn from public.billing_events
   where provider_customer_id=v_provider_customer_id and event_type='transaction.completed' and provider_status='completed'
   group by coalesce(provider_transaction_id,id::text)
  ) q;
 end if;
 select plan into v_referrer_plan from public.subscriptions where organization_id=v_ref.referrer_organization_id order by updated_at desc limit 1;
 if v_referrer_plan is not null then select price_usd into v_monthly_price from public.billing_price_catalog where plan=v_referrer_plan and billing_cycle='MONTHLY' and active=true limit 1; end if;
 v_status:=v_ref.status;
 if v_ref.status not in ('REWARD_APPROVED','CREDIT_APPLIED','DISQUALIFIED') then
  if v_payment_count>=2 then v_status:='ELIGIBLE_REWARD'; elsif v_payment_count=1 then v_status:='PAID_MONTH_1'; else v_status:=case when v_ref.status='QUALIFIED' then 'QUALIFIED' else 'SUBMITTED' end; end if;
 end if;
 update public.b2b_referrals set billing_payment_count=v_payment_count,second_payment_completed_at=v_second_payment,referrer_credit_amount_usd=case when v_monthly_price is null then referrer_credit_amount_usd else round(v_monthly_price*referrer_credit_fraction,2) end,status=v_status,updated_at=now() where id=p_referral_id;
 return jsonb_build_object('payment_count',v_payment_count,'second_payment_completed_at',v_second_payment,'status',v_status,'credit_amount_usd',case when v_monthly_price is null then v_ref.referrer_credit_amount_usd else round(v_monthly_price*v_ref.referrer_credit_fraction,2) end);
end $$;

create or replace function public.approve_customer_referral_reward(p_referral_id uuid,p_discount_conflict_cleared boolean,p_notes text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_ref public.b2b_referrals%rowtype; v_settings public.b2b_referral_program_settings%rowtype; v_rewarded_this_year integer;
begin
 if v_user is null or not exists(select 1 from public.platform_admins where user_id=v_user) then raise exception 'admin_required'; end if;
 perform public.refresh_customer_referral_eligibility(p_referral_id);
 select * into v_ref from public.b2b_referrals where id=p_referral_id for update;
 select * into v_settings from public.b2b_referral_program_settings where program_key='REVSCALE_NETWORK';
 if v_ref.status<>'ELIGIBLE_REWARD' then raise exception 'referral_not_reward_eligible'; end if;
 if v_settings.annual_credit_cap_count is null then raise exception 'annual_credit_cap_not_configured'; end if;
 if not coalesce(p_discount_conflict_cleared,false) then raise exception 'permanent_discount_conflict_must_be_cleared'; end if;
 if v_ref.referrer_credit_amount_usd is null then raise exception 'credit_amount_unavailable'; end if;
 select count(*) into v_rewarded_this_year from public.b2b_referrals where referrer_organization_id=v_ref.referrer_organization_id and status in ('REWARD_APPROVED','CREDIT_APPLIED') and coalesce(reward_approved_at,created_at)>=date_trunc('year',now());
 if v_rewarded_this_year>=v_settings.annual_credit_cap_count then raise exception 'annual_credit_cap_reached'; end if;
 update public.b2b_referrals set status='REWARD_APPROVED',discount_conflict_cleared_at=now(),annual_cap_checked_at=now(),reward_approved_at=now(),reward_approved_by=v_user,notes=case when nullif(trim(coalesce(p_notes,'')),'') is null then notes else concat_ws(E'\n',notes,trim(p_notes)) end,updated_at=now() where id=p_referral_id;
 return jsonb_build_object('status','REWARD_APPROVED','credit_amount_usd',v_ref.referrer_credit_amount_usd);
end $$;

create or replace function public.mark_customer_referral_credit_applied(p_referral_id uuid,p_reference text) returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not exists(select 1 from public.platform_admins where user_id=v_user) then raise exception 'admin_required'; end if;
 if nullif(trim(coalesce(p_reference,'')),'') is null then raise exception 'credit_application_reference_required'; end if;
 update public.b2b_referrals set status='CREDIT_APPLIED',credit_applied_at=now(),credit_application_reference=trim(p_reference),updated_at=now() where id=p_referral_id and status='REWARD_APPROVED';
 if not found then raise exception 'reward_must_be_approved_first'; end if;
end $$;

create or replace function public.mark_referral_new_customer_benefit_fulfilled(p_referral_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not exists(select 1 from public.platform_admins where user_id=v_user) then raise exception 'admin_required'; end if;
 update public.b2b_referrals set new_customer_benefit_fulfilled_at=now(),updated_at=now() where id=p_referral_id;
 if not found then raise exception 'referral_not_found'; end if;
end $$;