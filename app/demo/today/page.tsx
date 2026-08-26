import Link from "next/link"
import { ArrowUpRight, Clock3 } from "lucide-react"
import { DEMO_FOLLOWUPS, DEMO_LEADS, formatUSD } from "@/lib/demo-data"
import { getDemoSla } from "@/lib/demo-sla-data"
import { DEMO_PLAN_CONFIG, demoHref, normalizeDemoPlan } from "@/lib/demo-plan"
import { MetricCard, PageHeader } from "../demo-ui"

export default async function DemoTodayPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  const config = DEMO_PLAN_CONFIG[plan]
  const priorities = [...DEMO_LEADS].sort((a, b) => b.score - a.score).slice(0, 6)
  const overdue = DEMO_FOLLOWUPS.filter((item) => item.bucket === "Vencido").length
  const highRisk = priorities.filter((lead) => lead.score >= 88).length
  const potential = priorities.reduce((sum, lead) => sum + lead.budgetUSD, 0)
  const slaQueue = DEMO_LEADS.map((lead) => ({ lead, sla: getDemoSla(lead.id) }))
    .filter(({ sla }) => sla.firstHumanResponseMinutes === null || sla.firstHumanResponseMinutes > sla.slaMinutes)
    .sort((a,b) => {
      if (a.sla.firstHumanResponseMinutes === null && b.sla.firstHumanResponseMinutes !== null) return -1
      if (b.sla.firstHumanResponseMinutes === null && a.sla.firstHumanResponseMinutes !== null) return 1
      return (b.sla.firstHumanResponseMinutes || 999) - (a.sla.firstHumanResponseMinutes || 999)
    })
    .slice(0, 6)

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
      <PageHeader eyebrow={`${config.label} · Operación diaria`} title="Qué hacer hoy" subtitle="Prioridades ordenadas por primera respuesta humana, seguimiento, intención, riesgo comercial y avance del pipeline. La demo replica la vista operativa del sistema real sin ejecutar acciones externas." action={<Link href={demoHref("/demo/calendar", plan)} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#554f47]">Ver calendario de cierres</Link>} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><MetricCard title="Acciones priorizadas" value={priorities.length} /><MetricCard title="Fuera SLA" value={slaQueue.length} /><MetricCard title="Riesgo alto" value={highRisk} /><MetricCard title="Seguimientos vencidos" value={overdue} /><MetricCard title="Valor bajo atención" value={formatUSD(potential)} /></section>

      <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#efe3d3] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80694b]">Speed-to-lead demo</p><h2 className="mt-2 font-serif text-2xl font-medium text-[#37332d]">SLA que requiere atención</h2><p className="mt-2 text-sm text-[#81796e]">La IA puede responder antes, pero el SLA se cumple con la primera respuesta humana.</p></div><span className="rounded-full border border-[#cdbfa9] bg-[#fffaf2] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#705d43]">Objetivo 15 min</span></div>
        <div className="mt-5 space-y-3">{slaQueue.map(({ lead, sla }) => <article key={lead.id} className="rounded-xl border border-[#c9a69a] bg-[#fffaf2] p-4"><div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_140px_100px] lg:items-center"><div><Link href={demoHref(`/demo/leads/${lead.id}`, plan)} className="font-semibold text-[#37332d]">{lead.fullName}</Link><p className="mt-1 text-xs text-[#81796e]">{sla.sourceProvider} · {sla.sourceCampaign}</p></div><div><p className="text-xs uppercase tracking-[0.12em] text-[#81796e]">Respuesta humana</p><p className="mt-1 text-sm text-[#514b43]">{sla.firstHumanResponseMinutes === null ? "Sin respuesta" : `${sla.firstHumanResponseMinutes} min`}</p></div><span className="rounded-full border border-[#b88e75] bg-[#ead3c3] px-3 py-1 text-xs font-semibold text-[#6b4433]">Incumplido</span><Link href={demoHref(`/demo/leads/${lead.id}`, plan)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-3 py-2 text-xs font-semibold text-[#554f47]">Abrir <ArrowUpRight size={13}/></Link></div></article>)}</div>
      </section>

      <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-serif text-2xl font-medium text-[#37332d]">Prioridad comercial</h2><p className="mt-2 text-sm text-[#81796e]">Lo que el equipo debería resolver primero hoy.</p></div><span className="rounded-full border border-[#cdbfa9] bg-[#eee4d5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#705d43]">Datos de demostración</span></div>
        <div className="mt-5 space-y-3">{priorities.map((lead, index) => { const risk = lead.score >= 92 ? "Alto" : lead.score >= 84 ? "Medio" : "Bajo"; const riskClass = risk === "Alto" ? "border-[#b58d73] bg-[#ead8cb] text-[#6b4433]" : risk === "Medio" ? "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]" : "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]"; return <article key={lead.id} className="rounded-xl border border-[#d8ccbc] bg-[#fffaf2] p-5"><div className="grid gap-4 lg:grid-cols-[42px_1.1fr_1.6fr_120px_90px] lg:items-center"><span className="font-serif text-xl text-[#948978]">{String(index + 1).padStart(2, "0")}</span><div><Link href={demoHref(`/demo/leads/${lead.id}`, plan)} className="font-medium text-[#37332d] hover:text-[#725d40]">{lead.fullName}</Link><p className="mt-1 text-xs text-[#81796e]">{lead.stage} · {lead.temperature}</p></div><div><p className="font-medium text-[#403b34]">{lead.nextAction}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-[#81796e]"><Clock3 size={12} /> Último contacto: {lead.lastInteraction}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#81796e]">Afinidad</p><p className="mt-1 font-serif text-xl text-[#4b4238]">{lead.score}/100</p></div><span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${riskClass}`}>{risk}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e0d6c8] pt-4"><p className="text-xs text-[#81796e]">Presupuesto {formatUSD(lead.budgetUSD)} · {lead.zone}</p><Link href={demoHref(`/demo/leads/${lead.id}`, plan)} className="inline-flex items-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-3 py-2 text-xs font-semibold text-[#554f47]">Abrir ficha <ArrowUpRight size={13} /></Link></div></article> })}</div>
      </section>
    </div></main>
  )
}
