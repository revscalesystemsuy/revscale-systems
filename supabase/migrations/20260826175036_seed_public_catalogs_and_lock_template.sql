insert into public.brokerage_public_sites (
  organization_id,
  site_slug,
  is_active,
  tagline,
  accent_color,
  hero_image_url,
  seo_title,
  seo_description,
  lead_capture_enabled
)
select
  o.id,
  o.slug,
  true,
  'Propiedades seleccionadas y atención personalizada.',
  '#302d28',
  null,
  coalesce(o.name, 'Inmobiliaria') || ' | Propiedades',
  'Propiedades disponibles de ' || coalesce(o.name, 'esta inmobiliaria') || '.',
  true
from public.organizations o
join public.subscriptions s on s.organization_id = o.id
where s.status = 'ACTIVE'
  and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
  and nullif(o.slug, '') is not null
on conflict (organization_id) do update
set site_slug = excluded.site_slug,
    accent_color = '#302d28',
    hero_image_url = null,
    updated_at = now();
