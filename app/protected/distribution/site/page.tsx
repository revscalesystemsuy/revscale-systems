import Link from "next/link";
import { ExternalLink, Globe2, Link2, LockKeyhole, Paintbrush, Search, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { PublicSiteSharePanel } from "@/components/public-site-share-panel";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { savePublicSite } from "./actions";

export default async function PublicSiteSettingsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "property_distribution")) redirect("/protected/billing");
  if (!["OWNER", "MANAGER"].includes(context.role)) redirect("/protected");

  const [{ data: org }, { data: site }] = await Promise.all([
    context.supabase.from("organizations").select("name,slug").eq("id", context.organizationId).single(),
    context.supabase.from("brokerage_public_sites").select("*").eq("organization_id", context.organizationId).maybeSingle(),
  ]);
  if (!org?.slug) redirect("/protected/distribution");
  const publicHref = `/inmobiliaria/${org.slug}`;
  const isEnterprise = context.plan === "ENTERPRISE";
  const publicUrl = site?.custom_domain && site.custom_domain_status === "ACTIVE" ? `https://${site.custom_domain}` : `https://revscale-systems-eta.vercel.app${publicHref}`;

  return <main className="min-h-screen p-5 md:p-8 lg:p-10"><div className="mx-auto max-w-[1250px]">
    <div className="mb-7 flex flex-col gap-4 border-b border-[#d8cbb8] pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8d7553]">Distribución · Sitio público</p><h1 className="mt-2 font-serif text-4xl text-[#302b25]">Web de la inmobiliaria</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#665f56]">Un portal independiente para {org.name || "tu inmobiliaria"}: marca propia, propiedades publicadas y consultas que entran directo al CRM.</p></div><div className="flex gap-2"><Link href="/protected/distribution" className="rounded-lg border border-[#cdbfa9] px-4 py-2.5 text-sm font-semibold text-[#5f513e]">Volver</Link><a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">Ver sitio <ExternalLink size={14}/></a></div></div>

    <section className="mb-6 grid gap-4 md:grid-cols-3"><Card icon={<Globe2 size={18}/>} title="URL exclusiva" text={publicUrl} /><Card icon={<Search size={18}/>} title="SEO + fichas" text="Cada propiedad tiene metadata, URL compartible y página pública propia."/><Card icon={<ShieldCheck size={18}/>} title="Leads aislados" text="Cada consulta entra únicamente al CRM de esta inmobiliaria con fuente WEB y UTM."/></section>

    <div className="mb-6"><PublicSiteSharePanel url={publicUrl}/></div>

    <form action={savePublicSite} className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
      <div className="space-y-6">
        <Panel title="Identidad pública" icon={<Paintbrush size={17}/>}>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Eslogan"><input name="tagline" maxLength={180} defaultValue={site?.tagline || "Propiedades seleccionadas y atención personalizada."}/></Field><Field label="Color de marca"><input name="accent_color" type="color" defaultValue={site?.accent_color || "#302d28"} className="h-11"/></Field></div>
          <Field label="Quiénes somos"><textarea name="about" rows={5} maxLength={1800} defaultValue={site?.about || ""}/></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="URL del logo"><input name="logo_url" type="url" defaultValue={site?.logo_url || ""}/></Field><Field label="URL de imagen principal"><input name="hero_image_url" type="url" defaultValue={site?.hero_image_url || ""}/></Field></div>
        </Panel>
        <Panel title="Contacto y redes" icon={<Link2 size={17}/>}>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="WhatsApp"><input name="public_whatsapp" defaultValue={site?.public_whatsapp || ""}/></Field><Field label="Teléfono"><input name="public_phone" defaultValue={site?.public_phone || ""}/></Field><Field label="Email"><input name="public_email" type="email" defaultValue={site?.public_email || ""}/></Field><Field label="Dirección"><input name="public_address" defaultValue={site?.public_address || ""}/></Field><Field label="Instagram"><input name="instagram_url" type="url" defaultValue={site?.instagram_url || ""}/></Field><Field label="Facebook"><input name="facebook_url" type="url" defaultValue={site?.facebook_url || ""}/></Field></div>
        </Panel>
        <Panel title="Posicionamiento" icon={<Search size={17}/>}><Field label="Título SEO"><input name="seo_title" maxLength={160} defaultValue={site?.seo_title || `${org.name || "Inmobiliaria"} | Propiedades`}/></Field><Field label="Descripción SEO"><textarea name="seo_description" rows={3} maxLength={320} defaultValue={site?.seo_description || ""}/></Field></Panel>
      </div>
      <div className="space-y-6">
        <Panel title="Publicación" icon={<Globe2 size={17}/>}><Toggle name="is_active" label="Sitio público activo" checked={site?.is_active ?? true}/><Toggle name="lead_capture_enabled" label="Capturar consultas en CRM" checked={site?.lead_capture_enabled ?? true}/><p className="text-xs leading-5 text-[#81786d]">Solo las propiedades marcadas como Publicadas en Distribución aparecen afuera del CRM.</p></Panel>
        <Panel title="Dominio y white-label" icon={isEnterprise ? <Globe2 size={17}/> : <LockKeyhole size={17}/>}>
          {isEnterprise ? <><Field label="Dominio propio"><input name="custom_domain" placeholder="propiedades.tuinmobiliaria.com.uy" defaultValue={site?.custom_domain || ""}/></Field><p className="text-xs leading-5 text-[#81786d]">Estado: <strong>{site?.custom_domain_status || "NOT_CONFIGURED"}</strong>. Al cambiarlo queda pendiente de validación DNS y conexión en Vercel antes de quedar activo.</p><Toggle name="hide_revscale_branding" label="Ocultar Powered by RevScale" checked={site?.hide_revscale_branding || false}/></> : <div className="rounded-xl border border-[#d2c5b3] bg-[#efe5d7] p-4"><p className="text-sm font-semibold">Disponible en Enterprise</p><p className="mt-2 text-xs leading-5 text-[#716a61]">Professional incluye el sitio completo con URL RevScale. Enterprise suma dominio propio y white-label.</p></div>}
        </Panel>
        <button className="w-full rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2]">Guardar sitio público</button>
      </div>
    </form>
  </div></main>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6"><div className="mb-5 flex items-center gap-2 text-[#5f513e]">{icon}<h2 className="font-serif text-2xl text-[#302b25]">{title}</h2></div><div className="space-y-4">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactElement }) { return <label className="block text-xs font-semibold text-[#665f56]"><span className="mb-2 block">{label}</span><span className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#d2c5b3] [&_input]:bg-[#fffaf2] [&_input]:px-3 [&_input]:py-2.5 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#d2c5b3] [&_textarea]:bg-[#fffaf2] [&_textarea]:px-3 [&_textarea]:py-2.5">{children}</span></label>; }
function Toggle({ name, label, checked }: { name: string; label: string; checked: boolean }) { return <label className="flex items-center justify-between gap-3 rounded-xl border border-[#d8cbb8] bg-[#fffaf2] px-4 py-3 text-sm font-medium"><span>{label}</span><input name={name} type="checkbox" defaultChecked={checked} className="h-4 w-4"/></label>; }
function Card({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4"><div className="flex items-center gap-2 text-[#5f513e]">{icon}<strong className="text-sm">{title}</strong></div><p className="mt-2 break-words text-xs leading-5 text-[#716a61]">{text}</p></div>; }
