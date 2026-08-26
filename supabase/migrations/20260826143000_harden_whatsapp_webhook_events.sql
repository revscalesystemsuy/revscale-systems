create index if not exists whatsapp_webhook_events_connection_idx
  on public.whatsapp_webhook_events(connection_id)
  where connection_id is not null;

drop policy if exists "deny user access to whatsapp webhook events" on public.whatsapp_webhook_events;
create policy "deny user access to whatsapp webhook events"
on public.whatsapp_webhook_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

comment on policy "deny user access to whatsapp webhook events" on public.whatsapp_webhook_events is 'Webhook audit events are backend-only. service_role bypasses RLS; browser roles are explicitly denied.';
