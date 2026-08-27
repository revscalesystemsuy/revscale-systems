-- Follow-up hardening for live portal connectors after database advisor review.

create index if not exists portal_connections_connected_by_idx
  on public.portal_connections(connected_by)
  where connected_by is not null;

create index if not exists portal_oauth_states_organization_idx
  on public.portal_oauth_states(organization_id);

create index if not exists portal_oauth_states_user_idx
  on public.portal_oauth_states(user_id);

create index if not exists portal_sync_events_connection_idx
  on public.portal_sync_events(connection_id)
  where connection_id is not null;

-- portal_oauth_states is backend-only. Keep an explicit deny policy so the intent
-- remains visible to RLS tooling even though authenticated table grants are revoked.
drop policy if exists "clients cannot read portal oauth states" on public.portal_oauth_states;
create policy "clients cannot read portal oauth states"
on public.portal_oauth_states
for select
to authenticated
using (false);
