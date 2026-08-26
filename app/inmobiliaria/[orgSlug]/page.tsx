import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Search } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicSiteInquiryForm } from "@/components/public-site-inquiry-form";

async function loadSite(orgSlug: string) {
  const supabase = await createClient();
  const { data: site } = await supabase.from("brokerage_public_sites")
    .select("organization_id,site_slug,is_active,tagline,about,logo_url,public_phone,public_email,public_whatsapp,public_address,instagram_url,facebook_url,seo_title,seo_description,lead_capture_enabled,hide_revscale_branding")
    .eq("site_slug", orgSlug).eq("is_active", true).maybeSingle();
  if (!site) return null;
  const { data: publications } = await supabase.from("property_publications")
    .select("public_slug,title,property_type,operation,zone,address_label,price,currency,bedrooms,bathrooms,area_m2,cover_image_url,published_at")
    .eq("organization_id", site.organization_id).eq("channel", "REVSCALE_WEB").eq("status", "PUBLISHED").order("published_at", { ascending: false }).limit(200);
  return { site, publications: publications || [] };
}

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;
  const data = await loadSite(orgSlug);
  if (!data) return { title: "Inmobiliaria no disponible" };
  const title = data.site.seo_title || "Propiedades";
  const description = data.site.seo_description || data.site.tagline || "Propiedades disponibles";
  const hero = data.publications.find((item) => item.cover_image_url)?.cover_image_url;
  return { title, description, openGraph: { title, description, type: "website", images: hero ? [hero] : undefined } };
}

export default async function BrokerageSite({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ operation?: string; type?: string; zone?: string }> }) {
  const { orgSlug } = await params;
  const filters = await searchParams;
  const data = await loadSite(orgSlug);
  if (!data) notFound();
  const { site, publications } = data;
  const operations = [...new Set(publications.map((p) => p.operation).filter(Boolean))] as string[];
  const types = [...new Set(publications.map((p) => p.property_type).filter(Boolean))] as string[];
  const zones = [...new Set(publications.map((p) => p.zone).filter(Boolean))] as string[];
  const visible = publications.filter((p) => (!filters.operation || p.operation === filters.operation) && (!filters.type || p.property_type === filters.type) && (!filters.zone || p.zone === filters.zone));
  const whatsapp = String(site.public_whatsapp || site.public_phone || "").replace(/\D/g, "");
  const displayName = site.seo_title?.split("|")[0]?.trim() || "Inmobiliaria";
  const hero = publications.find((item) => item.cover_image_url)?.cover_image_url || null;

  return <main className="min-h-screen bg-[#f3eadf] text-[#302d28]">
    <header className="sticky top-0 z-20 border-b border-[#d8cbb8] bg-[#f8f1e8]/95 px-5 py-4 backdrop-blur md:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
      <Link href={`/inmobiliaria/${orgSlug}`} className="flex items-center gap-3">{site.logo_url ? <img src={site.logo_url} alt={`Logo de ${displayName}`} className="h-10 max-w-40 object-contain"/> : <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#cdbfa9]"><Building2 size={18}/></span>}<div><span className="block font-serif text-xl">{displayName}</span><span className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8d7553]">Catálogo inmobiliario</span></div></Link>
      <div className="flex items-center gap-2">{whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-lg border border-[#cdbfa9] px-3 py-2 text-sm font-semibold sm:inline-flex"><MessageCircle size={15}/> WhatsApp</a>}<a href="#contacto" className="rounded-lg bg-[#302d28] px-4 py-2 text-sm font-semibold !text-[#fffaf2]">Consultar</a></div>
    </div></header>

    <section className="relative overflow-hidden border-b border-[#d8cbb8] bg-[#e9dfd0]">{hero && <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${hero})` }}/>}<div className="absolute inset-0 bg-gradient-to-r from-[#f3eadf] via-[#f3eadf]/92 to-[#f3eadf]/45"/><div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8d7553]">{displayName}</p><h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[1.02] md:text-7xl">{site.tagline || "Encontrá tu próxima propiedad."}</h1>{site.about && <p className="mt-6 max-w-2xl text-sm leading-7 text-[#625d55] md:text-base">{site.about}</p>}<p className="mt-7 text-sm font-semibold text-[#6a5a45]">{publications.length} {publications.length === 1 ? "propiedad publicada" : "propiedades publicadas"}</p></div></section>

    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
      {publications.length > 0 && <form className="mb-8 grid gap-3 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-4 md:grid-cols-[1fr_1fr_1fr_auto]"><Select name="operation" label="Operación" value={filters.operation} options={operations}/><Select name="type" label="Tipo" value={filters.type} options={types}/><Select name="zone" label="Zona" value={filters.zone} options={zones}/><button className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#302d28] px-5 text-sm font-semibold text-[#fffaf2]"><Search size={15}/> Buscar</button></form>}
      {visible.length ? <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((p) => <Link href={`/p/${p.public_slug}`} key={p.public_slug} className="group overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_14px_30px_rgba(76,62,42,.05)]"><div className="relative aspect-[16/10] bg-[#ded2c1] bg-cover bg-center" style={p.cover_image_url ? { backgroundImage: `url(${p.cover_image_url})` } : undefined}>{!p.cover_image_url && <div className="absolute inset-0 flex items-center justify-center text-[#8a7a67]"><Building2 size={44} strokeWidth={1.2}/></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"/><span className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">{p.operation || "Propiedad"}</span></div><div className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8d7553]">{p.zone || "Uruguay"}</p><h2 className="mt-2 font-serif text-2xl">{p.title}</h2>{p.address_label && <p className="mt-2 flex items-center gap-1.5 text-xs text-[#81786d]"><MapPin size={13}/>{p.address_label}</p>}<p className="mt-5 font-serif text-2xl">{p.price != null ? `${p.currency || ""} ${Number(p.price).toLocaleString()}` : "Consultar"}</p><p className="mt-2 text-xs text-[#81786d]">{p.bedrooms ?? "—"} dorm. · {p.bathrooms ?? "—"} baños · {p.area_m2 ? `${Number(p.area_m2)} m²` : "Área a consultar"}</p></div></Link>)}</section> : publications.length > 0 ? <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-10 text-center"><p className="font-serif text-2xl">No encontramos propiedades con esos filtros.</p><Link href={`/inmobiliaria/${orgSlug}`} className="mt-3 inline-block text-sm font-semibold text-[#6a5a45]">Ver todo el catálogo</Link></div> : <div className="rounded-3xl border border-[#d2c5b3] bg-[#f7f0e6] px-6 py-14 text-center md:px-10"><Building2 size={34} strokeWidth={1.3} className="mx-auto text-[#8d7553]"/><p className="mt-5 font-serif text-3xl">Próximamente nuevas propiedades</p><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#716a61]">Esta inmobiliaria todavía no tiene propiedades publicadas en su catálogo. Podés dejar una consulta y el equipo comercial se pondrá en contacto contigo.</p></div>}
      {site.lead_capture_enabled && <section id="contacto" className="mt-14 grid gap-7 rounded-3xl border border-[#d2c5b3] bg-[#e8dccb] p-6 md:grid-cols-[.8fr_1.2fr] md:p-9"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8d7553]">Contacto</p><h2 className="mt-3 font-serif text-4xl">Contanos qué estás buscando.</h2><p className="mt-4 text-sm leading-6 text-[#665f56]">La consulta llega directamente al equipo comercial de {displayName}. No se comparte con otras inmobiliarias de RevScale.</p><div className="mt-6 space-y-2 text-sm text-[#665f56]">{site.public_phone && <p className="flex gap-2"><Phone size={15}/>{site.public_phone}</p>}{site.public_email && <p className="flex gap-2"><Mail size={15}/>{site.public_email}</p>}{site.public_address && <p className="flex gap-2"><MapPin size={15}/>{site.public_address}</p>}</div><div className="mt-5 flex gap-3">{site.instagram_url && <a href={site.instagram_url} target="_blank" rel="noreferrer"><Instagram size={18}/></a>}{site.facebook_url && <a href={site.facebook_url} target="_blank" rel="noreferrer"><Facebook size={18}/></a>}</div></div><PublicSiteInquiryForm siteSlug={site.site_slug}/></section>}
    </div><footer className="border-t border-[#d8cbb8] px-5 py-7 text-center text-xs text-[#81786d]">{site.hide_revscale_branding ? `${displayName} · Catálogo inmobiliario` : "Sitio inmobiliario operado con RevScale PropertyOS"}</footer>
  </main>;
}
function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: string[] }) { return <label className="text-xs font-semibold text-[#665f56]"><span className="mb-2 block">{label}</span><select name={name} defaultValue={value || ""} className="h-11 w-full rounded-lg border border-[#d2c5b3] bg-[#fffaf2] px-3 text-sm"><option value="">Todos</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>; }
