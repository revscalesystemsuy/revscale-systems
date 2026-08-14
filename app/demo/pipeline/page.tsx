import Link from "next/link"
import {
  DEMO_LEADS,
  PIPELINE_STAGES,
  formatUSD,
  temperatureBadge,
  type PipelineStage,
} from "@/lib/demo-data"
import { PageHeader } from "../demo-ui"

const STAGE_HINT: Record<PipelineStage, string> = {
  "Nuevo lead": "Sin contactar",
  Contactado: "Primer contacto",
  Calificado: "Interés confirmado",
  Visita: "Visita coordinada",
  Negociación: "En negociación",
  Cierre: "Operación cerrada",
}

export default function DemoPipelinePage() {
  const totalValue = DEMO_LEADS.reduce((sum, l) => sum + l.budgetUSD, 0)

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          eyebrow="Pipeline comercial"
          title="Pipeline de ventas"
          subtitle="Distribución de leads por etapa comercial y valor potencial."
          action={
            <div className="rounded-xl border border-white/10 px-5 py-3">
              <p className="text-xs text-slate-400">Valor potencial total</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatUSD(totalValue)}
              </p>
            </div>
          }
        />

        <section className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {PIPELINE_STAGES.map((stage) => {
            const leads = DEMO_LEADS.filter((l) => l.stage === stage)
            const value = leads.reduce((s, l) => s + l.budgetUSD, 0)
            return (
              <div
                key={stage}
                className="rounded-2xl border border-white/10 bg-white/[0.02]"
              >
                <div className="border-b border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold">{stage}</h2>
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-sm font-semibold">
                      {leads.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {STAGE_HINT[stage]}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-blue-400">
                    {formatUSD(value)}
                  </p>
                </div>

                <div className="space-y-3 p-3">
                  {leads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/demo/leads/${lead.id}`}
                      className="block rounded-xl border border-white/10 bg-slate-900 p-4 transition hover:border-blue-500/40 hover:bg-slate-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">
                          {lead.fullName}
                        </p>
                        <span className="text-lg font-bold text-blue-400">
                          {lead.score}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {lead.zone} · {lead.bedrooms} dorm.
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {formatUSD(lead.budgetUSD)}
                      </p>
                      <span
                        className={`mt-3 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${temperatureBadge(
                          lead.temperature,
                        )}`}
                      >
                        {lead.temperature}
                      </span>
                    </Link>
                  ))}

                  {!leads.length && (
                    <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-600">
                      Sin leads
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
