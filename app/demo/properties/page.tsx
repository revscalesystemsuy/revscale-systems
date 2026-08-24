import { Bath, BedDouble, MapPin, Ruler, UserRound } from "lucide-react"
import {
  DEMO_PROPERTIES,
  formatUSD,
  agentName,
} from "@/lib/demo-data"
import { PageHeader } from "../demo-ui"

const PROPERTY_IMAGES: Record<string, string> = {
  "pocitos-premium":
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=82",
  "punta-carretas-1":
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=82",
  "carrasco-sur":
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=82",
  "malvin-1":
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=82",
  "cordon-1":
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=82",
  "parque-miramar":
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=82",
  "buceo-rambla":
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=82",
  "carrasco-norte":
    "https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1600&q=82",
  "pocitos-nuevo":
    "https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1600&q=82",
  "penthouse-punta-carretas":
    "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=82",
  "malvin-sur":
    "https://images.unsplash.com/photo-1600566753198-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=82",
  "punta-gorda":
    "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=1600&q=82",
}

function demandLabel(demand: "Alta" | "Media" | "Baja") {
  if (demand === "Alta") return "Alta demanda"
  if (demand === "Media") return "Demanda estable"
  return "Demanda selectiva"
}

function demandStyle(demand: "Alta" | "Media" | "Baja") {
  if (demand === "Alta") {
    return "border-[#b49a6b]/50 bg-[#1f1c17]/90 text-[#e2cfaa]"
  }
  return "border-white/15 bg-black/35 text-white/75"
}

export default function DemoPropertiesPage() {
  const properties = [...DEMO_PROPERTIES].sort(
    (a, b) => b.interested - a.interested,
  )
  const highDemand = properties.filter((p) => p.demand === "Alta")
  const featured = properties[0]
  const remaining = properties.slice(1)

  return (
    <div className="p-5 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <PageHeader
          eyebrow="Cartera inmobiliaria"
          title="Propiedades"
          subtitle="Inventario activo, nivel de demanda y oportunidades comerciales de Inmobiliaria Horizonte."
          action={
            <div className="flex gap-3">
              <div className="rounded-xl border border-[#353229] bg-[#1b1a17] px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77736b]">
                  Cartera
                </p>
                <p className="mt-1 font-serif text-2xl text-[#f5efe4]">
                  {properties.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#4a4438] bg-[#211e19] px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b8969]">
                  Alta demanda
                </p>
                <p className="mt-1 font-serif text-2xl text-[#e3cfaa]">
                  {highDemand.length}
                </p>
              </div>
            </div>
          }
        />

        <section className="mb-10 overflow-hidden rounded-2xl border border-[#39352d] bg-[#1b1a17]">
          <div className="grid lg:grid-cols-[1.45fr_0.8fr]">
            <div
              className="relative min-h-[360px] bg-cover bg-center lg:min-h-[510px]"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(18,17,15,.04) 45%, rgba(18,17,15,.72) 100%), url(${PROPERTY_IMAGES[featured.id]})`,
              }}
            >
              <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
                  {featured.operation}
                </span>
                <span
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md ${demandStyle(featured.demand)}`}
                >
                  {demandLabel(featured.demand)}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/65">
                  Propiedad destacada
                </p>
                <h2 className="mt-2 max-w-2xl font-serif text-3xl font-medium text-white md:text-4xl">
                  {featured.title}
                </h2>
                <p className="mt-3 flex items-center gap-2 text-sm text-white/75">
                  <MapPin className="h-4 w-4" />
                  {featured.address} · {featured.zone}
                </p>
              </div>
            </div>

            <div className="flex flex-col p-6 md:p-8 lg:p-9">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77736b]">
                  Precio de venta
                </p>
                <p className="mt-2 font-serif text-4xl font-medium tracking-tight text-[#f5efe4]">
                  {formatUSD(featured.priceUSD)}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-3 border-y border-[#353229] py-5">
                <div>
                  <BedDouble className="h-4 w-4 text-[#9c917f]" />
                  <p className="mt-2 text-sm font-medium text-[#e8e1d5]">
                    {featured.bedrooms} dorm.
                  </p>
                </div>
                <div>
                  <Bath className="h-4 w-4 text-[#9c917f]" />
                  <p className="mt-2 text-sm font-medium text-[#e8e1d5]">
                    {featured.bathrooms} baños
                  </p>
                </div>
                <div>
                  <Ruler className="h-4 w-4 text-[#9c917f]" />
                  <p className="mt-2 text-sm font-medium text-[#e8e1d5]">
                    {featured.areaM2} m²
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77736b]">
                  Características
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {featured.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-[#3b372f] bg-[#211f1b] px-3 py-1.5 text-xs text-[#bcb5aa]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-8">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#211f1b] p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#77736b]">
                      Interesados
                    </p>
                    <p className="mt-2 font-serif text-2xl text-[#efe8db]">
                      {featured.interested}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#211f1b] p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#77736b]">
                      Coincidencias
                    </p>
                    <p className="mt-2 font-serif text-2xl text-[#efe8db]">
                      {featured.matches}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs text-[#8f8a80]">
                  <UserRound className="h-4 w-4" />
                  Gestiona {agentName(featured.agentId)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77736b]">
              Inventario activo
            </p>
            <h2 className="mt-2 font-serif text-2xl font-medium text-[#efe8db]">
              Resto de la cartera
            </h2>
          </div>
          <p className="hidden text-xs text-[#77736b] md:block">
            Ordenado por interés comercial
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {remaining.map((property) => (
            <article
              key={property.id}
              className="group overflow-hidden rounded-xl border border-[#353229] bg-[#1b1a17] transition duration-300 hover:-translate-y-0.5 hover:border-[#514a3d]"
            >
              <div
                className="relative aspect-[16/10] overflow-hidden bg-[#25221d] bg-cover bg-center transition duration-500 group-hover:scale-[1.015]"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(16,15,13,.04), rgba(16,15,13,.28)), url(${PROPERTY_IMAGES[property.id]})`,
                }}
              >
                <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
                  <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/90 backdrop-blur-md">
                    {property.operation}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide backdrop-blur-md ${demandStyle(property.demand)}`}
                  >
                    {demandLabel(property.demand)}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b8969]">
                  {property.zone}
                </p>
                <h3 className="mt-2 font-serif text-[1.35rem] font-medium leading-tight text-[#f1eadf]">
                  {property.title}
                </h3>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[#817d75]">
                  <MapPin className="h-3.5 w-3.5" />
                  {property.address}
                </p>

                <div className="mt-5 flex items-center gap-5 border-y border-[#302e28] py-4 text-xs text-[#aaa49a]">
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" />
                    {property.bedrooms} dorm.
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Bath className="h-3.5 w-3.5" />
                    {property.bathrooms} baños
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5" />
                    {property.areaM2} m²
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#77736b]">
                      Precio
                    </p>
                    <p className="mt-1 font-serif text-2xl font-medium text-[#f4ede2]">
                      {formatUSD(property.priceUSD)}
                    </p>
                  </div>
                  <div className="text-right text-[11px] leading-5 text-[#817d75]">
                    <p>{property.interested} interesados</p>
                    <p>{property.matches} coincidencias</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#302e28] pt-4 text-[11px] text-[#77736b]">
                  <span>{property.status}</span>
                  <span>{agentName(property.agentId)}</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
