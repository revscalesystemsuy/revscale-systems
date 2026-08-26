alter function public.submit_public_site_inquiry(text,text,text,text,text,text,text,text,text,text,text,text,text) set schema private;

grant usage on schema private to anon, authenticated, service_role;
revoke execute on function private.submit_public_site_inquiry(text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated, service_role;
grant execute on function private.submit_public_site_inquiry(text,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated, service_role;

create function public.submit_public_site_inquiry(
  p_site_slug text,
  p_property_slug text default null,
  p_full_name text default null,
  p_phone text default null,
  p_email text default null,
  p_message text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_referrer text default null,
  p_page_path text default null,
  p_honeypot text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.submit_public_site_inquiry(
    p_site_slug,p_property_slug,p_full_name,p_phone,p_email,p_message,
    p_utm_source,p_utm_medium,p_utm_campaign,p_utm_content,p_referrer,p_page_path,p_honeypot
  )
$$;

revoke execute on function public.submit_public_site_inquiry(text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.submit_public_site_inquiry(text,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated, service_role;
