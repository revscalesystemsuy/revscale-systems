import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin, Phone } from "lucide-react";
import { DEMO_LEADS, formatUSD, agentName, type Temperature } from "@/lib/demo-data";
import { demoSlaLabel, getDemoSla } from "@/lib/demo-sla-data";
import { PageHeader } from "../demo-ui";

const PRIORITY_LABEL: Record<Temperature, string> = { HOT: "Alta", WARM: "Media", COLD: "Baja" };
function priorityStyle(priority: Temperature) { if (priority === "HOT") return "border-[#6f5d3f] bg-[#2a241b] text-[#dfc99f]"; if (priority === "WARM") return "border-[#49443a] bg-[#211f1b] text-[#b9b1a4]"; return "border-[#38352f] bg-[#1d1c19] text-[#817c74]"; }

export default function DemoLeadsPage() {
  const leads = [...DEMO_LEADS].sort((a, b) => b.score - a.score);
  const highPriority = leads.filter((lead) => lead.temperature === "HOT").length;
  const inDecision = leads.filter((lead) => lead.stage === "Visita" || lead.stage === "Negociación").length;
  const portfolioValue = leads.reduce((sum, lead) => sum + lead.budgetUSD, 0);
  const breached = leads.filter((lead) => { const s = getDemoSla(lead.id); return s.firstHumanResponseMinutes === null || s.firstHumanResponseMinutes > s.slaMinutes; }).length;

  return (
    <div className="p-5 md:p-8 lg:p-10"><div className="mx-auto max-w-[1550px]">
      <PageHeader eyebrow="Base comercial" title="Leads" subtitle="Compradores activos, origen y velocidad comercial de Inmobiliaria Horizonte." action={<div className="grid grid-cols-4 overflow-hidden rounded-xl border border-[#353229] bg-[#1b1a17]"><Stat label="Contactos" value={leads.length} /><Stat label="Prioridad alta" value={highPriority} /><Stat label="En decisión" value={inDecision} /><Stat label="Fuera SLA" value={breached} /></div>} />

      <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#353229] bg-[#1b1a17] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77736b]">Demanda representada</p><p className="mt-1 font-serif text-2xl text-[#efe8dc]">{formatUSD(portfolioValue)}</p></div><p className="max-w-2xl text-xs leading-5 text-[#858078]">Escenario demo: fuentes Web, InfoCasas, Mercado Libre, Meta e Instagram con respuestas rápidas, tardías y casos aún sin respuesta humana. SLA objetivo: 15 minutos.</p></section>

      <section className="overflow-hidden rounded-xl border border-[#353229] bg-[#1b1a17]"><div className="overflow-x-auto"><table className="w-full min-w-[1450px] text-left"><thead><tr className="border-b border-[#353229] bg-[#1d1c19] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#77736b]"><th className="px-5 py-4">Contacto</th><th className="px-5">Búsqueda</th><th className="px-5">Presupuesto</th><th className="px-5">Etapa</th><th className="px-5">Prioridad</th><th className="px-5">Origen</th><th className="px-5">SLA</th><th className="px-5">Agente</th><th className="px-5">Próxima acción</th></tr></thead><tbody>
        {leads.map((lead) => { const source = getDemoSla(lead.id); const missed = source.firstHumanResponseMinutes === null || source.firstHumanResponseMinutes > source.slaMinutes; return <tr key={lead.id} className="group border-b border-[#302e28] transition last:border-b-0 hover:bg-[#201e1a]">
          <td className="px-5 py-5 align-top"><Link href={`/demo/leads/${lead.id}`} className="inline-flex items-center gap-1.5 font-medium text-[#eee7dc] transition hover:text-[#d5bd90]">{lead.fullName}<ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-70" /></Link><p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#77736b]"><Phone className="h-3 w-3" />{lead.phone}</p></td>
          <td className="px-5 py-5 align-top"><p className="flex items-center gap-1.5 text-sm text-[#b9b2a7]"><MapPin className="h-3.5 w-3.5 text-[#8f826e]" />{lead.zone}</p><p className="mt-1.5 text-xs text-[#77736b]">{lead.propertyType} · {lead.bedrooms} dorm.</p></td>
          <td className="px-5 py-5 align-top"><p className="font-serif text-lg text-[#e9e2d7]">{formatUSD(lead.budgetUSD)}</p></td>
          <td className="px-5 py-5 align-top"><span className="text-sm text-[#a8a198]">{lead.stage}</span></td>
          <td className="px-5 py-5 align-top"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${priorityStyle(lead.temperature)}`}>{PRIORITY_LABEL[lead.temperature]}</span></td>
          <td className="px-5 py-5 align-top"><p className="text-sm text-[#c6bcae]">{source.sourceProvider}</p><p className="mt-1 text-[11px] text-[#706b64]">{source.sourceCampaign}</p></td>
          <td className="px-5 py-5 align-top"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${missed ? "border-[#684d42] bg-[#2a201d] text-[#d0a58f]" : "border-[#4d5545] bg-[#20251e] text-[#aebb9d]"}`}><Clock3 className="h-3 w-3" />{demoSlaLabel(lead.id)}</span>{source.firstAiResponseMinutes !== null && <p className="mt-2 text-[11px] text-[#706b64]">IA: {source.firstAiResponseMinutes} min</p>}</td>
          <td className="px-5 py-5 align-top text-sm text-[#918c84]">{agentName(lead.assignedAgentId)}</td>
          <td className="max-w-[290px] px-5 py-5 align-top"><Link href={`/demo/leads/${lead.id}`} className="text-sm leading-5 text-[#a9a298] transition hover:text-[#d7c5a4]">{lead.nextAction}</Link><p className="mt-2 text-[11px] text-[#69655f]">Último contacto: {lead.lastInteraction}</p></td>
        </tr>; })}
      </tbody></table></div></section>
    </div></div>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="border-l border-[#353229] px-4 py-3 first:border-l-0 md:px-5"><p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#77736b]">{label}</p><p className="mt-1 font-serif text-xl text-[#f2ebdf] md:text-2xl">{value}</p></div>; }
