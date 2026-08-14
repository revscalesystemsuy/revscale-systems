import Link from "next/link"
import { DEMO_FOLLOWUPS, type DemoFollowup } from "@/lib/demo-data"
import { PageHeader, MetricCard } from "../demo-ui"

const BUCKETS: {
  key: DemoFollowup["bucket"]
  title: string
  accent: string
}[] = [
  { key: "Vencido", title: "🔴 Vencidos", accent: "text-red-400" },
  { key: "Hoy", title: "🟡 Para hoy", accent: "text-amber-400" },
  { key: "Pendiente", title: "🔵 Pendientes", accent: "text-blue-400" },
  { key: "Próximo", title: "🟢 Próximos", accent: "text-green-400" },
]

function priorityBadge(priority: DemoFollowup["priority"]) {
  switch (priority) {
    case "Alta":
      return "bg-red-500/10 text-red-400"
    case "Media":
      return "bg-amber-500/10 text-amber-400"
    case "Baja":
      return "bg-slate-500/10 text-slate-400"
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
          {counts.map((b) => (
            <MetricCard key={b.key} title={b.title} value={b.items.length} />
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {counts.map((bucket) => (
            <div
              key={bucket.key}
              className="rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <h2
                className={`border-b border-white/10 p-5 text-lg font-semibold ${bucket.accent}`}
              >
                {bucket.title}
                <span className="ml-2 text-sm text-slate-500">
                  ({bucket.items.length})
                </span>
              </h2>
              <div className="space-y-3 p-4">
                {bucket.items.map((f) => (
                  <Link
                    key={f.id}
                    href={`/demo/leads/${f.leadId}`}
                    className="block rounded-xl border border-white/10 p-4 transition hover:border-blue-500/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{f.leadName}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityBadge(
                          f.priority,
                        )}`}
                      >
                        {f.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{f.action}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {f.type} · {f.date} · {f.agent}
                    </p>
                  </Link>
                ))}
                {!bucket.items.length && (
                  <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-600">
                    Sin follow-ups
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
