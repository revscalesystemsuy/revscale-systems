import Link from "next/link"
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
    { label: "Matching IA configurado", done: true },
    { label: "Equipo comercial onboardeado", done: true },
    { label: "Reportes automáticos activados", done: false },
  ]
  const doneSteps = implementationSteps.filter((s) => s.done).length

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="AI Sales Intelligence"
          title="Dashboard comercial"
          subtitle="Prioridades, oportunidades y rendimiento del equipo de Inmobiliaria Horizonte."
        />

        {/* AI Sales Brief */}
        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <h2 className="text-xl font-bold">🤖 AI Sales Brief</h2>
          <p className="mt-3 text-slate-300">
            Tenés <b>{DEMO_METRICS.hotLeads}</b> oportunidades calientes y{" "}
            <b>{DEMO_METRICS.urgentLeads}</b> leads urgentes que requieren
            atención hoy. La IA recomienda priorizar los leads con mayor
            intención de compra.
          </p>
        </section>

        {/* Métricas */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard title="Total de leads" value={DEMO_METRICS.totalLeads} />
          <MetricCard title="Leads HOT" value={DEMO_METRICS.hotLeads} />
          <MetricCard
            title="Interacciones (mes)"
            value={DEMO_METRICS.interactionsThisMonth}
          />
          <MetricCard
            title="Oportunidades activas"
            value={DEMO_METRICS.activeOpportunities}
          />
          <MetricCard
            title="Follow-ups pendientes"
            value={DEMO_METRICS.pendingFollowups}
          />
          <MetricCard
            title="Leads urgentes"
            value={DEMO_METRICS.urgentLeads}
          />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Recomendaciones IA */}
          <Card title="⚡ Recomendaciones IA" className="lg:col-span-2">
            <div className="space-y-3">
              {DEMO_AI_RECOMMENDATIONS.map((rec) => {
                const inner = (
                  <div className="flex gap-3 rounded-xl border border-white/10 p-4 transition hover:border-blue-500/40">
                    <span className="text-lg" aria-hidden="true">
                      {rec.icon}
                    </span>
                    <p className="text-sm text-slate-300">{rec.text}</p>
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

          {/* Estado del pipeline */}
          <Card title="📊 Estado del pipeline">
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
            <p className="mt-5 border-t border-white/10 pt-4 text-sm text-slate-400">
              Valor potencial del pipeline
            </p>
            <p className="text-2xl font-bold text-blue-400">
              {formatUSD(DEMO_METRICS.pipelineValueUSD)}
            </p>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Ranking de propiedades */}
          <Card title="🏆 Ranking de propiedades">
            <div className="space-y-3">
              {topProperties.map((p, i) => (
                <Link
                  key={p.id}
                  href="/demo/properties"
                  className="flex items-center justify-between rounded-xl border border-white/10 p-4 transition hover:border-blue-500/40"
                >
                  <div>
                    <p className="font-semibold">
                      {i === 0 ? "🥇 " : ""}
                      {p.title}
                    </p>
                    <p className="text-sm text-slate-400">
                      {p.zone} · {formatUSD(p.priceUSD)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-blue-400">
                    {p.interested} interesados
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Ranking de agentes */}
          <Card title="👥 Ranking de agentes">
            <div className="space-y-4">
              {topAgents.map((a, i) => (
                <div key={a.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      {i === 0 ? "🥇 " : ""}
                      {a.name}
                    </span>
                    <span className="text-slate-400">
                      {a.conversions} cierres · {formatUSD(a.potentialValueUSD)}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${Math.round((a.conversions / maxConversions) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Actividad reciente */}
          <Card title="🕐 Actividad reciente">
            <div className="space-y-3">
              {recentActivity.map((a) => (
                <Link
                  key={a.id}
                  href={`/demo/leads/${a.leadId}`}
                  className="block rounded-xl border border-white/10 p-4 transition hover:border-blue-500/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-400">
                      {a.channel} · {a.leadName}
                    </span>
                    <span className="text-xs text-slate-500">{a.date}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{a.message}</p>
                </Link>
              ))}
            </div>
          </Card>

          {/* Estado de implementación */}
          <Card title="✅ Estado de implementación">
            <p className="text-sm text-slate-400">
              {doneSteps} de {implementationSteps.length} etapas completadas
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.round((doneSteps / implementationSteps.length) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-5 space-y-3">
              {implementationSteps.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className={
                      s.done ? "text-green-400" : "text-slate-600"
                    }
                    aria-hidden="true"
                  >
                    {s.done ? "✓" : "○"}
                  </span>
                  <span
                    className={s.done ? "text-slate-200" : "text-slate-500"}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
