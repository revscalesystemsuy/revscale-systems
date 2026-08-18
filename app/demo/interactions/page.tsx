import Link from "next/link"
import { DEMO_INTERACTIONS } from "@/lib/demo-data"
import { PageHeader, MetricCard } from "../demo-ui"

const CHANNEL_ICON: Record<string, string> = {
  WhatsApp: "💬",
  Llamada: "📞",
  Email: "✉️",
  Visita: "🏠",
  Nota: "📝",
  "Follow-up": "🔔",
}

export default function DemoInteractionsPage() {
  const byChannel = DEMO_INTERACTIONS.reduce<Record<string, number>>(
    (acc, i) => {
      acc[i.channel] = (acc[i.channel] ?? 0) + 1
      return acc
    },
    {},
  )

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Actividad comercial"
          title="Interacciones"
          subtitle="Toda la actividad reciente con leads: WhatsApp, llamadas, emails, visitas y notas."
        />

        <section className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(CHANNEL_ICON).map(([channel, icon]) => (
            <MetricCard
              key={channel}
              title={`${icon} ${channel}`}
              value={byChannel[channel] ?? 0}
            />
          ))}
        </section>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          {DEMO_INTERACTIONS.map((i, idx) => (
            <Link
              key={i.id}
              href={`/demo/leads/${i.leadId}`}
              className={`flex gap-4 p-5 transition hover:bg-white/[0.03] ${
                idx !== DEMO_INTERACTIONS.length - 1
                  ? "border-b border-white/5"
                  : ""
              }`}
            >
              <span className="text-xl" aria-hidden="true">
                {CHANNEL_ICON[i.channel]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {i.leadName}
                    <span className="ml-2 text-xs font-normal text-blue-400">
                      {i.channel} · {i.direction}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500">{i.date}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{i.message}</p>
                <p className="mt-1 text-xs text-slate-500">Por {i.actor}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
