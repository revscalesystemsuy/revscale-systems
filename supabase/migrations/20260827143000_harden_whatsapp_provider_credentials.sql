alter table public.whatsapp_connections
  add column if not exists access_token_secret_id uuid,
  add column if not exists credential_source text not null default 'GLOBAL_SECRET';

alter table public.whatsapp_connections
  drop constraint if exists whatsapp_connections_credential_source_check,
  add constraint whatsapp_connections_credential_source_check
    check (credential_source in ('GLOBAL_SECRET','EMBEDDED_SIGNUP','MANAGED'));

create or replace function public.store_whatsapp_provider_token(
  p_organization_id uuid,
  p_access_token text,
  p_credential_source text default 'EMBEDDED_SIGNUP'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_id uuid;
  v_secret_id uuid;
  v_source text;
begin
  if p_organization_id is null then
    raise exception 'organization_id is required';
  end if;
  if nullif(btrim(p_access_token), '') is null then
    raise exception 'access token is required';
  end if;

  v_source := upper(coalesce(nullif(btrim(p_credential_source), ''), 'EMBEDDED_SIGNUP'));
  if v_source not in ('GLOBAL_SECRET','EMBEDDED_SIGNUP','MANAGED') then
    raise exception 'invalid credential source';
  end if;

  select id, access_token_secret_id
    into v_connection_id, v_secret_id
  from public.whatsapp_connections
  where organization_id = p_organization_id
  for update;

  if v_connection_id is null then
    raise exception 'WhatsApp connection not found';
  end if;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_access_token,
      'revscale_whatsapp_' || p_organization_id::text,
      'RevScale managed Meta WhatsApp access token',
      null
    );
  else
    perform vault.update_secret(
      v_secret_id,
      p_access_token,
      'revscale_whatsapp_' || p_organization_id::text,
      'RevScale managed Meta WhatsApp access token',
      null
    );
  end if;

  update public.whatsapp_connections
  set access_token_secret_id = v_secret_id,
      credential_source = v_source,
      updated_at = now(),
      last_error = null
  where id = v_connection_id;

  return v_secret_id;
end;
$$;

create or replace function public.get_whatsapp_provider_token(p_organization_id uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select ds.decrypted_secret
  from public.whatsapp_connections wc
  join vault.decrypted_secrets ds on ds.id = wc.access_token_secret_id
  where wc.organization_id = p_organization_id
  limit 1;
$$;

revoke all on function public.store_whatsapp_provider_token(uuid,text,text) from public, anon, authenticated;
revoke all on function public.get_whatsapp_provider_token(uuid) from public, anon, authenticated;
grant execute on function public.store_whatsapp_provider_token(uuid,text,text) to service_role;
grant execute on function public.get_whatsapp_provider_token(uuid) to service_role;

comment on column public.whatsapp_connections.access_token_secret_id is 'Reference to an encrypted Supabase Vault secret. Never expose or return the provider token to browser roles.';
comment on column public.whatsapp_connections.credential_source is 'How Meta provider credentials are provisioned; client users never need to manage backend secrets.';
comment on function public.store_whatsapp_provider_token(uuid,text,text) is 'Backend-only helper that stores or rotates an organization-scoped Meta WhatsApp token in Supabase Vault.';
comment on function public.get_whatsapp_provider_token(uuid) is 'Backend-only helper that resolves the organization-scoped Meta WhatsApp token for trusted Edge Functions.';