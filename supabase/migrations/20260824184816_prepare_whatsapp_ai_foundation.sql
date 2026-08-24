create table public.whatsapp_ai_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  mode text not null default 'PREPARATION' check (mode in ('PREPARATION','LIVE','PAUSED')),
  auto_reply_enabled boolean not null default false,
  assistant_name text not null default 'RevScale',
  tone text not null default 'PROFESSIONAL_FRIENDLY',
  address_style text not null default 'VOS',
  emoji_level text not null default 'LOW',
  response_length text not null default 'SHORT',
  human_handoff_enabled boolean not null default true,
  handoff_keywords text[] not null default array['asesor','agente','humano','persona','reclamo','abogado']::text[],
  business_hours_only boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  status text not null default 'DISCONNECTED' check (status in ('DISCONNECTED','PENDING','CONNECTED','ERROR')),
  waba_id text,
  phone_number_id text unique,
  display_phone_number text,
  verified_name text,
  webhook_status text not null default 'NOT_CONFIGURED' check (webhook_status in ('NOT_CONFIGURED','PENDING','VERIFIED','ERROR')),
  last_webhook_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  connection_id uuid references public.whatsapp_connections(id) on delete set null,
  wa_contact_id text,
  status text not null default 'OPEN' check (status in ('OPEN','HUMAN_REQUIRED','CLOSED')),
  automation_paused boolean not null default false,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, lead_id)
);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  direction text not null check (direction in ('INBOUND','OUTBOUND')),
  sender_type text not null check (sender_type in ('CUSTOMER','AI','AGENT','SYSTEM')),
  external_message_id text unique,
  body text not null,
  detected_intent text,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  requires_human boolean not null default false,
  model_provider text,
  model_name text,
  usage_input_tokens integer check (usage_input_tokens is null or usage_input_tokens >= 0),
  usage_output_tokens integer check (usage_output_tokens is null or usage_output_tokens >= 0),
  created_at timestamptz not null default now()
);

create index whatsapp_conversations_org_last_idx on public.whatsapp_conversations (organization_id, last_message_at desc);
create index whatsapp_conversations_lead_idx on public.whatsapp_conversations (lead_id);
create index whatsapp_messages_conversation_created_idx on public.whatsapp_messages (conversation_id, created_at);
create index whatsapp_messages_org_created_idx on public.whatsapp_messages (organization_id, created_at desc);
create index whatsapp_messages_lead_created_idx on public.whatsapp_messages (lead_id, created_at desc);

alter table public.whatsapp_ai_settings enable row level security;
alter table public.whatsapp_connections enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

create policy "members can view whatsapp ai settings"
on public.whatsapp_ai_settings for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy "owners can create whatsapp ai settings"
on public.whatsapp_ai_settings for insert
to authenticated
with check ((select private.has_org_role(organization_id, array['OWNER']::text[])));

create policy "owners can update whatsapp ai settings"
on public.whatsapp_ai_settings for update
to authenticated
using ((select private.has_org_role(organization_id, array['OWNER']::text[])))
with check ((select private.has_org_role(organization_id, array['OWNER']::text[])));

create policy "owners can view whatsapp connections"
on public.whatsapp_connections for select
to authenticated
using ((select private.has_org_role(organization_id, array['OWNER']::text[])));

create policy "members can view accessible whatsapp conversations"
on public.whatsapp_conversations for select
to authenticated
using (exists (
  select 1 from public.leads l
  where l.id = whatsapp_conversations.lead_id
    and l.organization_id = whatsapp_conversations.organization_id
    and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
));

create policy "members can view accessible whatsapp messages"
on public.whatsapp_messages for select
to authenticated
using (exists (
  select 1 from public.leads l
  where l.id = whatsapp_messages.lead_id
    and l.organization_id = whatsapp_messages.organization_id
    and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
));

revoke all on public.whatsapp_ai_settings from anon;
revoke all on public.whatsapp_connections from anon;
revoke all on public.whatsapp_conversations from anon;
revoke all on public.whatsapp_messages from anon;

revoke all on public.whatsapp_ai_settings from authenticated;
revoke all on public.whatsapp_connections from authenticated;
revoke all on public.whatsapp_conversations from authenticated;
revoke all on public.whatsapp_messages from authenticated;

grant select, insert, update on public.whatsapp_ai_settings to authenticated;
grant select on public.whatsapp_connections to authenticated;
grant select on public.whatsapp_conversations to authenticated;
grant select on public.whatsapp_messages to authenticated;

grant all on public.whatsapp_ai_settings to service_role;
grant all on public.whatsapp_connections to service_role;
grant all on public.whatsapp_conversations to service_role;
grant all on public.whatsapp_messages to service_role;
