import { Award } from "lucide-react"
import {
  DEMO_METRICS,
  DEMO_LEADS_BY_MONTH,
  DEMO_LEADS_BY_SOURCE,
  DEMO_TEMPERATURE_DISTRIBUTION,
  DEMO_AGENTS,
  DEMO_PROPERTIES,
  PIPELINE_STAGES,
  DEMO_LEADS,
  formatUSD,
} from "@/lib/demo-data"
import { PageHeader, MetricCard, Card, BarRow } from "../demo-ui"

export default function DemoAnalyticsPage() {
  const maxMonth = Math.max(...DEMO_LEADS_BY_MONTH.map((m) => m.leads))
  const maxSource = Math.max(...DEMO_LEADS_BY_SOURCE.map((s) => s.value))
  const totalTemp = DEMO_TEMPERATURE_DISTRIBUTION.reduce(
    (s, t) => s + t.value,
    0,
  )

  const topProperties = [...DEMO_PROPERTIES]
    .sort((a, b) => b.interested - a.interested)
    .slice(0, 5)
  const maxInterested = Math.max(...topProperties.map((p) => p.interested))

  const agents = [...DEMO_AGENTS].sort(
    (a, b) => b.conversions - a.conversions,
  )
  const maxConv = Math.max(...agents.map((a) => a.conversions))

  const stageCounts = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: DEMO_LEADS.filter((l) => l.stage === stage).length,
  }))
  const maxStage = Math.max(...stageCounts.map((s) => s.count), 1)

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Inteligencia comercial"
          title="Analítica"
          subtitle="Métricas del proceso comercial de Inmobiliaria Horizonte."
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Conversión" value={`${DEMO_METRICS.conversionRate}%`} />
          <MetricCard
            title="Tiempo prom. de respuesta"
            value={`${DEMO_METRICS.avgResponseMinutes} min`}
          />
          <MetricCard
            title="Oportunidades activas"
            value={DEMO_METRICS.activeOpportunities}
          />
          <MetricCard
            title="Valor del pipeline"
            value={formatUSD(DEMO_METRICS.pipelineValueUSD)}
          />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Leads por mes">
            <div className="flex h-52 items-end justify-between gap-2">
              {DEMO_LEADS_BY_MONTH.map((m) => (
                <div
                  key={m.month}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-semibold text-[#514b43]">
                    {m.leads}
                  </span>
                  <div
                    className="min-h-1 w-full rounded-t-lg bg-[#8d7654]"
                    style={{ height: `${(m.leads / maxMonth) * 85}%` }}
                  />
                  <span className="text-xs text-[#625b52]">{m.month}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Leads por fuente">
            <div className="space-y-4">
              {DEMO_LEADS_BY_SOURCE.map((s) => (
                <BarRow
                  key={s.source}
                  label={s.source}
                  value={s.value}
                  max={maxSource}
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card title="Distribución HOT / WARM / COLD">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-[#e4d9ca]">
              <div
                className="bg-[#8d7654]"
                style={{
                  width: `${(DEMO_TEMPERATURE_DISTRIBUTION[0].value / totalTemp) * 100}%`,
                }}
              />
              <div
                className="bg-amber-500"
                style={{
                  width: `${(DEMO_TEMPERATURE_DISTRIBUTION[1].value / totalTemp) * 100}%`,
                }}
              />
              <div
                className="bg-slate-500"
                style={{
                  width: `${(DEMO_TEMPERATURE_DISTRIBUTION[2].value / totalTemp) * 100}%`,
                }}
              />
            </div>
            <div className="mt-5 space-y-3">
              {DEMO_TEMPERATURE_DISTRIBUTION.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className={`font-semibold ${t.color}`}>{t.label}</span>
                  <span className="text-[#625b52]">
                    {t.value} ({Math.round((t.value / totalTemp) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Pipeline por etapa">
            <div className="space-y-4">
              {stageCounts.map((s) => (
                <BarRow
                  key={s.stage}
                  label={s.stage}
                  value={s.count}
                  max={maxStage}
                />
              ))}
            </div>
          </Card>

          <Card title="Rendimiento por agente">
            <div className="space-y-4">
              {agents.map((a) => (
                <BarRow
                  key={a.id}
                  label={a.name}
                  value={a.conversions}
                  max={maxConv}
                  suffix=" cierres"
                />
              ))}
            </div>
          </Card>
        </div>

        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]">
                <Award size={15} strokeWidth={1.7} />
              </span>
              Propiedades más demandadas
            </span>
          }
          className="mt-6"
        >
          <div className="space-y-4">
            {topProperties.map((p) => (
              <BarRow
                key={p.id}
                label={`${p.title} · ${p.zone}`}
                value={p.interested}
                max={maxInterested}
                suffix=" interesados"
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
