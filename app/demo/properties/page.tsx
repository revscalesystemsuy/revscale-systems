import {
  DEMO_PROPERTIES,
  formatUSD,
  agentName,
} from "@/lib/demo-data"
import { PageHeader } from "../demo-ui"

function demandBadge(demand: "Alta" | "Media" | "Baja") {
  switch (demand) {
    case "Alta":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30"
    case "Media":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30"
    case "Baja":
      return "bg-slate-500/10 text-slate-400 border-slate-500/30"
  }
}

export default function DemoPropertiesPage() {
  const properties = [...DEMO_PROPERTIES].sort(
    (a, b) => b.interested - a.interested,
  )
  const highDemand = properties.filter((p) => p.demand === "Alta")

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Inventario inmobiliario"
          title="Propiedades"
          subtitle="Propiedades disponibles de Inmobiliaria Horizonte."
          action={
            <div className="rounded-xl border border-white/10 px-5 py-3">
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-2xl font-bold">{properties.length}</p>
            </div>
          }
        />

        {/* Mayor demanda */}
        <section className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <h2 className="text-lg font-semibold">🔥 Propiedades con mayor demanda</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highDemand.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
              >
                <p className="font-semibold">{p.title}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {p.zone} · {formatUSD(p.priceUSD)}
                </p>
                <p className="mt-2 text-sm text-blue-400">
                  {p.interested} interesados · {p.matches} matches
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <div className="flex h-36 items-center justify-center border-b border-white/10 bg-white/[0.02]">
                <span className="text-sm text-slate-600">
                  {p.type} · {p.zone}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                      {p.operation}
                    </p>
                    <h2 className="mt-1 text-lg font-bold">{p.title}</h2>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${demandBadge(
                      p.demand,
                    )}`}
                  >
                    {p.demand}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">{p.address}</p>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                  <span>{p.bedrooms} dorm.</span>
                  <span>{p.bathrooms} baños</span>
                  <span>{p.areaM2} m²</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {p.features.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>

                <div className="mt-auto border-t border-white/10 pt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Precio</p>
                      <p className="text-2xl font-bold">
                        {formatUSD(p.priceUSD)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{p.interested} interesados</p>
                      <p>{p.matches} matches IA</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Estado: {p.status} · Agente: {agentName(p.agentId)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
