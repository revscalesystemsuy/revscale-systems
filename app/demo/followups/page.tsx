import Link from "next/link"
import { AlertCircle, CalendarClock, CircleDot, Clock3 } from "lucide-react"
import { DEMO_FOLLOWUPS, type DemoFollowup } from "@/lib/demo-data"
import { PageHeader, MetricCard } from "../demo-ui"

const BUCKETS: {
  key: DemoFollowup["bucket"]
  title: string
  accent: string
  icon: typeof Clock3
}[] = [
  { key: "Vencido", title: "Vencidos", accent: "text-red-600", icon: AlertCircle },
  { key: "Hoy", title: "Para hoy", accent: "text-amber-700", icon: Clock3 },
  { key: "Pendiente", title: "Pendientes", accent: "text-[#745f43]", icon: CircleDot },
  { key: "Próximo", title: "Próximos", accent: "text-green-700", icon: CalendarClock },
]

function priorityBadge(priority: DemoFollowup["priority"]) {
  switch (priority) {
    case "Alta":
      return "bg-red-500/10 text-red-600"
    case "Media":
      return "bg-amber-500/10 text-amber-700"
    case "Baja":
      return "bg-[#e5ddd1] text-[#625b52]"
  }
}

export default function DemoFollowupsPage() {
  const counts = BUCKETS.map((b) => ({
    ...b,
    items: DEMO_FOLLOWUPS.filter((f) => f.bucket === b.key),
  }))

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Seguimiento comercial"
          title="Follow-ups"
          subtitle="Seguimientos organizados por urgencia para no perder ninguna oportunidad."
        />

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map((b) => {
            const Icon = b.icon
            return (
              <MetricCard
                key={b.key}
                title={<span className={`inline-flex items-center gap-2 ${b.accent}`}><Icon size={14} strokeWidth={1.7} />{b.title}</span>}
                value={b.items.length}
              />
            )
          })}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {counts.map((bucket) => {
            const Icon = bucket.icon
            return (
              <div
                key={bucket.key}
                className="rounded-2xl border border-[#d6cbbb] bg-[#f7f1e8]"
              >
                <h2
                  className={`flex items-center gap-2 border-b border-[#ded2c2] p-5 text-lg font-semibold ${bucket.accent}`}
                >
                  <Icon size={17} strokeWidth={1.7} />
                  {bucket.title}
                  <span className="ml-1 text-sm text-[#625b52]">
                    ({bucket.items.length})
                  </span>
                </h2>
                <div className="space-y-3 p-4">
                  {bucket.items.map((f) => (
                    <Link
                      key={f.id}
                      href={`/demo/leads/${f.leadId}`}
                      className="block rounded-xl border border-[#d6cbbb] p-4 transition hover:border-[#b9a88e] hover:bg-[#f0e7da]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#37332d]">{f.leadName}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityBadge(
                            f.priority,
                          )}`}
                        >
                          {f.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#514b43]">{f.action}</p>
                      <p className="mt-2 text-xs text-[#625b52]">
                        {f.type} · {f.date} · {f.agent}
                      </p>
                    </Link>
                  ))}
                  {!bucket.items.length && (
                    <div className="rounded-xl border border-dashed border-[#d6cbbb] p-6 text-center text-sm text-[#6b6359]">
                      Sin follow-ups
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
