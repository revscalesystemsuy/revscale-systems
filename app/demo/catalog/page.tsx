import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, MapPin, Ruler } from "lucide-react";
import { DEMO_PROPERTIES, formatUSD } from "@/lib/demo-data";
import { normalizeDemoPlan } from "@/lib/demo-plan";

const IMAGES: Record<string, string> = {
  "pocitos-premium": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=82",
  "punta-carretas-1": "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=82",
  "carrasco-sur": "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=82",
  "malvin-1": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=82",
  "parque-miramar": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=82",
};

export default async function DemoCatalogPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan: requestedPlan } = await searchParams;
  const plan = normalizeDemoPlan(requestedPlan);
  const properties = DEMO_PROPERTIES.filter((property) => IMAGES[property.id]);

  return (
    <main className="min-h-screen bg-[#f3eadf] px-5 py-7 text-[#302d28] md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-[#d8cbb8] pb-7 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Catálogo público · Demo</p><h1 className="mt-2 font-serif text-4xl font-medium">Inmobiliaria Horizonte</h1><p className="mt-3 text-sm text-[#625d55]">Propiedades disponibles publicadas desde RevScale.</p></div>
          <Link href={`/demo/distribution?plan=${plan}`} className="text-sm font-semibold text-[#6a5a45]">Volver a Distribución</Link>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <article key={property.id} className="overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_14px_30px_rgba(76,62,42,0.05)]">
              <div className="relative aspect-[16/10]"><Image src={IMAGES[property.id]} alt={property.title} fill className="object-cover" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"/><div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"/><div className="absolute left-4 top-4"><span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">{property.operation}</span></div></div>
              <div className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">{property.zone}</p><h2 className="mt-2 font-serif text-2xl font-medium">{property.title}</h2><p className="mt-2 flex items-center gap-1.5 text-xs text-[#81786d]"><MapPin size={13}/>{property.address}</p><div className="mt-5 grid grid-cols-3 border-y border-[#ddd1c0] py-4 text-xs text-[#625d55]"><Feature icon={<BedDouble size={15}/>} text={`${property.bedrooms} dorm.`}/><Feature icon={<Bath size={15}/>} text={`${property.bathrooms} baños`}/><Feature icon={<Ruler size={15}/>} text={`${property.areaM2} m²`}/></div><p className="mt-5 font-serif text-2xl">{formatUSD(property.priceUSD)}</p></div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center justify-center gap-1.5">{icon}<span>{text}</span></div>;
}
