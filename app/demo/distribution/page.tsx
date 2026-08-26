import Link from "next/link";
import { ExternalLink, Globe2, Radio, Send, ShieldCheck } from "lucide-react";
import { DEMO_PROPERTIES, agentName, formatUSD } from "@/lib/demo-data";
import { normalizeDemoPlan } from "@/lib/demo-plan";
import { PageHeader } from "../demo-ui";

const PUBLISHED_IDS = new Set(["pocitos-premium", "punta-carretas-1", "carrasco-sur", "malvin-1", "parque-miramar"]);

export default async function DemoDistributionPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan: requestedPlan } = await searchParams;
  const plan = normalizeDemoPlan(requestedPlan);

  if (plan === "starter") {
    return (
      <main className="min-h-screen p-5 md:p-8 lg:p-10"><div className="mx-auto max-w-[1450px]"><PageHeader eyebrow="Distribución · Demo" title="Publicaciones" subtitle="La distribución web está disponible desde Professional." /><section className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Disponible desde Professional</p><h2 className="mt-3 font-serif text-3xl text-[#302b25]">Convertí el inventario en catálogo público</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#665f56]">Professional y Enterprise agregan publicación web, fichas compartibles y la base para sincronizar portales externos.</p></section></div></main>
    );
  }

  const properties = DEMO_PROPERTIES.slice(0, 8);
  return (
    <main className="min-h-screen p-5 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <PageHeader eyebrow="Distribución · Demo" title="Publicaciones" subtitle="Así Inmobiliaria Horizonte decide qué propiedades salen al público y en qué canales." />

        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cdbfa9] bg-[#e8dccb] p-5 md:p-6">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#765f42]">Catálogo activo</p><h2 className="mt-2 font-serif text-2xl text-[#302b25]">5 propiedades publicadas</h2><p className="mt-2 text-sm text-[#665f56]">Solo lo que Dirección o Gerencia publica se vuelve visible fuera del CRM.</p></div>
          <Link href={`/demo/catalog?plan=${plan}`} className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2]"><Globe2 size={16}/> Ver catálogo público <ExternalLink size={14}/></Link>
        </div>

        <section className="mb-7 grid gap-4 lg:grid-cols-3">
          <Channel icon={<Globe2 size={18}/>} title="RevScale Web" status="Activo" text="Catálogo y fichas públicas con URL compartible." />
          <Channel icon={<Send size={18}/>} title="Mercado Libre Inmuebles" status="Preparado" text="Listo para conectar credenciales oficiales de la inmobiliaria." />
          <Channel icon={<Radio size={18}/>} title="Gallito / otros portales" status="Preparado" text="Estado, URL externa, ID del aviso y errores por canal ya contemplados." />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]">
          <div className="grid grid-cols-[1.4fr_.7fr_.7fr_.8fr] border-b border-[#ded2c1] bg-[#efe5d7] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#756b5f]"><span>Propiedad</span><span>Responsable</span><span>Precio</span><span>Publicación</span></div>
          {properties.map((property) => {
            const published = PUBLISHED_IDS.has(property.id);
            return <div key={property.id} className="grid grid-cols-[1.4fr_.7fr_.7fr_.8fr] items-center gap-3 border-b border-[#e4d8c8] px-5 py-4 text-sm last:border-b-0"><div><p className="font-semibold text-[#37332d]">{property.title}</p><p className="mt-1 text-xs text-[#81786d]">{property.zone} · {property.operation}</p></div><span className="text-xs text-[#665f56]">{agentName(property.agentId)}</span><span className="font-serif text-base text-[#37332d]">{formatUSD(property.priceUSD)}</span><div className="flex items-center gap-2"><span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${published ? "border-[#b6bea6] bg-[#e8ebdf] text-[#556045]" : "border-[#d2c5b3] bg-[#fffaf2] text-[#756b5f]"}`}>{published ? "Publicado" : "Borrador"}</span>{published && <ShieldCheck size={14} className="text-[#657052]"/>}</div></div>;
          })}
        </section>
      </div>
    </main>
  );
}

function Channel({ icon, title, status, text }: { icon: React.ReactNode; title: string; status: string; text: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[#5f513e]">{icon}<h3 className="font-semibold">{title}</h3></div><span className="rounded-full border border-[#cdbfa9] bg-[#efe5d7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#756b5f]">{status}</span></div><p className="mt-3 text-sm leading-6 text-[#665f56]">{text}</p></div>;
}
