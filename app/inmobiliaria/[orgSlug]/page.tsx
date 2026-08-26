import type { Metadata } from "next";
import Link from "next/link";
import { Bath, BedDouble, Building2, MapPin, Ruler } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getCatalog(orgSlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_publications")
    .select("public_slug,organization_name,organization_slug,title,property_type,operation,zone,address_label,price,currency,bedrooms,bathrooms,area_m2,cover_image_url,published_at")
    .eq("channel", "REVSCALE_WEB")
    .eq("status", "PUBLISHED")
    .eq("organization_slug", orgSlug)
    .order("published_at", { ascending: false });
  return data || [];
}

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;
  const properties = await getCatalog(orgSlug);
  const name = properties[0]?.organization_name;
  return name ? { title: `${name} | Propiedades`, description: `Propiedades disponibles de ${name}.` } : { title: "Catálogo inmobiliario" };
}

export default async function BrokerageCatalogPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const properties = await getCatalog(orgSlug);
  if (!properties.length) notFound();
  const organizationName = properties[0].organization_name;

  return (
    <main className="min-h-screen bg-[#f3eadf] text-[#302d28]">
      <header className="border-b border-[#d8cbb8] bg-[#f8f1e8] px-5 py-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Catálogo inmobiliario</p>
          <h1 className="mt-2 font-serif text-3xl font-medium md:text-4xl">{organizationName}</h1>
          <p className="mt-2 text-sm text-[#625d55]">Propiedades disponibles publicadas directamente desde RevScale.</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Disponibles</p><h2 className="mt-2 font-serif text-2xl">{properties.length} propiedades</h2></div><span className="hidden text-xs text-[#81786d] md:block">Actualizado desde el inventario comercial</span></div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <Link key={property.public_slug} href={`/p/${property.public_slug}`} className="group overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_14px_30px_rgba(76,62,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(76,62,42,0.1)]">
              <div className="relative aspect-[16/10] bg-[#ded2c1]" style={property.cover_image_url ? { backgroundImage: `url(${property.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                {!property.cover_image_url && <div className="absolute inset-0 flex items-center justify-center text-[#8a7a67]"><Building2 size={38} strokeWidth={1.2}/></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2"><Badge>{property.operation || "Propiedad"}</Badge>{property.property_type && <Badge>{property.property_type}</Badge>}</div>
              </div>
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">{property.zone || "Uruguay"}</p>
                <h3 className="mt-2 font-serif text-2xl font-medium text-[#37332d]">{property.title}</h3>
                {property.address_label && <p className="mt-2 flex items-center gap-1.5 text-xs text-[#81786d]"><MapPin size={13}/>{property.address_label}</p>}
                <div className="mt-5 grid grid-cols-3 border-y border-[#ddd1c0] py-4 text-xs text-[#625d55]"><Feature icon={<BedDouble size={15}/>} text={`${property.bedrooms ?? "—"} dorm.`}/><Feature icon={<Bath size={15}/>} text={`${property.bathrooms ?? "—"} baños`}/><Feature icon={<Ruler size={15}/>} text={property.area_m2 ? `${Number(property.area_m2)} m²` : "— m²"}/></div>
                <p className="mt-5 font-serif text-2xl text-[#37332d]">{property.price != null ? `${property.currency || ""} ${Number(property.price).toLocaleString()}` : "Consultar"}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">{children}</span>;
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center justify-center gap-1.5">{icon}<span>{text}</span></div>;
}
