import { Award } from "lucide-react"
import { DEMO_AGENTS, DEMO_LEADS, formatUSD } from "@/lib/demo-data"
import { getDemoSla } from "@/lib/demo-sla-data"
import { DEMO_PLAN_CONFIG, normalizeDemoPlan } from "@/lib/demo-plan"
import { PageHeader } from "../demo-ui"

export default async function DemoAgentsPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  const config = DEMO_PLAN_CONFIG[plan]
  const agents = [...DEMO_AGENTS].sort((a, b) => b.conversions - a.conversions).slice(0, Math.min(config.maxAgents, DEMO_AGENTS.length))

  return (
    <div className="p-6 md:p-8"><div className="mx-auto max-w-7xl">
      <PageHeader eyebrow={`${config.label} · Equipo comercial`} title="Agentes" subtitle={`Rendimiento del equipo comercial, incluyendo primera respuesta humana. Este plan admite hasta ${config.maxAgents} agentes.`} />
      <div className="mb-6 rounded-xl border border-[#d6cbbb] bg-[#efe6d9] px-5 py-4 text-sm text-[#625d55]">Demo {config.label}: {agents.length} agentes de ejemplo · SLA objetivo 15 minutos · cada agente ve su rendimiento individual; Gerencia y Dirección ven el alcance correspondiente.</div>

      <section className="grid gap-5 md:grid-cols-2">
        {agents.map((agent, i) => {
          const assigned = DEMO_LEADS.filter((lead) => lead.assignedAgentId === agent.id)
          const slaRows = assigned.map((lead) => getDemoSla(lead.id))
          const answered = slaRows.filter((item) => item.firstHumanResponseMinutes !== null)
          const within = answered.filter((item) => (item.firstHumanResponseMinutes as number) <= item.slaMinutes).length
          const pct = answered.length ? Math.round((within / answered.length) * 100) : 0
          const values = answered.map((item) => item.firstHumanResponseMinutes as number).sort((a,b)=>a-b)
          const median = values.length ? values[Math.floor(values.length / 2)] : 0
          const breached = answered.length - within
          return (
            <div key={agent.id} className="rounded-2xl border border-[#d6cbbb] bg-[#f7f1e8] p-6">
              <div className="flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-xl font-bold text-[#302c25]">{i === 0 && <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><Award size={15} strokeWidth={1.7} /></span>}{agent.name}</h2><span className="mt-2 inline-block rounded-full bg-[#e9dfd0] px-3 py-1 text-xs font-semibold text-[#745f43]">{agent.role}</span></div><div className="text-right"><p className="text-xs text-[#625b52]">Ranking</p><p className="text-2xl font-bold text-[#745f43]">#{i + 1}</p></div></div>
              <div className="mt-6 grid grid-cols-3 gap-3"><Stat label="Leads" value={agent.leadsAssigned} /><Stat label="HOT" value={agent.hotLeads} /><Stat label="Interacciones" value={agent.interactions} /><Stat label="Visitas" value={agent.visits} /><Stat label="Oportunidades" value={agent.opportunities} /><Stat label="Conversiones" value={agent.conversions} /></div>
              <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-[#ded2c2] bg-[#fffaf2] p-3"><Stat label="SLA" value={`${pct}%`} /><Stat label="Mediana" value={`${median} min`} /><Stat label="Fuera SLA" value={breached} /></div>
              <div className="mt-5 border-t border-[#ded2c2] pt-4"><p className="text-xs text-[#625b52]">Valor potencial</p><p className="text-xl font-bold text-[#41634a]">{formatUSD(agent.potentialValueUSD)}</p></div>
            </div>
          )
        })}
      </section>
    </div></div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl bg-[#efe6d9] p-3 text-center"><p className="text-xs text-[#625b52]">{label}</p><p className="mt-1 text-xl font-bold text-[#302c25]">{value}</p></div> }
