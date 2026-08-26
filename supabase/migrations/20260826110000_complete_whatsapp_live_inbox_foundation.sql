alter table public.leads
  add column if not exists phone_normalized text,
  add column if not exists purchase_timeline text,
  add column if not exists financing_needed boolean,
  add column if not exists visit_intent boolean;

create or replace function private.normalize_phone(input_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(coalesce(input_phone, ''), '[^0-9]', '', 'g'), '');
$$;

update public.leads
set phone_normalized = private.normalize_phone(phone)
where phone_normalized is distinct from private.normalize_phone(phone);

create or replace function private.sync_lead_phone_normalized()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone_normalized := private.normalize_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists trg_sync_lead_phone_normalized on public.leads;
create trigger trg_sync_lead_phone_normalized
before insert or update of phone on public.leads
for each row execute function private.sync_lead_phone_normalized();

create index if not exists leads_org_phone_normalized_idx
  on public.leads(organization_id, phone_normalized)
  where phone_normalized is not null;

alter table public.whatsapp_connections
  add column if not exists graph_api_version text,
  add column if not exists quality_rating text,
  add column if not exists last_error text;

alter table public.whatsapp_conversations
  add column if not exists handoff_reason text,
  add column if not exists handoff_requested_at timestamptz,
  add column if not exists handoff_resolved_at timestamptz,
  add column if not exists handoff_requested_by text,
  add column if not exists priority smallint not null default 50,
  add column if not exists next_action text,
  add column if not exists context_property_id uuid references public.properties(id) on delete set null,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists unread_count integer not null default 0;

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_handoff_requested_by_check,
  add constraint whatsapp_conversations_handoff_requested_by_check
    check (handoff_requested_by is null or handoff_requested_by in ('CUSTOMER','AI','AGENT','SYSTEM')),
  drop constraint if exists whatsapp_conversations_priority_check,
  add constraint whatsapp_conversations_priority_check check (priority between 0 and 100),
  drop constraint if exists whatsapp_conversations_unread_count_check,
  add constraint whatsapp_conversations_unread_count_check check (unread_count >= 0);

create unique index if not exists whatsapp_conversations_org_contact_idx
  on public.whatsapp_conversations(organization_id, wa_contact_id)
  where wa_contact_id is not null;
create index if not exists whatsapp_conversations_org_status_last_idx
  on public.whatsapp_conversations(organization_id, status, last_message_at desc);
create index if not exists whatsapp_conversations_context_property_idx
  on public.whatsapp_conversations(context_property_id)
  where context_property_id is not null;

alter table public.whatsapp_messages
  add column if not exists message_type text not null default 'TEXT',
  add column if not exists status text not null default 'RECEIVED',
  add column if not exists sender_user_id uuid references auth.users(id) on delete set null,
  add column if not exists reply_to_external_message_id text,
  add column if not exists provider_timestamp timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists error_code text,
  add column if not exists error_message text;

alter table public.whatsapp_messages
  drop constraint if exists whatsapp_messages_message_type_check,
  add constraint whatsapp_messages_message_type_check
    check (message_type in ('TEXT','IMAGE','VIDEO','AUDIO','DOCUMENT','STICKER','LOCATION','CONTACTS','INTERACTIVE','REACTION','UNKNOWN')),
  drop constraint if exists whatsapp_messages_status_check,
  add constraint whatsapp_messages_status_check
    check (status in ('RECEIVED','QUEUED','SENT','DELIVERED','READ','FAILED'));

create index if not exists whatsapp_messages_external_status_idx
  on public.whatsapp_messages(external_message_id, status)
  where external_message_id is not null;
create index if not exists whatsapp_messages_sender_user_idx
  on public.whatsapp_messages(sender_user_id, created_at desc)
  where sender_user_id is not null;

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  organization_id uuid references public.organizations(id) on delete cascade,
  connection_id uuid references public.whatsapp_connections(id) on delete set null,
  phone_number_id text,
  external_message_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'RECEIVED' check (processing_status in ('RECEIVED','PROCESSED','IGNORED','ERROR')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists whatsapp_webhook_events_org_received_idx
  on public.whatsapp_webhook_events(organization_id, received_at desc);
create index if not exists whatsapp_webhook_events_external_message_idx
  on public.whatsapp_webhook_events(external_message_id)
  where external_message_id is not null;

alter table public.whatsapp_webhook_events enable row level security;
revoke all on public.whatsapp_webhook_events from public, anon, authenticated;
grant all on public.whatsapp_webhook_events to service_role;

-- Inbox users may only mutate handoff/workflow fields on conversations they can already access.
drop policy if exists "members can update accessible whatsapp workflow" on public.whatsapp_conversations;
create policy "members can update accessible whatsapp workflow"
on public.whatsapp_conversations
for update
to authenticated
using (
  exists (
    select 1 from public.leads l
    where l.id = whatsapp_conversations.lead_id
      and l.organization_id = whatsapp_conversations.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
)
with check (
  exists (
    select 1 from public.leads l
    where l.id = whatsapp_conversations.lead_id
      and l.organization_id = whatsapp_conversations.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);

grant update (
  status,
  automation_paused,
  handoff_reason,
  handoff_requested_at,
  handoff_resolved_at,
  handoff_requested_by,
  next_action,
  context_property_id,
  unread_count,
  updated_at
) on public.whatsapp_conversations to authenticated;

-- No browser/client role may create provider messages or webhook events directly.
revoke insert, update, delete on public.whatsapp_messages from authenticated, anon;
revoke insert, update, delete on public.whatsapp_connections from authenticated, anon;

comment on table public.whatsapp_webhook_events is 'Backend-only idempotency and audit log for Meta WhatsApp webhook events. Never expose secrets here.';
comment on column public.whatsapp_connections.last_error is 'Non-secret operational error summary only. Meta access tokens and app secrets must remain in Edge Function secrets.';
comment on column public.leads.purchase_timeline is 'Commercial timing/urgency learned progressively from qualification.';
comment on column public.leads.financing_needed is 'Whether the lead indicated financing is needed; does not represent financing approval.';
comment on column public.leads.visit_intent is 'Whether the lead expressed intent to schedule or attend a property visit.';