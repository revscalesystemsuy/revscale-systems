import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getLead,
  getMatchesForLead,
  interactionsForLead,
  DEMO_FOLLOWUPS,
  formatUSD,
  temperatureBadge,
  agentName,
} from "@/lib/demo-data"
import { Card } from "../../demo-ui"
import { DemoWhatsAppButton } from "./DemoWhatsAppButton"

export default async function DemoLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lead = getLead(id)
  if (!lead) notFound()

  const matches = getMatchesForLead(lead.id)
  const interactions = interactionsForLead(lead.id)
  const followups = DEMO_FOLLOWUPS.filter((f) => f.leadId === lead.id)
  const bestMatch = matches[0]

  const conversion =
    lead.score >= 90 ? "Muy alta" : lead.score >= 75 ? "Alta" : "Media"

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/demo/leads"
          className="text-sm font-medium text-blue-400"
        >
          ← Leads
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{lead.fullName}</h1>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${temperatureBadge(
              lead.temperature,
            )}`}
          >
            {lead.temperature}
          </span>
        </div>
        <p className="mt-2 text-slate-400">
          Detalle del cliente potencial · Agente: {agentName(lead.assignedAgentId)}
        </p>

        {/* Resumen destacado */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm text-slate-400">Score comercial</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {lead.score}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">Presupuesto</p>
            <p className="mt-2 text-2xl font-bold">
              {formatUSD(lead.budgetUSD)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">Etapa</p>
            <p className="mt-2 text-2xl font-bold">{lead.stage}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">Prob. de conversión</p>
            <p className="mt-2 text-2xl font-bold text-green-400">
              {conversion}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card title="👤 Información">
            <div className="space-y-2 text-slate-300">
              <p>📞 {lead.phone}</p>
              <p>✉️ {lead.email}</p>
              <p>Operación: {lead.operation}</p>
              <p>Última interacción: {lead.lastInteraction}</p>
              <p>Estado: {lead.status}</p>
            </div>
            <DemoWhatsAppButton
              leadName={lead.fullName}
              phone={lead.phone}
              message={`Se prepararía un WhatsApp para ${lead.fullName} sobre propiedades en ${lead.zone}.`}
            />
          </Card>

          <Card title="🏠 Preferencias">
            <div className="space-y-2 text-slate-300">
              <p>Tipo: {lead.propertyType}</p>
              <p>Zona preferida: {lead.zone}</p>
              <p>Dormitorios: {lead.bedrooms}</p>
              <p>Presupuesto: {formatUSD(lead.budgetUSD)}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {lead.features.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300"
                >
                  {f}
                </span>
              ))}
            </div>
          </Card>
        </section>

        {/* MATCHING IA */}
        <section className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">🤖 Matching IA</h2>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
              {matches.length} propiedades compatibles
            </span>
          </div>

          {/* Flujo: Lead → Necesidad → Propiedades → Acción */}
          <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Lead
              </p>
              <p className="mt-1 font-semibold">{lead.fullName}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Necesidad
              </p>
              <p className="mt-1 text-slate-300">
                {lead.propertyType} en {lead.zone}, {lead.bedrooms} dorm., hasta{" "}
                {formatUSD(lead.budgetUSD)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Prob. de conversión
              </p>
              <p className="mt-1 font-semibold text-green-400">{conversion}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Acción recomendada
              </p>
              <p className="mt-1 text-slate-300">
                {bestMatch
                  ? `Contactar hoy y enviar ${bestMatch.property.title}.`
                  : lead.nextAction}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {matches.map((m) => (
              <div
                key={m.property.id}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.property.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      📍 {m.property.zone} · {formatUSD(m.property.priceUSD)} ·{" "}
                      {m.property.bedrooms} dorm.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-sm font-bold text-blue-400">
                    {m.percent}% Match
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${m.percent}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {m.reasons.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-300"
                    >
                      ✓ {r}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/demo/properties"
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/10"
                  >
                    Ver propiedad
                  </Link>
                  <div className="min-w-[200px] flex-1">
                    <DemoWhatsAppButton
                      leadName={lead.fullName}
                      phone={lead.phone}
                      label={`Enviar ${m.property.title}`}
                      message={`Se enviaría ${m.property.title} (${m.percent}% match) a ${lead.fullName} por WhatsApp.`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Historial de interacciones */}
          <Card title="📞 Historial de interacciones">
            {!interactions.length && (
              <p className="text-slate-400">Todavía no hay interacciones.</p>
            )}
            <div className="space-y-4">
              {interactions.map((i) => (
                <div
                  key={i.id}
                  className="rounded-xl border border-white/10 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-400">
                      {i.channel} · {i.direction}
                    </span>
                    <span className="text-xs text-slate-500">{i.date}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{i.message}</p>
                  <p className="mt-2 text-xs text-slate-500">Por {i.actor}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Follow-ups + acción IA */}
          <div className="space-y-5">
            <Card title="🎯 Próxima acción recomendada por IA">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="text-sm text-slate-200">{lead.nextAction}</p>
              </div>
            </Card>

            <Card title="📅 Follow-ups">
              {!followups.length && (
                <p className="text-slate-400">Sin follow-ups programados.</p>
              )}
              <div className="space-y-3">
                {followups.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {f.type} · {f.date}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          f.priority === "Alta"
                            ? "bg-red-500/10 text-red-400"
                            : f.priority === "Media"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {f.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{f.action}</p>
                    <p className="mt-1 text-xs text-slate-500">{f.agent}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
