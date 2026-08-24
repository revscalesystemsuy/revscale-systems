import Link from "next/link"
import { ArrowUpRight, Award, Building2, ClipboardList } from "lucide-react"
import {
  DEMO_METRICS,
  DEMO_AGENTS,
  DEMO_PROPERTIES,
  DEMO_AI_RECOMMENDATIONS,
  DEMO_COMPANY,
  formatUSD,
} from "@/lib/demo-data"
import { PageHeader, MetricCard, Card } from "../demo-ui"

function TitleWithIcon({ icon: Icon, children }: { icon: typeof Award; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]">
        <Icon size={15} strokeWidth={1.7} />
      </span>
      {children}
    </span>
  )
}

export default function DemoReportsPage() {
  const topAgent = [...DEMO_AGENTS].sort(
    (a, b) => b.conversions - a.conversions,
  )[0]
  const topProperty = [...DEMO_PROPERTIES].sort(
    (a, b) => b.interested - a.interested,
  )[0]

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Resumen ejecutivo"
          title="Reportes"
          subtitle={`Informe comercial de ${DEMO_COMPANY.name} · Últimos ${DEMO_COMPANY.months} meses`}
        />

        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ClipboardList size={18} strokeWidth={1.7} />
            Resumen comercial
          </h2>
          <p className="mt-3 text-slate-300">
            {DEMO_COMPANY.name} gestionó <b>{DEMO_METRICS.totalLeads}</b> leads
            este período, con <b>{DEMO_METRICS.hotLeads}</b> oportunidades
            calientes y <b>{DEMO_METRICS.activeOpportunities}</b> oportunidades
            activas. La tasa de conversión alcanzó el{" "}
            <b>{DEMO_METRICS.conversionRate}%</b> y el pipeline representa un
            valor potencial de <b>{formatUSD(DEMO_METRICS.pipelineValueUSD)}</b>.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Leads generados" value={DEMO_METRICS.totalLeads} />
          <MetricCard title="Oportunidades" value={DEMO_METRICS.activeOpportunities} />
          <MetricCard title="Conversión" value={`${DEMO_METRICS.conversionRate}%`} />
          <MetricCard title="Valor del pipeline" value={formatUSD(DEMO_METRICS.pipelineValueUSD)} />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card title={<TitleWithIcon icon={Award}>Agente destacado</TitleWithIcon>}>
            <p className="text-2xl font-bold">{topAgent.name}</p>
            <p className="mt-1 text-slate-400">{topAgent.role}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Cierres</p>
                <p className="text-xl font-bold">{topAgent.conversions}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Visitas</p>
                <p className="text-xl font-bold">{topAgent.visits}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Leads</p>
                <p className="text-xl font-bold">{topAgent.leadsAssigned}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Valor potencial:{" "}
              <span className="font-semibold text-green-400">
                {formatUSD(topAgent.potentialValueUSD)}
              </span>
            </p>
          </Card>

          <Card title={<TitleWithIcon icon={Building2}>Propiedad más demandada</TitleWithIcon>}>
            <p className="text-2xl font-bold">{topProperty.title}</p>
            <p className="mt-1 text-slate-400">
              {topProperty.zone} · {formatUSD(topProperty.priceUSD)}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Interesados</p>
                <p className="text-xl font-bold">{topProperty.interested}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Matches</p>
                <p className="text-xl font-bold">{topProperty.matches}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Demanda</p>
                <p className="text-xl font-bold text-blue-400">{topProperty.demand}</p>
              </div>
            </div>
          </Card>
        </section>

        <Card title={<TitleWithIcon icon={ArrowUpRight}>Siguientes acciones</TitleWithIcon>} className="mt-6">
          <div className="space-y-3">
            {DEMO_AI_RECOMMENDATIONS.map((rec) => {
              const inner = (
                <div className="flex gap-3 rounded-xl border border-white/10 p-4 transition hover:border-blue-500/40">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]">
                    <ArrowUpRight size={14} strokeWidth={1.7} />
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
      </div>
    </div>
  )
}
