import Link from "next/link"
import { ArrowUpRight, Award, Building2, ClipboardList } from "lucide-react"
import { DEMO_METRICS, DEMO_AGENTS, DEMO_PROPERTIES, DEMO_AI_RECOMMENDATIONS, DEMO_COMPANY, DEMO_LEADS, formatUSD } from "@/lib/demo-data"
import { getDemoSla } from "@/lib/demo-sla-data"
import { PageHeader, MetricCard, Card } from "../demo-ui"

function TitleWithIcon({ icon: Icon, children }: { icon: typeof Award; children: string }) {
  return <span className="inline-flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><Icon size={15} strokeWidth={1.7} /></span>{children}</span>
}

export default function DemoReportsPage() {
  const topAgent = [...DEMO_AGENTS].sort((a, b) => b.conversions - a.conversions)[0]
  const topProperty = [...DEMO_PROPERTIES].sort((a, b) => b.interested - a.interested)[0]
  const slaRows = DEMO_LEADS.map((lead) => getDemoSla(lead.id))
  const answered = slaRows.filter((item) => item.firstHumanResponseMinutes !== null)
  const values = answered.map((item) => item.firstHumanResponseMinutes as number).sort((a,b)=>a-b)
  const mean = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
  const median = values.length ? values.length % 2 ? values[Math.floor(values.length / 2)] : Math.round((values[values.length / 2 - 1] + values[values.length / 2]) / 2) : 0
  const within = answered.filter((item) => (item.firstHumanResponseMinutes as number) <= item.slaMinutes).length
  const breached = answered.length - within
  const unanswered = slaRows.filter((item) => item.firstHumanResponseMinutes === null).length
  const compliance = answered.length ? Math.round((within / answered.length) * 100) : 0

  const sourceGroups = Array.from(new Set(slaRows.map((item) => item.sourceProvider))).map((source) => {
    const group = slaRows.filter((item) => item.sourceProvider === source)
    const resolved = group.filter((item) => item.firstHumanResponseMinutes !== null)
    const ok = resolved.filter((item) => (item.firstHumanResponseMinutes as number) <= item.slaMinutes).length
    return { source, total: group.length, pct: resolved.length ? Math.round((ok / resolved.length) * 100) : 0 }
  }).sort((a,b)=>b.total-a.total)

  return (
    <div className="p-6 md:p-8"><div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Resumen ejecutivo" title="Reportes" subtitle={`Informe comercial de ${DEMO_COMPANY.name} · Últimos ${DEMO_COMPANY.months} meses · atribución y SLA incluidos`} />
      <section className="rounded-2xl border border-[#cdbfa9] bg-[#e9dfd0] p-6"><h2 className="flex items-center gap-2 text-xl font-bold text-[#302c25]"><ClipboardList size={18} strokeWidth={1.7} />Resumen comercial</h2><p className="mt-3 text-[#514b43]">{DEMO_COMPANY.name} gestionó <b>{DEMO_METRICS.totalLeads}</b> leads, con <b>{DEMO_METRICS.hotLeads}</b> oportunidades calientes y <b>{DEMO_METRICS.activeOpportunities}</b> oportunidades activas. La conversión alcanzó <b>{DEMO_METRICS.conversionRate}%</b>, el pipeline representa <b>{formatUSD(DEMO_METRICS.pipelineValueUSD)}</b> y el cumplimiento de primera respuesta humana fue <b>{compliance}%</b>.</p></section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard title="Leads generados" value={DEMO_METRICS.totalLeads} /><MetricCard title="Conversión" value={`${DEMO_METRICS.conversionRate}%`} /><MetricCard title="Cumplimiento SLA" value={`${compliance}%`} /><MetricCard title="Mediana respuesta" value={`${median} min`} /></section>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard title="Media respuesta" value={`${mean} min`} /><MetricCard title="Fuera SLA" value={breached} /><MetricCard title="Sin respuesta humana" value={unanswered} /><MetricCard title="Valor del pipeline" value={formatUSD(DEMO_METRICS.pipelineValueUSD)} /></section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="SLA por origen"><div className="space-y-3">{sourceGroups.map((item) => <div key={item.source} className="flex items-center justify-between border-b border-[#ded2c2] pb-3"><div><p className="font-medium text-[#37332d]">{item.source}</p><p className="mt-1 text-xs text-[#81796e]">{item.total} leads</p></div><span className="font-serif text-2xl text-[#745f43]">{item.pct}%</span></div>)}</div></Card>
        <Card title={<TitleWithIcon icon={Award}>Agente destacado</TitleWithIcon>}><p className="text-2xl font-bold text-[#302c25]">{topAgent.name}</p><p className="mt-1 text-[#625b52]">{topAgent.role}</p><div className="mt-4 grid grid-cols-3 gap-3 text-center"><Mini label="Cierres" value={topAgent.conversions} /><Mini label="Visitas" value={topAgent.visits} /><Mini label="Leads" value={topAgent.leadsAssigned} /></div><p className="mt-4 text-sm text-[#625b52]">Valor potencial: <span className="font-semibold text-[#41634a]">{formatUSD(topAgent.potentialValueUSD)}</span></p></Card>
      </section>

      <Card title={<TitleWithIcon icon={Building2}>Propiedad más demandada</TitleWithIcon>} className="mt-6"><p className="text-2xl font-bold text-[#302c25]">{topProperty.title}</p><p className="mt-1 text-[#625b52]">{topProperty.zone} · {formatUSD(topProperty.priceUSD)}</p><div className="mt-4 grid grid-cols-3 gap-3 text-center"><Mini label="Interesados" value={topProperty.interested} /><Mini label="Matches" value={topProperty.matches} /><Mini label="Demanda" value={topProperty.demand} /></div></Card>

      <Card title={<TitleWithIcon icon={ArrowUpRight}>Siguientes acciones</TitleWithIcon>} className="mt-6"><div className="space-y-3">{DEMO_AI_RECOMMENDATIONS.map((rec) => { const inner = <div className="flex gap-3 rounded-xl border border-[#d6cbbb] p-4 transition hover:border-[#b9a88e]"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><ArrowUpRight size={14} strokeWidth={1.7} /></span><p className="text-sm text-[#514b43]">{rec.text}</p></div>; return rec.leadId ? <Link key={rec.id} href={`/demo/leads/${rec.leadId}`}>{inner}</Link> : <div key={rec.id}>{inner}</div> })}</div></Card>
    </div></div>
  )
}

function Mini({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl bg-[#efe6d9] p-3"><p className="text-xs text-[#625b52]">{label}</p><p className="text-xl font-bold text-[#302c25]">{value}</p></div> }
