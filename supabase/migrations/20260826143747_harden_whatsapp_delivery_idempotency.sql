alter table public.whatsapp_messages
  add column if not exists idempotency_key text,
  add column if not exists interaction_id uuid references public.interactions(id) on delete set null;

create unique index if not exists whatsapp_messages_org_idempotency_key_idx
  on public.whatsapp_messages(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists whatsapp_messages_interaction_id_idx
  on public.whatsapp_messages(interaction_id)
  where interaction_id is not null;

comment on column public.whatsapp_messages.idempotency_key is 'Backend-generated key used to prevent duplicate outbound WhatsApp sends across retries.';
comment on column public.whatsapp_messages.interaction_id is 'Commercial interaction created for this outbound message, linked once to keep SLA reconciliation idempotent.';
