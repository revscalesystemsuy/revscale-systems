import Link from "next/link"
import { Bell, FileText, House, Mail, MessageCircle, Phone } from "lucide-react"
import { DEMO_INTERACTIONS } from "@/lib/demo-data"
import { PageHeader, MetricCard } from "../demo-ui"

const CHANNEL_ICON = {
  WhatsApp: MessageCircle,
  Llamada: Phone,
  Email: Mail,
  Visita: House,
  Nota: FileText,
  "Follow-up": Bell,
} as const

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
          {Object.entries(CHANNEL_ICON).map(([channel, Icon]) => (
            <MetricCard
              key={channel}
              title={<span className="inline-flex items-center gap-2"><Icon size={14} strokeWidth={1.7} />{channel}</span>}
              value={byChannel[channel] ?? 0}
            />
          ))}
        </section>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          {DEMO_INTERACTIONS.map((i, idx) => {
            const Icon = CHANNEL_ICON[i.channel as keyof typeof CHANNEL_ICON] || MessageCircle
            return (
              <Link
                key={i.id}
                href={`/demo/leads/${i.leadId}`}
                className={`flex gap-4 p-5 transition hover:bg-white/[0.03] ${
                  idx !== DEMO_INTERACTIONS.length - 1
                    ? "border-b border-white/5"
                    : ""
                }`}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]">
                  <Icon size={16} strokeWidth={1.7} />
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
