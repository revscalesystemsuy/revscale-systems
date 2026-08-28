import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  Home,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react"
import {
  getLead,
  getMatchesForLead,
  interactionsForLead,
  DEMO_FOLLOWUPS,
  formatUSD,
  agentName,
} from "@/lib/demo-data"
import { Card, MetricCard, PageHeader } from "../../demo-ui"
import { DemoWhatsAppButton } from "./DemoWhatsAppButton"

function temperatureStyle(value: string) {
  if (value === "HOT") return "border-[#b99170] bg-[#ead9ca] text-[#6c4935]"
  if (value === "WARM") return "border-[#c6ad7b] bg-[#eee3cc] text-[#6b5936]"
  return "border-[#b7b3aa] bg-[#ece9e3] text-[#5d5952]"
}

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
  const conversion = lead.score >= 90 ? "Muy alta" : lead.score >= 75 ? "Alta" : "Media"

  return (
    <main className="min-h-screen bg-[#eee5d7] p-6 text-[#292722] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/demo/leads"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f5c40] transition hover:text-[#463b2c]"
        >
          <ArrowLeft size={15} strokeWidth={1.7} /> Volver a leads
        </Link>

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <PageHeader
            eyebrow="Centro comercial del lead"
            title={lead.fullName}
            subtitle={`Detalle del cliente potencial · Agente: ${agentName(lead.assignedAgentId)}`}
          />
          <span className={`inline-flex w-fit rounded-full border px-3 py-2 text-xs font-semibold ${temperatureStyle(lead.temperature)}`}>
            Prioridad {lead.temperature}
          </span>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Score comercial" value={`${lead.score}/100`} hint="Afinidad e intención comercial" />
          <MetricCard title="Presupuesto" value={formatUSD(lead.budgetUSD)} hint="Presupuesto informado" />
          <MetricCard title="Etapa" value={lead.stage} hint="Estado actual del pipeline" />
          <MetricCard title="Conversión" value={conversion} hint="Estimación comercial" />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card title={<span className="inline-flex items-center gap-2"><UserRound size={18} strokeWidth={1.7} />Información</span>}>
            <div className="space-y-3 text-sm text-[#4f4941]">
              <p className="flex items-center gap-2"><Phone size={15} strokeWidth={1.7} className="text-[#786448]" />{lead.phone}</p>
              <p className="flex items-center gap-2"><Mail size={15} strokeWidth={1.7} className="text-[#786448]" />{lead.email}</p>
              <p><strong className="text-[#3e3932]">Operación:</strong> {lead.operation}</p>
              <p><strong className="text-[#3e3932]">Última interacción:</strong> {lead.lastInteraction}</p>
              <p><strong className="text-[#3e3932]">Estado:</strong> {lead.status}</p>
            </div>
            <DemoWhatsAppButton
              leadName={lead.fullName}
              phone={lead.phone}
              message={`Se prepararía un WhatsApp para ${lead.fullName} sobre propiedades en ${lead.zone}.`}
            />
          </Card>

          <Card title={<span className="inline-flex items-center gap-2"><Home size={18} strokeWidth={1.7} />Preferencias</span>}>
            <div className="space-y-3 text-sm text-[#4f4941]">
              <p><strong className="text-[#3e3932]">Tipo:</strong> {lead.propertyType}</p>
              <p className="flex items-center gap-2"><MapPin size={15} strokeWidth={1.7} className="text-[#786448]" />{lead.zone}</p>
              <p><strong className="text-[#3e3932]">Dormitorios:</strong> {lead.bedrooms}</p>
              <p><strong className="text-[#3e3932]">Presupuesto:</strong> {formatUSD(lead.budgetUSD)}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {lead.features.map((feature) => (
                <span key={feature} className="rounded-full border border-[#d1c4b2] bg-[#eee4d5] px-3 py-1 text-xs text-[#5f584f]">
                  {feature}
                </span>
              ))}
            </div>
          </Card>
        </section>

        <section id="matching" className="mt-6 scroll-mt-6 rounded-2xl border border-[#cdbfa9] bg-[#f2eadf] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} strokeWidth={1.7} className="text-[#725d40]" />
              <h2 className="font-serif text-xl font-medium text-[#302c25]">Matching inteligente</h2>
            </div>
            <span className="rounded-full border border-[#c5b393] bg-[#e9ddcb] px-3 py-1 text-xs font-semibold text-[#66523a]">
              {matches.length} propiedades compatibles
            </span>
          </div>

          <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
            <Insight label="Lead" value={lead.fullName} />
            <Insight label="Necesidad" value={`${lead.propertyType} en ${lead.zone}, ${lead.bedrooms} dorm., hasta ${formatUSD(lead.budgetUSD)}`} />
            <Insight label="Conversión" value={conversion} />
            <Insight label="Acción recomendada" value={bestMatch ? `Contactar hoy y enviar ${bestMatch.property.title}.` : lead.nextAction} />
          </div>

          <div className="mt-5 space-y-4">
            {matches.map((match) => (
              <div key={match.property.id} className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#37332d]">{match.property.title}</p>
                    <p className="mt-1 text-sm text-[#625d55]">
                      {match.property.zone} · {formatUSD(match.property.priceUSD)} · {match.property.bedrooms} dorm.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#bca581] bg-[#eee0cb] px-3 py-1.5 text-sm font-bold text-[#665036]">
                    {match.percent}% match
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e0d5c6]">
                  <div className="h-full rounded-full bg-[#8d7654]" style={{ width: `${match.percent}%` }} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {match.reasons.map((reason) => (
                    <span key={reason} className="rounded-full border border-[#bec8b7] bg-[#edf2e9] px-3 py-1 text-xs text-[#4e5d47]">
                      {reason}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/demo/properties" className="rounded-lg border border-[#bfae96] bg-[#eee4d5] px-4 py-2 text-sm font-semibold text-[#554f47] transition hover:bg-[#e5d9c8]">
                    Ver propiedad
                  </Link>
                  <div className="min-w-[200px] flex-1">
                    <DemoWhatsAppButton
                      leadName={lead.fullName}
                      phone={lead.phone}
                      label={`Enviar ${match.property.title}`}
                      message={`Se enviaría ${match.property.title} (${match.percent}% match) a ${lead.fullName} por WhatsApp.`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card title="Historial de interacciones">
            {!interactions.length && <p className="text-sm text-[#625d55]">Todavía no hay interacciones.</p>}
            <div className="space-y-3">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#6f5c40]">{interaction.channel} · {interaction.direction}</span>
                    <span className="text-xs text-[#6c655c]">{interaction.date}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4f4941]">{interaction.message}</p>
                  <p className="mt-2 text-xs text-[#6c655c]">Por {interaction.actor}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-5">
            <Card title={<span className="inline-flex items-center gap-2"><Target size={18} strokeWidth={1.7} />Próxima acción recomendada</span>}>
              <div className="rounded-xl border border-[#cdbfa9] bg-[#eee4d5] p-4">
                <p className="text-sm leading-6 text-[#463f36]">{lead.nextAction}</p>
              </div>
            </Card>

            <Card title={<span className="inline-flex items-center gap-2"><CalendarClock size={18} strokeWidth={1.7} />Seguimientos</span>}>
              {!followups.length && <p className="text-sm text-[#625d55]">Sin seguimientos programados.</p>}
              <div className="space-y-3">
                {followups.map((followup) => (
                  <div key={followup.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#403b34]">{followup.type} · {followup.date}</span>
                      <span className="rounded-full border border-[#c9b99f] bg-[#eee4d5] px-2.5 py-0.5 text-xs font-semibold text-[#62584a]">{followup.priority}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#4f4941]">{followup.action}</p>
                    <p className="mt-1 text-xs text-[#6c655c]">{followup.agent}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6c655c]">{label}</p>
      <p className="mt-2 text-sm leading-5 text-[#403b34]">{value}</p>
    </div>
  )
}