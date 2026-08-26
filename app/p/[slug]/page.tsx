import type { Metadata } from "next";
import Link from "next/link";
import { Bath, BedDouble, Building2, MapPin, MessageCircle, Ruler } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicSiteInquiryForm } from "@/components/public-site-inquiry-form";

async function getPublication(slug: string) {
  const supabase = await createClient();
  const { data: property } = await supabase.from("property_publications").select("organization_id,organization_name,organization_slug,public_slug,title,description,property_type,operation,zone,address_label,price,currency,bedrooms,bathrooms,area_m2,cover_image_url,features,contact_name,contact_phone,published_at").eq("channel", "REVSCALE_WEB").eq("status", "PUBLISHED").eq("public_slug", slug).maybeSingle();
  if (!property) return null;
  const { data: site } = await supabase.from("brokerage_public_sites").select("site_slug,is_active,logo_url,accent_color,public_whatsapp,public_phone,hide_revscale_branding,seo_title").eq("organization_id", property.organization_id).eq("is_active", true).maybeSingle();
  if (!site) return null;
  return { property, site };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const data = await getPublication(slug); if (!data) return { title: "Propiedad no disponible" }; const { property } = data; return { title: `${property.title} | ${property.organization_name}`, description: property.description || `${property.title} en ${property.zone || "Uruguay"}`, openGraph: property.cover_image_url ? { images: [property.cover_image_url] } : undefined }; }

export default async function PublicPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const data = await getPublication(slug); if (!data) notFound(); const { property, site } = data;
  const phone = String(site.public_whatsapp || property.contact_phone || site.public_phone || "").replace(/\D/g, "");
  const whatsappHref = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, me interesa ${property.title}.`)}` : null;
  return <main className="min-h-screen bg-[#f3eadf] text-[#302d28]" style={{ ["--brand" as string]: site.accent_color || "#302d28" }}>
    <header className="border-b border-[#d8cbb8] bg-[#f8f1e8] px-5 py-4 md:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href={`/inmobiliaria/${site.site_slug}`} className="flex items-center gap-3">{site.logo_url ? <img src={site.logo_url} alt="Logo" className="h-9 max-w-36 object-contain"/> : <Building2 size={20}/>}<span className="font-serif text-xl">{site.seo_title?.split("|")[0]?.trim() || property.organization_name}</span></Link>{!site.hide_revscale_branding && <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8d7553]">Powered by RevScale</span>}</div></header>
    <div className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-10"><div className="overflow-hidden rounded-3xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_20px_60px_rgba(72,58,40,.08)]"><div className="grid lg:grid-cols-[1.25fr_.9fr]">
      <div className="relative min-h-[360px] bg-[#ded2c1] lg:min-h-[680px]" style={property.cover_image_url ? { backgroundImage: `url(${property.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{!property.cover_image_url && <div className="absolute inset-0 flex items-center justify-center text-[#8a7a67]"><Building2 size={52} strokeWidth={1.2}/></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent"/><div className="absolute left-5 top-5 flex gap-2"><Badge>{property.operation || "Propiedad"}</Badge>{property.property_type && <Badge>{property.property_type}</Badge>}</div><div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8"><p className="text-xs uppercase tracking-[.16em] text-white/70">{property.zone || "Uruguay"}</p><h1 className="mt-2 max-w-3xl font-serif text-4xl font-medium md:text-5xl">{property.title}</h1>{property.address_label && <p className="mt-4 flex items-center gap-2 text-sm text-white/80"><MapPin size={16}/>{property.address_label}</p>}</div></div>
      <aside className="flex flex-col p-6 md:p-8 lg:p-9"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8d7553]">Precio</p><p className="mt-2 font-serif text-4xl">{property.price != null ? `${property.currency || ""} ${Number(property.price).toLocaleString()}` : "Consultar"}</p><div className="mt-7 grid grid-cols-3 border-y border-[#ddd1c0] py-5 text-sm text-[#625d55]"><Feature icon={<BedDouble size={17}/>} text={`${property.bedrooms ?? "—"} dorm.`}/><Feature icon={<Bath size={17}/>} text={`${property.bathrooms ?? "—"} baños`}/><Feature icon={<Ruler size={17}/>} text={property.area_m2 ? `${Number(property.area_m2)} m²` : "— m²"}/></div>{property.description && <div className="mt-7"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8d7553]">Descripción</p><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#625d55]">{property.description}</p></div>}
        <div className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#efe5d7] p-5"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8d7553]">Consultar esta propiedad</p><div className="mt-4"><PublicSiteInquiryForm siteSlug={site.site_slug} propertySlug={property.public_slug} propertyTitle={property.title}/></div>{whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#b9aa94] px-5 py-3 text-sm font-semibold text-[#3c3730]"><MessageCircle size={16}/> Consultar por WhatsApp</a>}</div><Link href={`/inmobiliaria/${site.site_slug}`} className="mt-5 block text-center text-sm font-semibold text-[#6a5a45]">Ver más propiedades de la inmobiliaria</Link>
      </aside>
    </div></div></div>
  </main>;
}
function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-white/30 bg-black/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">{children}</span>; }
function Feature({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex flex-col items-center gap-2 text-center">{icon}<span>{text}</span></div>; }
