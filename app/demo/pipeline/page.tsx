import Link from "next/link"
import { ArrowRight, Building2 } from "lucide-react"
import {
  DEMO_LEADS,
  PIPELINE_STAGES,
  formatUSD,
  type PipelineStage,
  type Temperature,
} from "@/lib/demo-data"
import { PageHeader } from "../demo-ui"

const STAGE_HINT: Record<PipelineStage, string> = {
  "Nuevo lead": "Pendiente de contacto",
  Contactado: "Conversación iniciada",
  Calificado: "Búsqueda validada",
  Visita: "Propiedad visitada",
  Negociación: "Condiciones en curso",
  Cierre: "Operación concretada",
}

function priorityLabel(temperature: Temperature) {
  if (temperature === "HOT") return "Alta"
  if (temperature === "WARM") return "Media"
  return "Baja"
}

function priorityStyle(temperature: Temperature) {
  if (temperature === "HOT") {
    return "border-[#6f5d3f] bg-[#2a241b] text-[#dfc99f]"
  }
  if (temperature === "WARM") {
    return "border-[#49443a] bg-[#211f1b] text-[#b9b1a4]"
  }
  return "border-[#38352f] bg-[#1d1c19] text-[#817c74]"
}

export default function DemoPipelinePage() {
  const totalValue = DEMO_LEADS.reduce((sum, lead) => sum + lead.budgetUSD, 0)
  const decisionValue = DEMO_LEADS.filter(
    (lead) => lead.stage === "Visita" || lead.stage === "Negociación",
  ).reduce((sum, lead) => sum + lead.budgetUSD, 0)

  return (
    <div className="p-5 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          eyebrow="Pipeline comercial"
          title="Pipeline de ventas"
          subtitle="Seguimiento visual de compradores activos, avance comercial y valor potencial por etapa."
          action={
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#353229] bg-[#1b1a17]">
              <div className="px-5 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#77736b]">
                  Valor total
                </p>
                <p className="mt-1 font-serif text-xl text-[#f2ebdf] md:text-2xl">
                  {formatUSD(totalValue)}
                </p>
              </div>
              <div className="border-l border-[#353229] px-5 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9b8969]">
                  En decisión
                </p>
                <p className="mt-1 font-serif text-xl text-[#ddc79e] md:text-2xl">
                  {formatUSD(decisionValue)}
                </p>
              </div>
            </div>
          }
        />

        <section className="overflow-x-auto pb-2">
          <div className="grid min-w-[1260px] grid-cols-6 gap-4">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = DEMO_LEADS.filter((lead) => lead.stage === stage)
              const stageValue = stageLeads.reduce(
                (sum, lead) => sum + lead.budgetUSD,
                0,
              )

              return (
                <div
                  key={stage}
                  className="rounded-xl border border-[#353229] bg-[#181714]"
                >
                  <div className="border-b border-[#353229] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#77736b]">
                          Etapa
                        </p>
                        <h2 className="mt-1 font-serif text-lg font-medium text-[#eee7dc]">
                          {stage}
                        </h2>
                      </div>
                      <span className="rounded-full border border-[#403c34] bg-[#211f1b] px-2.5 py-1 text-xs text-[#aaa39a]">
                        {stageLeads.length}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-[#77736b]">
                      {STAGE_HINT[stage]}
                    </p>
                    <p className="mt-4 font-serif text-xl text-[#d9c9ab]">
                      {formatUSD(stageValue)}
                    </p>
                  </div>

                  <div className="space-y-3 p-3">
                    {stageLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/demo/leads/${lead.id}`}
                        className="group block rounded-lg border border-[#302e28] bg-[#1d1c19] p-4 transition hover:border-[#514a3d] hover:bg-[#211f1b]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#e8e1d6]">
                              {lead.fullName}
                            </p>
                            <p className="mt-1 text-[11px] text-[#77736b]">
                              {lead.zone} · {lead.bedrooms} dorm.
                            </p>
                          </div>
                          <ArrowRight className="mt-0.5 h-4 w-4 text-[#5f5a52] transition group-hover:translate-x-0.5 group-hover:text-[#b9a27a]" />
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#302e28] pt-3">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69655f]">
                              Presupuesto
                            </p>
                            <p className="mt-1 font-serif text-lg text-[#ebe4d9]">
                              {formatUSD(lead.budgetUSD)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69655f]">
                              Afinidad
                            </p>
                            <p className="mt-1 font-serif text-lg text-[#c8b794]">
                              {lead.score}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.09em] ${priorityStyle(
                              lead.temperature,
                            )}`}
                          >
                            Prioridad {priorityLabel(lead.temperature)}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-[#69655f]">
                            <Building2 className="h-3 w-3" />
                            {lead.propertyType}
                          </span>
                        </div>
                      </Link>
                    ))}

                    {!stageLeads.length && (
                      <div className="rounded-lg border border-dashed border-[#353229] px-4 py-8 text-center">
                        <p className="text-xs text-[#666159]">Sin oportunidades</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
