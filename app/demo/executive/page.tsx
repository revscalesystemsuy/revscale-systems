import { DEMO_AGENTS, DEMO_LEADS, DEMO_METRICS, formatUSD } from "@/lib/demo-data"
import { getDemoSla } from "@/lib/demo-sla-data"
import { normalizeDemoPlan } from "@/lib/demo-plan"
import { Card, MetricCard, PageHeader } from "../demo-ui"

export default async function DemoExecutivePage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  normalizeDemoPlan(params.plan)
  const top = [...DEMO_AGENTS].sort((a,b)=>b.conversions-a.conversions).slice(0,3)
  const slaRows = DEMO_LEADS.map((lead) => getDemoSla(lead.id))
  const answered = slaRows.filter((item) => item.firstHumanResponseMinutes !== null)
  const within = answered.filter((item) => (item.firstHumanResponseMinutes as number) <= item.slaMinutes).length
  const breached = answered.filter((item) => (item.firstHumanResponseMinutes as number) > item.slaMinutes).length
  const unanswered = slaRows.filter((item) => item.firstHumanResponseMinutes === null).length
  const compliance = answered.length ? Math.round((within / answered.length) * 100) : 0
  const sortedResponse = answered.map((item) => item.firstHumanResponseMinutes as number).sort((a,b)=>a-b)
  const median = sortedResponse.length ? sortedResponse[Math.floor(sortedResponse.length / 2)] : 0

  const sourcePerformance = Array.from(new Set(slaRows.map((item) => item.sourceProvider))).map((source) => {
    const group = slaRows.filter((item) => item.sourceProvider === source)
    const resolved = group.filter((item) => item.firstHumanResponseMinutes !== null)
    const ok = resolved.filter((item) => (item.firstHumanResponseMinutes as number) <= item.slaMinutes).length
    return { source, total: group.length, pct: resolved.length ? Math.round((ok / resolved.length) * 100) : 0 }
  }).sort((a,b)=>a.pct-b.pct || b.total-a.total).slice(0,3)

  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl"><PageHeader eyebrow="Dirección" title="Control ejecutivo" subtitle="Vista de Director para revisar salud comercial, valor del pipeline, velocidad de respuesta y señales que requieren decisiones de gestión." />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard title="Pipeline" value={formatUSD(DEMO_METRICS.pipelineValueUSD)}/><MetricCard title="Conversión" value={`${DEMO_METRICS.conversionRate}%`}/><MetricCard title="Cumplimiento SLA" value={`${compliance}%`}/><MetricCard title="Mediana respuesta" value={`${median} min`}/></section>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard title="Leads HOT" value={DEMO_METRICS.hotLeads}/><MetricCard title="Oportunidades" value={DEMO_METRICS.activeOpportunities}/><MetricCard title="Fuera SLA" value={breached}/><MetricCard title="Sin respuesta humana" value={unanswered}/></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card title="Señales de dirección"><div className="space-y-3">{[`${breached} respuestas humanas quedaron fuera del SLA de 15 minutos`,`${unanswered} leads siguen sin respuesta humana`,"2 cierres previstos superan los USD 250.000","Pocitos concentra la mayor demanda activa"].map((x,i)=><div key={x} className="rounded-xl border border-[#ded2c2] bg-[#fffaf2] p-4"><p className="text-xs uppercase tracking-[0.12em] text-[#8d7553]">Señal {i+1}</p><p className="mt-2 text-sm text-[#514b43]">{x}</p></div>)}</div></Card><Card title="Orígenes con menor SLA"><div className="space-y-4">{sourcePerformance.map((item)=><div key={item.source} className="flex items-center justify-between border-b border-[#ded2c2] pb-4 last:border-0 last:pb-0"><div><p className="font-medium text-[#37332d]">{item.source}</p><p className="mt-1 text-xs text-[#81796e]">{item.total} leads</p></div><p className="font-serif text-2xl text-[#745f43]">{item.pct}%</p></div>)}</div></Card></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card title="Rendimiento destacado"><div className="space-y-4">{top.map((a,i)=><div key={a.id} className="flex items-center justify-between border-b border-[#ded2c2] pb-4 last:border-0 last:pb-0"><div><p className="font-medium text-[#37332d]">{i+1}. {a.name}</p><p className="mt-1 text-xs text-[#81796e]">{a.leadsAssigned} leads · {a.visits} visitas</p></div><p className="font-serif text-2xl text-[#745f43]">{a.conversions}</p></div>)}</div></Card><Card title="Cartera en foco"><div className="grid gap-3">{DEMO_LEADS.slice(0,3).map((lead)=><div key={lead.id} className="rounded-xl border border-[#ded2c2] bg-[#fffaf2] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-[#37332d]">{lead.fullName}</p><p className="mt-2 text-sm text-[#625d55]">{lead.stage} · {getDemoSla(lead.id).sourceProvider}</p></div><span className="text-xs font-semibold text-[#745f43]">{getDemoSla(lead.id).firstHumanResponseMinutes === null ? "Sin respuesta" : `${getDemoSla(lead.id).firstHumanResponseMinutes} min`}</span></div><p className="mt-2 font-serif text-xl text-[#745f43]">{formatUSD(lead.budgetUSD)}</p></div>)}</div></Card></div>
  </div></main>
}
