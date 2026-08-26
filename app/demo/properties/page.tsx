import { Bath, BedDouble, CheckCircle2, MapPin, RefreshCw, Ruler, UsersRound } from "lucide-react"
import { DEMO_PROPERTIES, agentName, formatUSD } from "@/lib/demo-data"
import { DEMO_PLAN_CONFIG, normalizeDemoPlan } from "@/lib/demo-plan"
import { PageHeader } from "../demo-ui"

export default async function DemoPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan: requestedPlan } = await searchParams
  const plan = normalizeDemoPlan(requestedPlan)
  const matchingEnabled = DEMO_PLAN_CONFIG[plan].modules.matching
  const properties = [...DEMO_PROPERTIES].sort((a, b) => b.interested - a.interested)
  const featured = properties[0]
  const totalMatches = properties.reduce((sum, property) => sum + property.matches, 0)
  const agentsReached = new Set(properties.map((property) => property.agentId)).size

  return (
    <main className="min-h-screen p-5 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <PageHeader
          eyebrow="Cartera inmobiliaria · Demo"
          title="Propiedades"
          subtitle="Inventario activo con matching automático entre propiedades y clientes. La demo refleja el comportamiento del sistema real según el plan elegido."
        />

        {matchingEnabled ? (
          <section className="mb-7 rounded-2xl border border-[#cdbfa9] bg-[#e8dccb] p-6 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#765f42]"><CheckCircle2 size={14} /> Matching automático activo</div>
                <h2 className="mt-3 font-serif text-3xl font-medium text-[#302b25]">Cargás una propiedad. RevScale encuentra la demanda.</h2>
                <p className="mt-3 text-sm leading-6 text-[#665f56]">Al crear o editar precio, zona, operación, dormitorios o disponibilidad, el sistema recalcula coincidencias y avisa a cada agente cuáles de sus clientes encajan.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
                <Stat label="Matches" value={totalMatches} />
                <Stat label="Agentes" value={agentsReached} />
                <Stat label="Mejor afinidad" value="94%" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#cdbfa9] pt-5 text-xs text-[#6d665d]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c7b79f] bg-[#f7f0e6] px-3 py-1.5"><RefreshCw size={12} /> Automático por eventos</span>
              <span className="rounded-full border border-[#c7b79f] bg-[#f7f0e6] px-3 py-1.5">Recalcular matches como respaldo</span>
              <span className="rounded-full border border-[#c7b79f] bg-[#f7f0e6] px-3 py-1.5">Avisos agrupados por agente</span>
            </div>
          </section>
        ) : (
          <section className="mb-7 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Disponible desde Professional</p>
            <h2 className="mt-2 font-serif text-2xl text-[#302b25]">Matching automático de propiedades y clientes</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#665f56]">Starter mantiene la gestión de inventario. Professional y Enterprise agregan el motor que recalcula coincidencias automáticamente y avisa a los agentes.</p>
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Propiedad destacada · {featured.operation}</p>
                <h2 className="mt-2 font-serif text-3xl font-medium text-[#302b25]">{featured.title}</h2>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-[#746d64]"><MapPin size={14} /> {featured.address} · {featured.zone}</p>
              </div>
              <p className="font-serif text-3xl text-[#6f5c40]">{formatUSD(featured.priceUSD)}</p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 border-y border-[#ddd1c0] py-5 text-sm text-[#625d55]">
              <span className="flex items-center gap-2"><BedDouble size={15} /> {featured.bedrooms} dorm.</span>
              <span className="flex items-center gap-2"><Bath size={15} /> {featured.bathrooms} baños</span>
              <span className="flex items-center gap-2"><Ruler size={15} /> {featured.areaM2} m²</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat label="Interesados" value={featured.interested} />
              <Stat label="Matches automáticos" value={matchingEnabled ? featured.matches : "—"} />
              <Stat label="Responsable" value={agentName(featured.agentId).split(" ")[0]} />
            </div>
          </article>

          <article className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-7">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]"><UsersRound size={14} /> Ejemplo de aviso automático</div>
            {matchingEnabled ? (
              <div className="mt-5 rounded-xl border border-[#cdb69a] bg-[#efe3d3] p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#403b34]">Clientes compatibles detectados</p><p className="mt-2 text-sm leading-6 text-[#625d55]">3 clientes de tu cartera coinciden con {featured.title}. Mejor afinidad: 94%.</p></div><span className="rounded-full border border-[#b88e75] bg-[#ead3c3] px-2.5 py-1 text-[9px] font-semibold uppercase text-[#6b4433]">Alta</span></div>
                <p className="mt-4 text-xs text-[#81796e]">El agente recibe solo los clientes que tiene asignados. No se envían mensajes al cliente sin intervención humana.</p>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#cdbfa9] bg-[#fffaf2] p-6 text-sm leading-6 text-[#81796e]">En Starter no se generan avisos de matching. Cambiá la demo a Professional o Enterprise para ver esta capa.</div>
            )}
          </article>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.slice(1).map((property) => (
            <article key={property.id} className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">{property.zone}</p><h3 className="mt-2 font-serif text-xl font-medium text-[#37332d]">{property.title}</h3></div><span className="rounded-full border border-[#cfc1ad] bg-[#eee4d5] px-2.5 py-1 text-[9px] font-semibold uppercase text-[#6b6258]">{property.operation}</span></div>
              <p className="mt-4 font-serif text-2xl text-[#6f5c40]">{formatUSD(property.priceUSD)}</p>
              <div className="mt-4 flex items-center justify-between border-t border-[#ded2c2] pt-4 text-xs text-[#756e65]"><span>{property.bedrooms} dorm. · {property.areaM2} m²</span><span>{matchingEnabled ? `${property.matches} matches automáticos` : "Matching Pro+"}</span></div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#81796e]">{label}</p><p className="mt-2 font-serif text-xl text-[#403b34]">{value}</p></div>
}