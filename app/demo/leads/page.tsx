import Link from "next/link"
import {
  DEMO_LEADS,
  formatUSD,
  temperatureBadge,
  agentName,
} from "@/lib/demo-data"
import { PageHeader } from "../demo-ui"

export default function DemoLeadsPage() {
  const leads = [...DEMO_LEADS].sort((a, b) => b.score - a.score)
  const hotCount = leads.filter((l) => l.temperature === "HOT").length

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Base comercial"
          title="Leads"
          subtitle="Todos los leads comerciales de Inmobiliaria Horizonte."
          action={
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 px-5 py-3">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3">
                <p className="text-xs text-blue-400">HOT</p>
                <p className="text-2xl font-bold text-blue-400">{hotCount}</p>
              </div>
            </div>
          }
        />

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-4">Lead</th>
                  <th className="p-4">Zona</th>
                  <th className="p-4">Tipo / Dorm.</th>
                  <th className="p-4">Presupuesto</th>
                  <th className="p-4">Temperatura</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Agente</th>
                  <th className="p-4">Próxima acción</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-white/5 transition hover:bg-white/[0.03] ${
                      lead.temperature === "HOT" ? "bg-blue-500/[0.04]" : ""
                    }`}
                  >
                    <td className="p-4">
                      <Link
                        href={`/demo/leads/${lead.id}`}
                        className="font-semibold hover:text-blue-400"
                      >
                        {lead.temperature === "HOT" ? "🔥 " : ""}
                        {lead.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">{lead.phone}</p>
                    </td>
                    <td className="p-4 text-slate-300">{lead.zone}</td>
                    <td className="p-4 text-slate-300">
                      {lead.propertyType} · {lead.bedrooms} dorm.
                    </td>
                    <td className="p-4 text-slate-300">
                      {formatUSD(lead.budgetUSD)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${temperatureBadge(
                          lead.temperature,
                        )}`}
                      >
                        {lead.temperature}
                      </span>
                    </td>
                    <td className="p-4 font-bold">{lead.score}</td>
                    <td className="p-4 text-slate-400">
                      {agentName(lead.assignedAgentId)}
                    </td>
                    <td className="p-4 text-slate-400">{lead.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
