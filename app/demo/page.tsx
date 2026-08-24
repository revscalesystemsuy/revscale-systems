import Link from "next/link"
import { ArrowUpRight, Check, Clock3, Sparkles } from "lucide-react"
import {
  DEMO_METRICS,
  DEMO_AI_RECOMMENDATIONS,
  DEMO_PROPERTIES,
  DEMO_AGENTS,
  DEMO_INTERACTIONS,
  DEMO_LEADS,
  PIPELINE_STAGES,
  formatUSD,
} from "@/lib/demo-data"
import { PageHeader, MetricCard, Card, BarRow } from "./demo-ui"

export default function DemoDashboardPage() {
  const topProperties = [...DEMO_PROPERTIES]
    .sort((a, b) => b.interested - a.interested)
    .slice(0, 5)

  const topAgents = [...DEMO_AGENTS].sort(
    (a, b) => b.conversions - a.conversions,
  )
  const maxConversions = Math.max(...topAgents.map((a) => a.conversions))

  const recentActivity = DEMO_INTERACTIONS.slice(0, 5)

  const stageCounts = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: DEMO_LEADS.filter((l) => l.stage === stage).length,
  }))
  const maxStage = Math.max(...stageCounts.map((s) => s.count), 1)

  const implementationSteps = [
    { label: "Integración de WhatsApp", done: true },
    { label: "Importación de leads", done: true },
    { label: "Carga de inventario de propiedades", done: true },
    { label: "Matching inteligente configurado", done: true },
    { label: "Equipo comercial incorporado", done: true },
    { label: "Reportes automáticos activados", done: false },
  ]
  const doneSteps = implementationSteps.filter((s) => s.done).length

  return (
    <div className="p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Inmobiliaria Horizonte"
          title="Resumen comercial"
          subtitle="Una vista clara de la cartera, las oportunidades activas y las acciones que requieren atención del equipo."
        />

        <section className="relative overflow-hidden rounded-xl border border-[#453e31] bg-[#1c1914] p-6 md:p-7">
          <div className="absolute inset-y-0 left-0 w-1 bg-[#b49a6b]" />
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4ad82]">
                <Sparkles size={14} strokeWidth={1.7} />
                Prioridad del día
              </div>
              <p className="mt-3 font-serif text-2xl leading-snug text-[#f2eadc]">
                {DEMO_METRICS.hotLeads} oportunidades calientes y {DEMO_METRICS.urgentLeads} leads urgentes requieren seguimiento hoy.
              </p>
              <p className="mt-3 text-sm leading-6 text-[#a9a398]">
                RevScale ordena la actividad comercial por intención, urgencia y valor potencial para que el equipo sepa dónde actuar primero.
              </p>
            </div>
            <Link
              href="/demo/leads"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-[#5a503e] px-4 py-2.5 text-sm font-medium text-[#e8decf] transition hover:bg-[#282219] md:self-auto"
            >
              Ver oportunidades
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard title="Leads" value={DEMO_METRICS.totalLeads} />
          <MetricCard title="Alta intención" value={DEMO_METRICS.hotLeads} />
          <MetricCard title="Interacciones" value={DEMO_METRICS.interactionsThisMonth} hint="Este mes" />
          <MetricCard title="Oportunidades" value={DEMO_METRICS.activeOpportunities} />
          <MetricCard title="Seguimientos" value={DEMO_METRICS.pendingFollowups} hint="Pendientes" />
          <MetricCard title="Urgentes" value={DEMO_METRICS.urgentLeads} />
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-3">
          <Card title="Siguientes acciones" className="lg:col-span-2">
            <div className="divide-y divide-[#302d27]">
              {DEMO_AI_RECOMMENDATIONS.map((rec) => {
                const inner = (
                  <div className="group flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex gap-3">
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#4c4436] bg-[#211e18] text-[#c5ae82]">
                        <ArrowUpRight size={13} />
                      </span>
                      <p className="text-sm leading-6 text-[#c0b9ae]">{rec.text}</p>
                    </div>
                    <span className="mt-1 text-xs text-[#6f6a62] transition group-hover:text-[#b49a6b]">Abrir</span>
                  </div>
                )
                return rec.leadId ? (
                  <Link key={rec.id} href={`/demo/leads/${rec.leadId}`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={rec.id}>{inner}</div>
                )
              })}
            </div>
          </Card>

          <Card title="Pipeline comercial">
            <div className="space-y-4">
              {stageCounts.map((s) => (
                <BarRow key={s.stage} label={s.stage} value={s.count} max={maxStage} />
              ))}
            </div>
            <div className="mt-6 border-t border-[#302d27] pt-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#777168]">
                Valor potencial
              </p>
              <p className="mt-2 font-serif text-3xl text-[#d6bf92]">
                {formatUSD(DEMO_METRICS.pipelineValueUSD)}
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Propiedades con mayor interés">
            <div className="divide-y divide-[#302d27]">
              {topProperties.map((p, i) => (
                <Link
                  key={p.id}
                  href="/demo/properties"
                  className="group flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="font-serif text-lg text-[#80786b]">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#eee7db] group-hover:text-[#d6bf92]">{p.title}</p>
                      <p className="mt-1 text-xs text-[#858078]">{p.zone} · {formatUSD(p.priceUSD)}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm text-[#a79f92]">{p.interested} interesados</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Desempeño del equipo">
            <div className="space-y-5">
              {topAgents.map((a) => (
                <div key={a.id}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-[#e9e2d6]">{a.name}</span>
                    <span className="text-xs text-[#89837a]">{a.conversions} cierres · {formatUSD(a.potentialValueUSD)}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#2b2822]">
                    <div
                      className="h-full rounded-full bg-[#8f7b58]"
                      style={{ width: `${Math.round((a.conversions / maxConversions) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Actividad reciente">
            <div className="divide-y divide-[#302d27]">
              {recentActivity.map((a) => (
                <Link
                  key={a.id}
                  href={`/demo/leads/${a.leadId}`}
                  className="block py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-[#d8cebd]">{a.leadName}</span>
                    <span className="flex items-center gap-1.5 text-xs text-[#706b63]"><Clock3 size={12} />{a.date}</span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#8d826e]">{a.channel}</p>
                  <p className="mt-2 text-sm leading-6 text-[#9d978e]">{a.message}</p>
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Configuración de la cuenta">
            <p className="text-sm text-[#9b958b]">{doneSteps} de {implementationSteps.length} etapas completadas</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#2b2822]">
              <div
                className="h-full rounded-full bg-[#81906e]"
                style={{ width: `${Math.round((doneSteps / implementationSteps.length) * 100)}%` }}
              />
            </div>
            <div className="mt-5 divide-y divide-[#302d27]">
              {implementationSteps.map((s) => (
                <div key={s.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 text-sm">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${s.done ? "border-[#5f6e52] text-[#9bad86]" : "border-[#3d3932] text-[#5f5a53]"}`}>
                    {s.done ? <Check size={12} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                  <span className={s.done ? "text-[#bdb6aa]" : "text-[#68635c]"}>{s.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
