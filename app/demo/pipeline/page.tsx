import Link from "next/link"
import { Building2 } from "lucide-react"
import { DEMO_LEADS, formatUSD, type Temperature } from "@/lib/demo-data"
import { getPipelineStages, normalizePipelineOperation, type PipelineOperation } from "@/lib/pipeline-config"

type DemoPipelineLead = {
  id: string
  fullName: string
  zone: string
  propertyType: string
  budgetUSD: number
  score: number
  temperature: Temperature
  stageKey: string
}

const SALE_STAGE_KEY: Record<string, string> = {
  "Nuevo lead": "NEW",
  Contactado: "CONTACTED",
  Calificado: "QUALIFIED",
  Visita: "VISIT",
  Negociación: "NEGOTIATION",
  Cierre: "WON",
}

const RENTAL_DEMO_LEADS: DemoPipelineLead[] = [
  { id: "demo-alquiler-1", fullName: "Lucía Moreira", zone: "Pocitos", propertyType: "Apartamento", budgetUSD: 1_350, score: 91, temperature: "HOT", stageKey: "CONTRACT" },
  { id: "demo-alquiler-2", fullName: "Nicolás Suárez", zone: "Cordón", propertyType: "Apartamento", budgetUSD: 980, score: 84, temperature: "HOT", stageKey: "DOCUMENTATION" },
  { id: "demo-alquiler-3", fullName: "Valentina Ramos", zone: "Malvín", propertyType: "Casa", budgetUSD: 1_750, score: 76, temperature: "WARM", stageKey: "VISIT" },
  { id: "demo-alquiler-4", fullName: "Federico Costa", zone: "Buceo", propertyType: "Apartamento", budgetUSD: 1_100, score: 69, temperature: "WARM", stageKey: "QUALIFIED" },
  { id: "demo-alquiler-5", fullName: "Carolina Méndez", zone: "Punta Carretas", propertyType: "Apartamento", budgetUSD: 1_600, score: 88, temperature: "HOT", stageKey: "HANDOVER" },
]

function priorityLabel(temperature: Temperature) {
  if (temperature === "HOT") return "Alta"
  if (temperature === "WARM") return "Media"
  return "Baja"
}

function priorityStyle(temperature: Temperature) {
  if (temperature === "HOT") return "border-[#b58d73] bg-[#ead8cb] text-[#6b4433]"
  if (temperature === "WARM") return "border-[#c4a76f] bg-[#efe2c4] text-[#6c5831]"
  return "border-[#c8c0b3] bg-[#eee9e0] text-[#625d55]"
}

export default async function DemoPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string }>
}) {
  const { operation: requestedOperation } = await searchParams
  const operation: PipelineOperation = normalizePipelineOperation(requestedOperation)
  const stages = getPipelineStages(operation)

  const saleLeads: DemoPipelineLead[] = DEMO_LEADS
    .filter((lead) => String(lead.operation).toLowerCase() !== "alquiler")
    .map((lead) => ({
      id: lead.id,
      fullName: lead.fullName,
      zone: lead.zone,
      propertyType: lead.propertyType,
      budgetUSD: lead.budgetUSD,
      score: lead.score,
      temperature: lead.temperature,
      stageKey: SALE_STAGE_KEY[lead.stage] || "NEW",
    }))

  const leads = operation === "ALQUILER" ? RENTAL_DEMO_LEADS : saleLeads
  const totalValue = leads.reduce((sum, lead) => sum + lead.budgetUSD, 0)
  const operationLabel = operation === "ALQUILER" ? "Alquiler" : "Venta"
  const description = operation === "ALQUILER"
    ? "De la consulta a documentación, contrato y entrega de llaves."
    : "De la consulta a negociación, reserva y cierre de la venta."

  return (
    <main className="min-h-screen p-5 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1800px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Pipeline comercial · Demo</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Pipeline de {operationLabel.toLowerCase()}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55]">{description} La demo refleja el mismo modelo comercial del sistema real.</p>
          </div>
          <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">Valor en pipeline · ejemplo</p>
            <p className="mt-1 font-serif text-2xl text-[#302d28]">{operation === "ALQUILER" ? `USD ${totalValue.toLocaleString("es-UY")}/mes` : formatUSD(totalValue)}</p>
          </div>
        </div>

        <section className="mt-7 inline-flex rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-1">
          <Link href="/demo/pipeline?operation=COMPRA" className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${operation === "COMPRA" ? "bg-[#302d28] !text-[#fffaf2]" : "text-[#625d55] hover:bg-[#eee4d5]"}`}>Venta</Link>
          <Link href="/demo/pipeline?operation=ALQUILER" className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${operation === "ALQUILER" ? "bg-[#302d28] !text-[#fffaf2]" : "text-[#625d55] hover:bg-[#eee4d5]"}`}>Alquiler</Link>
        </section>

        <section className="mt-6 overflow-x-auto pb-3">
          <div className="grid gap-4" style={{ minWidth: `${Math.max(1680, stages.length * 235)}px`, gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))` }}>
            {stages.map((stage) => {
              const stageLeads = leads.filter((lead) => lead.stageKey === stage.key)
              const stageValue = stageLeads.reduce((sum, lead) => sum + lead.budgetUSD, 0)

              return (
                <div key={stage.key} className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6]">
                  <div className="border-b border-[#d8ccbc] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8d7553]">Etapa</p>
                        <h2 className="mt-1 font-serif text-lg font-medium text-[#302d28]">{stage.label}</h2>
                      </div>
                      <span className="rounded-full border border-[#d0c2ad] bg-[#eee4d5] px-2.5 py-1 text-xs text-[#6b6258]">{stageLeads.length}</span>
                    </div>
                    <p className="mt-2 min-h-10 text-xs leading-5 text-[#756e65]">{stage.hint}</p>
                    <p className="mt-4 font-serif text-lg text-[#6f5c40]">{stageValue ? (operation === "ALQUILER" ? `USD ${stageValue.toLocaleString("es-UY")}/mes` : formatUSD(stageValue)) : "Sin valor cargado"}</p>
                  </div>

                  <div className="space-y-3 p-3">
                    {stageLeads.map((lead) => (
                      <div key={lead.id} className="rounded-lg border border-[#d8ccbc] bg-[#fffaf2] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#37332d]">{lead.fullName}</p>
                            <p className="mt-1 text-[11px] text-[#756e65]">{lead.zone}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${priorityStyle(lead.temperature)}`}>{priorityLabel(lead.temperature)}</span>
                        </div>
                        <div className="mt-4 border-t border-[#e0d6c8] pt-3">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">Presupuesto</p>
                          <p className="mt-1 font-serif text-lg text-[#403b34]">{operation === "ALQUILER" ? `USD ${lead.budgetUSD.toLocaleString("es-UY")}/mes` : formatUSD(lead.budgetUSD)}</p>
                          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#756e65]">
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.propertyType}</span>
                            <span>Afinidad {lead.score}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!stageLeads.length && <div className="rounded-lg border border-dashed border-[#d2c5b3] px-4 py-8 text-center text-xs text-[#756e65]">Sin oportunidades</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="mt-4 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4 text-sm leading-6 text-[#625d55]">
          <strong className="text-[#403b34]">Cómo funciona:</strong> el tipo de operación define las etapas disponibles. HOT / WARM / COLD permanece como prioridad comercial y no como etapa del proceso.
        </div>
      </div>
    </main>
  )
}
