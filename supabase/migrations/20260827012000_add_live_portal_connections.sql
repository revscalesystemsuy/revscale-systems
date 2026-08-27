-- Live real-estate portal connection foundation.
-- Metadata is visible to authorized users; provider credentials remain encrypted in Supabase Vault.

create table if not exists public.portal_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('MERCADOLIBRE','INFOCASAS')),
  status text not null default 'DISCONNECTED' check (status in ('DISCONNECTED','PENDING','CONNECTED','ERROR')),
  external_account_id text,
  external_account_name text,
  scopes text[] not null default '{}',
  token_expires_at timestamptz,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create index if not exists portal_connections_org_provider_idx
  on public.portal_connections(organization_id, provider);

alter table public.portal_connections enable row level security;
revoke all on public.portal_connections from public, anon, authenticated;
grant select on public.portal_connections to authenticated;
grant all on public.portal_connections to service_role;

create policy "management can view portal connections"
on public.portal_connections
for select
to authenticated
using (
  private.can_manage_property_distribution(organization_id)
);

create table if not exists public.portal_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  provider text not null check (provider in ('MERCADOLIBRE')),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists portal_oauth_states_expiry_idx
  on public.portal_oauth_states(expires_at)
  where consumed_at is null;

alter table public.portal_oauth_states enable row level security;
revoke all on public.portal_oauth_states from public, anon, authenticated;
grant all on public.portal_oauth_states to service_role;

create table if not exists private.portal_connection_secrets (
  connection_id uuid primary key references public.portal_connections(id) on delete cascade,
  vault_secret_id uuid not null unique,
  updated_at timestamptz not null default now()
);

revoke all on private.portal_connection_secrets from public, anon, authenticated;

alter table public.property_publications
  add column if not exists provider_payload jsonb not null default '{}'::jsonb,
  add column if not exists last_sync_status text,
  add column if not exists sync_attempted_at timestamptz;

alter table public.property_publications
  drop constraint if exists property_publications_last_sync_status_check;
alter table public.property_publications
  add constraint property_publications_last_sync_status_check
  check (last_sync_status is null or last_sync_status in ('QUEUED','SUCCESS','ERROR'));

create table if not exists public.portal_sync_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.portal_connections(id) on delete set null,
  publication_id uuid references public.property_publications(id) on delete set null,
  provider text not null check (provider in ('MERCADOLIBRE','INFOCASAS')),
  action text not null check (action in ('PUBLISH','SYNC','PAUSE','DISCONNECT')),
  status text not null check (status in ('SUCCESS','ERROR')),
  external_id text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists portal_sync_events_org_created_idx
  on public.portal_sync_events(organization_id, created_at desc);
create index if not exists portal_sync_events_publication_idx
  on public.portal_sync_events(publication_id, created_at desc)
  where publication_id is not null;

alter table public.portal_sync_events enable row level security;
revoke all on public.portal_sync_events from public, anon, authenticated;
grant select on public.portal_sync_events to authenticated;
grant all on public.portal_sync_events to service_role;

create policy "management can view portal sync events"
on public.portal_sync_events
for select
to authenticated
using (private.can_manage_property_distribution(organization_id));

-- Store provider credential JSON encrypted in Supabase Vault. Only service_role may call this RPC.
create or replace function public.set_portal_connection_secret(p_connection_id uuid, p_secret jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_org uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_secret is null then
    raise exception 'Secret is required';
  end if;

  select organization_id into v_org
  from public.portal_connections
  where id = p_connection_id;
  if v_org is null then raise exception 'Connection not found'; end if;

  select vault_secret_id into v_secret_id
  from private.portal_connection_secrets
  where connection_id = p_connection_id;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_secret::text,
      'revscale_portal_' || p_connection_id::text,
      'Encrypted portal credentials for RevScale connection ' || p_connection_id::text
    );
    insert into private.portal_connection_secrets(connection_id, vault_secret_id)
    values (p_connection_id, v_secret_id);
  else
    perform vault.update_secret(v_secret_id, p_secret::text, null, null, null);
    update private.portal_connection_secrets
    set updated_at = now()
    where connection_id = p_connection_id;
  end if;
end;
$$;

revoke all on function public.set_portal_connection_secret(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.set_portal_connection_secret(uuid,jsonb) to service_role;

create or replace function public.get_portal_connection_secret(p_connection_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_secret text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  select vault_secret_id into v_secret_id
  from private.portal_connection_secrets
  where connection_id = p_connection_id;
  if v_secret_id is null then return null; end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id = v_secret_id;

  return case when v_secret is null then null else v_secret::jsonb end;
end;
$$;

revoke all on function public.get_portal_connection_secret(uuid) from public, anon, authenticated;
grant execute on function public.get_portal_connection_secret(uuid) to service_role;

create or replace function public.delete_portal_connection_secret(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  select vault_secret_id into v_secret_id
  from private.portal_connection_secrets
  where connection_id = p_connection_id;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
    delete from private.portal_connection_secrets where connection_id = p_connection_id;
  end if;
end;
$$;

revoke all on function public.delete_portal_connection_secret(uuid) from public, anon, authenticated;
grant execute on function public.delete_portal_connection_secret(uuid) to service_role;

comment on table public.portal_connections is 'Non-secret metadata for external real-estate portal connections. Provider tokens are stored separately in Supabase Vault.';
comment on table public.portal_oauth_states is 'Backend-only short-lived OAuth state and PKCE verification records.';
comment on column public.property_publications.provider_payload is 'Provider-specific non-secret listing configuration such as category, location and listing type IDs.';
