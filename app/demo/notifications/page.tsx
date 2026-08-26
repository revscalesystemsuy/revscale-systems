import Link from "next/link"
import { Bell, Building2, Clock3, MessageCircle, ShieldAlert } from "lucide-react"
import { DEMO_PLAN_CONFIG, demoHref, normalizeDemoPlan } from "@/lib/demo-plan"
import { MetricCard, PageHeader } from "../demo-ui"

type DemoNotification = {
  priority: "Alta" | "Media"
  title: string
  body: string
  href: string
  kind: "risk" | "match" | "sla" | "whatsapp"
}

export default async function DemoNotificationsPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  const matchingEnabled = DEMO_PLAN_CONFIG[plan].modules.matching
  const whatsappEnabled = plan !== "starter"

  const items: DemoNotification[] = [
    { priority: "Alta", title: "SLA incumplido", body: "Nicolás Gómez superó el objetivo de 15 minutos: primera respuesta humana a los 34 min.", href: "/demo/leads/nicolas-gomez", kind: "sla" },
    { priority: "Alta", title: "SLA escalado", body: "Valentina Méndez sigue sin respuesta humana. La alerta ya es visible para Gerencia y Dirección.", href: "/demo/leads/valentina-mendez", kind: "sla" },
    { priority: "Media", title: "SLA por vencer", body: "Un lead asignado se aproxima al límite configurado. La respuesta automática no detiene el reloj humano.", href: "/demo/today", kind: "sla" },
    { priority: "Alta", title: "Negociación sin movimiento", body: "Martín Rodríguez lleva 5 días sin avance de etapa.", href: "/demo/leads/martin-rodriguez", kind: "risk" },
    { priority: "Media", title: "Visita sin seguimiento", body: "La visita de Alejandro Silva todavía no tiene próximo paso agendado.", href: "/demo/leads/alejandro-silva", kind: "risk" },
  ]

  if (whatsappEnabled) items.unshift({ priority: "Alta", title: "WhatsApp requiere atención humana", body: "Valentina Méndez pidió negociar una seña y hablar con una persona. La IA quedó pausada automáticamente.", href: "/demo/inbox?conversation=valentina-mendez", kind: "whatsapp" })
  if (matchingEnabled) items.unshift({ priority: "Alta", title: "Clientes compatibles detectados", body: "3 clientes de tu cartera coinciden con Apartamento Pocitos Premium. Mejor afinidad: 94%.", href: "/demo/properties", kind: "match" })
  const slaCount = items.filter((item) => item.kind === "sla").length
  const whatsappCount = items.filter((item) => item.kind === "whatsapp").length

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Prioridades comerciales" title="Notificaciones" subtitle="Alertas automáticas de SLA, handoff de WhatsApp, seguimiento, riesgo comercial y nuevas coincidencias entre propiedades y clientes." />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard title="Sin leer" value={items.length} /><MetricCard title="Automáticas" value={items.length} /><MetricCard title="SLA" value={slaCount} /><MetricCard title="WhatsApp" value={whatsappCount} /></section>
      <div className="mt-6 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4 text-sm leading-6 text-[#665f56]">En la demo, las alertas SLA muestran el flujo preventivo → incumplimiento → escalamiento. Cuando WhatsApp necesita criterio humano, la IA se pausa y la notificación abre directamente el Inbox.</div>
      <section className="mt-6 space-y-3">{items.map((item) => <article key={item.title + item.body} className={`rounded-xl border p-5 ${item.priority === "Alta" ? "border-[#b88e75] bg-[#f1dfd2]" : "border-[#cdbfa9] bg-[#f7f0e6]"}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 flex-1 gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] text-[#725d40]">{item.kind === "match" ? <Building2 size={17} /> : item.kind === "sla" ? <Clock3 size={17} /> : item.kind === "whatsapp" ? <MessageCircle size={17} /> : item.priority === "Alta" ? <ShieldAlert size={17} /> : <Bell size={17} />}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium text-[#37332d]">{item.title}</h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${item.priority === "Alta" ? "border-[#b88e75] bg-[#ead3c3] text-[#6b4433]" : "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]"}`}>{item.priority}</span>{item.kind === "sla" && <span className="rounded-full border border-[#b88e75] bg-[#ead3c3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b4433]">SLA</span>}{item.kind === "whatsapp" && <span className="rounded-full border border-[#b88e75] bg-[#ead3c3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b4433]">WhatsApp</span>}{!["sla","whatsapp"].includes(item.kind) && <span className="rounded-full border border-[#b8a98e] bg-[#eee4d4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6f5a3e]">Automática</span>}</div><p className="mt-2 text-sm text-[#625d55]">{item.body}</p><p className="mt-2 text-xs text-[#8b8378]">Hace 18 min</p></div></div><Link href={demoHref(item.href, plan)} className="rounded-lg bg-[#302d28] px-4 py-2 text-sm font-semibold !text-[#fffaf2]">Resolver</Link></div></article>)}</section>
      {!matchingEnabled && <div className="mt-6 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4 text-sm leading-6 text-[#665f56]">En Starter no aparecen matching ni WhatsApp IA. Professional y Enterprise agregan el canal WhatsApp y la detección automática de clientes compatibles.</div>}
    </div></main>
  )
}
