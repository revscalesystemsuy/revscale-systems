create table if not exists public.marketing_spend_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  channel text null,
  provider text null,
  campaign text null,
  ad text null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  source text not null default 'MANUAL' check (source in ('MANUAL','IMPORT','CONNECTOR')),
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists public.lead_attribution_touches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  touch_kind text not null check (touch_kind in ('FIRST_CAPTURE','SOURCE_CHANGE','MANUAL')),
  channel text null,
  provider text null,
  campaign text null,
  ad text null,
  listing text null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  touched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists marketing_spend_entries_org_period_currency_idx on public.marketing_spend_entries(organization_id, period_start, period_end, currency);
create index if not exists marketing_spend_entries_org_campaign_idx on public.marketing_spend_entries(organization_id, campaign, provider, channel);
create index if not exists marketing_spend_entries_created_by_idx on public.marketing_spend_entries(created_by);
create index if not exists lead_attribution_touches_org_lead_time_idx on public.lead_attribution_touches(organization_id, lead_id, touched_at);
create index if not exists lead_attribution_touches_org_campaign_idx on public.lead_attribution_touches(organization_id, campaign, provider, channel, touched_at);

alter table public.marketing_spend_entries enable row level security;
alter table public.lead_attribution_touches enable row level security;

grant select, insert, update, delete on public.marketing_spend_entries to authenticated;
grant select on public.lead_attribution_touches to authenticated;

create policy marketing_spend_select on public.marketing_spend_entries for select to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = marketing_spend_entries.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
);
create policy marketing_spend_insert on public.marketing_spend_entries for insert to authenticated with check (
  exists (select 1 from public.organization_members om where om.organization_id = marketing_spend_entries.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
  and (created_by is null or created_by = (select auth.uid()))
);
create policy marketing_spend_update on public.marketing_spend_entries for update to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = marketing_spend_entries.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
) with check (
  exists (select 1 from public.organization_members om where om.organization_id = marketing_spend_entries.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
);
create policy marketing_spend_delete on public.marketing_spend_entries for delete to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = marketing_spend_entries.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
);
create policy attribution_touches_select on public.lead_attribution_touches for select to authenticated using (
  exists (select 1 from public.leads l where l.id = lead_attribution_touches.lead_id and l.organization_id = lead_attribution_touches.organization_id and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to))
);

create or replace function private.capture_lead_attribution_touch()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_kind text;
begin
  if tg_op = 'INSERT' then
    v_kind := 'FIRST_CAPTURE';
  elsif not (
    old.source_channel is distinct from new.source_channel or
    old.source_provider is distinct from new.source_provider or
    old.source_campaign is distinct from new.source_campaign or
    old.source_ad is distinct from new.source_ad or
    old.source_listing is distinct from new.source_listing or
    old.utm_source is distinct from new.utm_source or
    old.utm_medium is distinct from new.utm_medium or
    old.utm_campaign is distinct from new.utm_campaign or
    old.utm_content is distinct from new.utm_content
  ) then
    return new;
  else
    v_kind := 'SOURCE_CHANGE';
  end if;

  if coalesce(new.source_channel,new.source_provider,new.source_campaign,new.source_ad,new.source_listing,new.utm_source,new.utm_medium,new.utm_campaign,new.utm_content) is null then
    return new;
  end if;

  insert into public.lead_attribution_touches(
    organization_id,lead_id,touch_kind,channel,provider,campaign,ad,listing,
    utm_source,utm_medium,utm_campaign,utm_content,touched_at
  ) values (
    new.organization_id,new.id,v_kind,new.source_channel,new.source_provider,new.source_campaign,new.source_ad,new.source_listing,
    new.utm_source,new.utm_medium,new.utm_campaign,new.utm_content,
    case when tg_op='INSERT' then coalesce(new.received_at,new.created_at,now()) else now() end
  );
  return new;
end;
$$;

revoke all on function private.capture_lead_attribution_touch() from public, anon, authenticated;

drop trigger if exists leads_capture_attribution_touch on public.leads;
create trigger leads_capture_attribution_touch
after insert or update of source_channel,source_provider,source_campaign,source_ad,source_listing,utm_source,utm_medium,utm_campaign,utm_content
on public.leads
for each row execute function private.capture_lead_attribution_touch();

insert into public.lead_attribution_touches(
  organization_id,lead_id,touch_kind,channel,provider,campaign,ad,listing,
  utm_source,utm_medium,utm_campaign,utm_content,touched_at
)
select
  l.organization_id,l.id,'FIRST_CAPTURE',l.source_channel,l.source_provider,l.source_campaign,l.source_ad,l.source_listing,
  l.utm_source,l.utm_medium,l.utm_campaign,l.utm_content,coalesce(l.received_at,l.created_at,now())
from public.leads l
where coalesce(l.source_channel,l.source_provider,l.source_campaign,l.source_ad,l.source_listing,l.utm_source,l.utm_medium,l.utm_campaign,l.utm_content) is not null
  and not exists (select 1 from public.lead_attribution_touches t where t.lead_id=l.id and t.touch_kind='FIRST_CAPTURE');
