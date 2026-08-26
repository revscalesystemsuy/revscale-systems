import Image from "next/image"
import { Bath, BedDouble, CheckCircle2, MapPin, RefreshCw, Ruler, UserRound, UsersRound } from "lucide-react"
import { DEMO_PROPERTIES, agentName, formatUSD } from "@/lib/demo-data"
import { DEMO_PLAN_CONFIG, normalizeDemoPlan } from "@/lib/demo-plan"
import { PageHeader } from "../demo-ui"

const PROPERTY_IMAGES: Record<string, string> = {
  "pocitos-premium": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=82",
  "punta-carretas-1": "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=82",
  "carrasco-sur": "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=82",
  "malvin-1": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=82",
  "cordon-1": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=82",
  "parque-miramar": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=82",
  "buceo-rambla": "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=82",
  "carrasco-norte": "https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1600&q=82",
  "pocitos-nuevo": "https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1600&q=82",
  "penthouse-punta-carretas": "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=82",
  "malvin-sur": "https://images.unsplash.com/photo-1600566753198-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=82",
  "punta-gorda": "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=1600&q=82",
}

function demandLabel(demand: "Alta" | "Media" | "Baja") {
  if (demand === "Alta") return "Alta demanda"
  if (demand === "Media") return "Demanda estable"
  return "Demanda selectiva"
}

export default async function DemoPropertiesPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan: requestedPlan } = await searchParams
  const plan = normalizeDemoPlan(requestedPlan)
  const matchingEnabled = DEMO_PLAN_CONFIG[plan].modules.matching
  const properties = [...DEMO_PROPERTIES].sort((a, b) => b.interested - a.interested)
  const featured = properties[0]
  const remaining = properties.slice(1)
  const totalMatches = properties.reduce((sum, property) => sum + property.matches, 0)
  const agentsReached = new Set(properties.map((property) => property.agentId)).size

  return (
    <main className="min-h-screen p-5 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <PageHeader eyebrow="Cartera inmobiliaria · Demo" title="Propiedades" subtitle="Inventario visual de Inmobiliaria Horizonte, con demanda, responsables y matching automático según el plan." />

        {matchingEnabled ? (
          <section className="mb-7 rounded-2xl border border-[#cdbfa9] bg-[#e8dccb] p-6 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#765f42]"><CheckCircle2 size={14} /> Matching automático activo</div>
                <h2 className="mt-3 font-serif text-3xl font-medium text-[#302b25]">Cargás una propiedad. RevScale encuentra la demanda.</h2>
                <p className="mt-3 text-sm leading-6 text-[#665f56]">Al crear o editar precio, zona, operación, dormitorios o disponibilidad, el sistema recalcula coincidencias y avisa a cada agente cuáles de sus clientes encajan.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]"><Stat label="Matches" value={totalMatches} /><Stat label="Agentes" value={agentsReached} /><Stat label="Mejor afinidad" value="94%" /></div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#cdbfa9] pt-5 text-xs text-[#6d665d]"><span className="inline-flex items-center gap-1.5 rounded-full border border-[#c7b79f] bg-[#f7f0e6] px-3 py-1.5"><RefreshCw size={12} /> Automático por eventos</span><span className="rounded-full border border-[#c7b79f] bg-[#f7f0e6] px-3 py-1.5">Recalcular matches como respaldo</span><span className="rounded-full border border-[#c7b79f] bg-[#f7f0e6] px-3 py-1.5">Avisos agrupados por agente</span></div>
          </section>
        ) : (
          <section className="mb-7 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Disponible desde Professional</p><h2 className="mt-2 font-serif text-2xl text-[#302b25]">Matching automático de propiedades y clientes</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#665f56]">Starter mantiene la gestión de inventario. Professional y Enterprise agregan el motor de coincidencias.</p></section>
        )}

        <section className="mb-9 overflow-hidden rounded-3xl border border-[#cfc2af] bg-[#f7f0e6] shadow-[0_20px_55px_rgba(76,62,42,0.08)]">
          <div className="grid lg:grid-cols-[1.45fr_.8fr]">
            <div className="relative min-h-[390px] overflow-hidden lg:min-h-[520px]">
              <Image src={PROPERTY_IMAGES[featured.id]} alt={featured.title} fill priority className="object-cover" sizes="(min-width: 1024px) 68vw, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute left-5 top-5 flex flex-wrap gap-2"><Badge>{featured.operation}</Badge><Badge>{demandLabel(featured.demand)}</Badge></div>
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Propiedad destacada</p><h2 className="mt-2 max-w-2xl font-serif text-3xl font-medium text-white md:text-4xl">{featured.title}</h2><p className="mt-3 flex items-center gap-2 text-sm text-white/80"><MapPin className="h-4 w-4" /> {featured.address} · {featured.zone}</p></div>
            </div>
            <div className="flex flex-col p-6 md:p-8 lg:p-9">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Precio</p><p className="mt-2 font-serif text-4xl font-medium tracking-tight text-[#302b25]">{formatUSD(featured.priceUSD)}</p></div>
              <div className="mt-7 grid grid-cols-3 border-y border-[#ddd1c0] py-5 text-sm text-[#625d55]"><Feature icon={<BedDouble size={16}/>} text={`${featured.bedrooms} dorm.`}/><Feature icon={<Bath size={16}/>} text={`${featured.bathrooms} baños`}/><Feature icon={<Ruler size={16}/>} text={`${featured.areaM2} m²`}/></div>
              <div className="mt-6"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Características</p><div className="mt-3 flex flex-wrap gap-2">{featured.features.map((feature)=><span key={feature} className="rounded-full border border-[#d2c5b3] bg-[#fffaf2] px-3 py-1.5 text-xs text-[#625d55]">{feature}</span>)}</div></div>
              <div className="mt-auto pt-8"><div className="grid grid-cols-2 gap-3"><Stat label="Interesados" value={featured.interested}/><Stat label={matchingEnabled ? "Matches" : "Matching Pro+"} value={matchingEnabled ? featured.matches : "—"}/></div><div className="mt-5 flex items-center gap-2 text-xs text-[#81796e]"><UserRound className="h-4 w-4" /> Gestiona {agentName(featured.agentId)}</div></div>
            </div>
          </div>
        </section>

        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Inventario activo</p><h2 className="mt-2 font-serif text-2xl font-medium text-[#302b25]">Resto de la cartera</h2></div><p className="hidden text-xs text-[#81796e] md:block">Ordenado por interés comercial</p></div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {remaining.map((property) => (
            <article key={property.id} className="group overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_14px_30px_rgba(76,62,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(76,62,42,0.09)]">
              <div className="relative aspect-[16/10] overflow-hidden bg-[#e4d9c9]"><Image src={PROPERTY_IMAGES[property.id]} alt={property.title} fill className="object-cover transition duration-500 group-hover:scale-[1.035]" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"/><div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/><div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3"><Badge>{property.operation}</Badge><Badge>{demandLabel(property.demand)}</Badge></div></div>
              <div className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">{property.zone}</p><h3 className="mt-2 font-serif text-[1.35rem] font-medium leading-tight text-[#302b25]">{property.title}</h3><p className="mt-2 flex items-center gap-1.5 text-xs text-[#81796e]"><MapPin className="h-3.5 w-3.5" /> {property.address}</p>
                <div className="mt-5 flex items-center gap-5 border-y border-[#ded2c2] py-4 text-xs text-[#6f675d]"><Feature icon={<BedDouble size={14}/>} text={`${property.bedrooms} dorm.`}/><Feature icon={<Bath size={14}/>} text={`${property.bathrooms} baños`}/><Feature icon={<Ruler size={14}/>} text={`${property.areaM2} m²`}/></div>
                <div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.14em] text-[#81796e]">Precio</p><p className="mt-1 font-serif text-2xl font-medium text-[#6f5c40]">{formatUSD(property.priceUSD)}</p></div><div className="text-right text-[11px] leading-5 text-[#81796e]"><p>{property.interested} interesados</p><p>{matchingEnabled ? `${property.matches} matches` : "Matching Pro+"}</p></div></div>
                <div className="mt-4 flex items-center justify-between border-t border-[#ded2c2] pt-4 text-[11px] text-[#81796e]"><span>{property.status}</span><span>{agentName(property.agentId)}</span></div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#eee4d6] p-6"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]"><UsersRound size={14}/> Qué ve el agente</div><p className="mt-2 max-w-4xl text-sm leading-6 text-[#665f56]">Cada propiedad muestra responsable, demanda e interés. En Professional y Enterprise, además suma los matches automáticos de los clientes asignados a ese agente.</p></section>
      </div>
    </main>
  )
}

function Badge({children}:{children:React.ReactNode}){return <span className="rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white backdrop-blur-md">{children}</span>}
function Feature({icon,text}:{icon:React.ReactNode;text:string}){return <span className="flex items-center gap-1.5">{icon}{text}</span>}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#81796e]">{label}</p><p className="mt-2 font-serif text-xl text-[#403b34]">{value}</p></div> }
