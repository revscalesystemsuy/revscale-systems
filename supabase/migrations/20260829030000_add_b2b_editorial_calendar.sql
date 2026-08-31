create table if not exists public.b2b_editorial_calendar (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null unique,
  created_by uuid,
  origin text not null default 'SYSTEM_TEMPLATE' check (origin in ('SYSTEM_TEMPLATE','ADMIN')),
  week_number integer not null check (week_number between 1 and 8),
  planned_date date not null,
  item_type text not null check (item_type in ('FOUNDER','PRODUCT_CLIP','REVSCALE_BRAND','SOCIAL_PROOF','DISTRIBUTION')),
  title text not null,
  channel text not null check (channel in ('LINKEDIN_FOUNDER','LINKEDIN_PAGE','INSTAGRAM','MULTI','DIRECT')),
  format text not null check (format in ('TEXT','CAROUSEL','VIDEO','POLL','GRAPHIC','DOCUMENT','NETWORKING','CASE_STUDY')),
  objective text not null check (objective in ('AUTHORITY','PRODUCT_EDUCATION','DISTRIBUTION','PROOF','DEMAND_GEN')),
  status text not null default 'PLANNED' check (status in ('PLANNED','DRAFT','READY','BLOCKED','PUBLISHED','COMPLETED','SKIPPED')),
  source_key text,
  source_path text,
  cta text not null default '',
  requires_evidence boolean not null default false,
  evidence_requirement text,
  evidence_reference text,
  publication_url text,
  published_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not requires_evidence or nullif(trim(coalesce(evidence_requirement,'')), '') is not null),
  check (status <> 'PUBLISHED' or nullif(trim(coalesce(publication_url,'')), '') is not null)
);
create index if not exists b2b_editorial_calendar_date_idx on public.b2b_editorial_calendar(planned_date, item_type);
create index if not exists b2b_editorial_calendar_status_idx on public.b2b_editorial_calendar(status, planned_date);
alter table public.b2b_editorial_calendar enable row level security;
drop policy if exists "platform admins can view editorial calendar" on public.b2b_editorial_calendar;
create policy "platform admins can view editorial calendar" on public.b2b_editorial_calendar for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert editorial calendar" on public.b2b_editorial_calendar;
create policy "platform admins can insert editorial calendar" on public.b2b_editorial_calendar for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update editorial calendar" on public.b2b_editorial_calendar;
create policy "platform admins can update editorial calendar" on public.b2b_editorial_calendar for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

insert into public.b2b_editorial_calendar (slot_key, week_number, planned_date, item_type, title, channel, format, objective, status, source_key, source_path, cta, requires_evidence, evidence_requirement, notes) values
('w1-mon-founder',1,'2026-08-31','FOUNDER','El problema no es falta de leads','LINKEDIN_FOUNDER','TEXT','AUTHORITY','PLANNED','day-1','/protected/admin/marketing/founder-linkedin','Abrir conversación con owners y managers.',false,null,'Cadencia founder: 1/3 de la semana.'),
('w1-tue-clip',1,'2026-09-01','PRODUCT_CLIP','El lead invisible — Qué hacer hoy','MULTI','VIDEO','PRODUCT_EDUCATION','PLANNED','clip-today','/protected/admin/marketing/product-clips','Ver Qué hacer hoy.',false,null,'Clip 1/2 de la semana; si usa demo, rotular datos simulados.'),
('w1-tue-dist',1,'2026-09-01','DISTRIBUTION','15 comentarios útiles en posts del sector','DIRECT','NETWORKING','DISTRIBUTION','PLANNED',null,null,'Generar conversaciones ICP.',false,null,'No comentar por alcance; priorizar owners/managers y temas operativos.'),
('w1-wed-founder',1,'2026-09-02','FOUNDER','Anatomía de un lead perdido sin desaparecer del CRM','LINKEDIN_FOUNDER','CAROUSEL','AUTHORITY','PLANNED','day-3','/protected/admin/marketing/founder-linkedin','Diagnosticar seguimiento.',false,null,'Cadencia founder: 2/3 de la semana.'),
('w1-thu-clip',1,'2026-09-03','PRODUCT_CLIP','Entró una propiedad nueva — Matching','MULTI','VIDEO','PRODUCT_EDUCATION','PLANNED','clip-matching','/protected/admin/marketing/product-clips','Probar matching.',false,null,'Clip 2/2 de la semana.'),
('w1-thu-brand',1,'2026-09-03','REVSCALE_BRAND','Guardado no significa trabajado','LINKEDIN_PAGE','GRAPHIC','AUTHORITY','PLANNED','brand-02','/protected/admin/marketing/revscale-content','¿Qué porcentaje de leads activos tiene próxima acción?',false,null,'Página corporativa como credibilidad, no canal principal.'),
('w1-fri-founder',1,'2026-09-04','FOUNDER','¿Miden primera respuesta humana?','LINKEDIN_FOUNDER','POLL','DEMAND_GEN','PLANNED','day-5','/protected/admin/marketing/founder-linkedin','Preguntar cómo lo miden hoy.',false,null,'Cadencia founder: 3/3 de la semana.'),
('w1-fri-dist',1,'2026-09-04','DISTRIBUTION','DM con contexto a quienes interactuaron','DIRECT','NETWORKING','DISTRIBUTION','PLANNED',null,null,'Continuar conversaciones relevantes.',false,null,'Sin pitch automático; usar contexto de la interacción.'),
('w2-mon-founder',2,'2026-09-07','FOUNDER','Autoresponder no es seguimiento','LINKEDIN_FOUNDER','TEXT','AUTHORITY','PLANNED','day-9','/protected/admin/marketing/founder-linkedin','Medir respuesta humana.',false,null,'Cadencia founder: 1/3 de la semana.'),
('w2-tue-clip',2,'2026-09-08','PRODUCT_CLIP','Bajó el precio — Opportunity Radar','MULTI','VIDEO','PRODUCT_EDUCATION','PLANNED','clip-radar','/protected/admin/marketing/product-clips','Ver reactivación.',false,null,'Clip 1/2 de la semana.'),
('w2-tue-dist',2,'2026-09-08','DISTRIBUTION','10 conexiones Tier A con contexto','DIRECT','NETWORKING','DISTRIBUTION','PLANNED',null,null,'Ampliar red ICP.',false,null,'Priorizar dueños/gerentes de cuentas Tier A.'),
('w2-wed-founder',2,'2026-09-09','FOUNDER','Un CRM puede estar lleno y tu pipeline vacío','LINKEDIN_FOUNDER','CAROUSEL','AUTHORITY','PLANNED','day-15','/protected/admin/marketing/founder-linkedin','Diagnosticar pipeline.',false,null,'Cadencia founder: 2/3 de la semana.'),
('w2-thu-clip',2,'2026-09-10','PRODUCT_CLIP','La reunión comercial — Manager','MULTI','VIDEO','PRODUCT_EDUCATION','PLANNED','clip-manager','/protected/admin/marketing/product-clips','Ver tablero Manager.',false,null,'Clip 2/2 de la semana.'),
('w2-thu-brand',2,'2026-09-10','REVSCALE_BRAND','Qué debería ver un owner','LINKEDIN_PAGE','DOCUMENT','AUTHORITY','PLANNED','brand-06','/protected/admin/marketing/revscale-content','Usarlo en la próxima reunión comercial.',false,null,'Recurso corporativo reutilizable por ventas.'),
('w2-fri-founder',2,'2026-09-11','FOUNDER','5 señales de fuga comercial','LINKEDIN_FOUNDER','TEXT','DEMAND_GEN','PLANNED','day-18','/protected/admin/marketing/founder-linkedin','Pedir diagnóstico.',false,null,'Cadencia founder: 3/3 de la semana.'),
('w2-fri-dist',2,'2026-09-11','DISTRIBUTION','Responder comentarios y DMs de la semana','DIRECT','NETWORKING','DISTRIBUTION','PLANNED',null,null,'Mover interacción a conversación ICP.',false,null,'Medir conversaciones útiles, no volumen de respuestas.'),
('w3-mon-founder',3,'2026-09-14','FOUNDER','Marketing ROI: el CPL no alcanza','LINKEDIN_FOUNDER','TEXT','AUTHORITY','PLANNED','day-23','/protected/admin/marketing/founder-linkedin','Medir fuente hasta operación.',false,null,'Cadencia founder: 1/3 de la semana.'),
('w3-tue-clip',3,'2026-09-15','PRODUCT_CLIP','WhatsApp es canal, no pipeline','MULTI','VIDEO','PRODUCT_EDUCATION','PLANNED','clip-whatsapp','/protected/admin/marketing/product-clips','Ver flujo Inbox + Lead.',false,null,'Clip 1/2 de la semana.'),
('w3-tue-dist',3,'2026-09-15','DISTRIBUTION','15 comentarios útiles en posts del sector','DIRECT','NETWORKING','DISTRIBUTION','PLANNED',null,null,'Generar conversaciones ICP.',false,null,'Repetir ritual de distribución, no contenido adicional.'),
('w3-wed-founder',3,'2026-09-16','FOUNDER','Qué NO debería automatizar un bot','LINKEDIN_FOUNDER','TEXT','AUTHORITY','PLANNED','day-19','/protected/admin/marketing/founder-linkedin','Abrir conversación sobre criterio humano.',false,null,'Cadencia founder: 2/3 de la semana.'),
('w3-thu-clip',3,'2026-09-17','PRODUCT_CLIP','Qué hacer hoy — prioridad y próxima acción','MULTI','VIDEO','PRODUCT_EDUCATION','PLANNED','clip-today','/protected/admin/marketing/product-clips','Ver demo.',false,null,'Clip 2/2 de la semana; segunda edición/ángulo del flujo Today.'),
('w3-thu-brand',3,'2026-09-17','REVSCALE_BRAND','Qué automatizar y qué dejar humano','LINKEDIN_PAGE','CAROUSEL','AUTHORITY','PLANNED','brand-08','/protected/admin/marketing/revscale-content','Automatizar sin perder criterio.',false,null,'Separar posicionamiento de producto de la opinión founder.'),
('w3-fri-founder',3,'2026-09-18','FOUNDER','Qué mediría en los primeros 7 días','LINKEDIN_FOUNDER','DOCUMENT','DEMAND_GEN','PLANNED','day-25','/protected/admin/marketing/founder-linkedin','Conocer el piloto.',false,null,'Cadencia founder: 3/3 de la semana.'),
('w3-fri-dist',3,'2026-09-18','DISTRIBUTION','DM a interacciones owner/manager con contexto','DIRECT','NETWORKING','DISTRIBUTION','PLANNED',null,null,'Convertir autoridad en conversación.',false,null,'No enviar secuencia genérica.'),
('w4-mon-founder',4,'2026-09-21','FOUNDER','Una propiedad nueva puede reactivar demanda vieja','LINKEDIN_FOUNDER','TEXT','AUTHORITY','PLANNED','day-29','/protected/admin/marketing/founder-linkedin','Ver caso de uso.',false,null,'Cadencia founder: 1/3 de la semana.'),
('w4-tue-clip',4,'2026-09-22','PRODUCT_CLIP','Matching — demanda encuentra inventario','MULTI','VIDEO','PRODUCT_EDUCATION','PLANNED','clip-matching','/protected/admin/marketing/product-clips','Probar matching.',false,null,'Clip 1/2 de la semana.'),
('w4-tue-dist',4,'2026-09-22','DISTRIBUTION','Outreach a cámaras/partners con pieza educativa','DIRECT','NETWORKING','DISTRIBUTION','PLANNED',null,null,'Abrir conversación de partnership.',false,null,'Usar recurso educativo, no pitch masivo.'),
('w4-wed-founder',4,'2026-09-23','FOUNDER','Antes/después de una cola de trabajo — ejemplo de demo','LINKEDIN_FOUNDER','CAROUSEL','AUTHORITY','PLANNED','day-22','/protected/admin/marketing/founder-linkedin','Ver el flujo.',false,null,'Rotular explícitamente como ejemplo de demo; no usar métricas de cliente.'),
('w4-thu-clip',4,'2026-09-24','PRODUCT_CLIP','Opportunity Radar — reactivar con una razón real','MULTI','VIDEO','PRODUCT_EDUCATION','PLANNED','clip-radar','/protected/admin/marketing/product-clips','Ver reactivación.',false,null,'Clip 2/2 de la semana.'),
('w4-thu-brand',4,'2026-09-24','REVSCALE_BRAND','Cómo medimos un piloto','LINKEDIN_PAGE','DOCUMENT','PROOF','PLANNED','brand-09','/protected/admin/marketing/revscale-content','Conocer Revenue Recovery Pilot.',false,null,'Explicar metodología; no afirmar resultados inexistentes.'),
('w4-fri-founder',4,'2026-09-25','FOUNDER','Diagnóstico de fugas: dónde se corta el proceso','LINKEDIN_FOUNDER','TEXT','DEMAND_GEN','PLANNED','day-30','/protected/admin/marketing/founder-linkedin','Pedir diagnóstico.',false,null,'Cadencia founder: 3/3 de la semana.'),
('w4-fri-proof',4,'2026-09-25','SOCIAL_PROOF','Case study verificable cuando exista','LINKEDIN_PAGE','CASE_STUDY','PROOF','BLOCKED',null,'/protected/admin/sales/social-proof','Ver caso de estudio.',true,'Requiere case study READY y permisos vigentes para el activo exacto.','Slot opcional: no reemplaza la cadencia founder y permanece bloqueado hasta existir evidencia.'),
('w4-fri-dist',4,'2026-09-25','DISTRIBUTION','Revisión de conversaciones ICP influenciadas por contenido','DIRECT','NETWORKING','DISTRIBUTION','PLANNED',null,null,'Registrar demos/referrals influenciados.',false,null,'Cerrar el ciclo semanal con KPI de negocio, no seguidores.')
on conflict (slot_key) do nothing;