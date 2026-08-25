import Link from "next/link"
import { Bell, ShieldAlert } from "lucide-react"
import { demoHref, normalizeDemoPlan } from "@/lib/demo-plan"
import { MetricCard, PageHeader } from "../demo-ui"

const ITEMS = [
  ["Alta","Lead nuevo sin contacto","Sofía Fernández lleva más de 30 minutos sin primer contacto.","sofia-fernandez"],
  ["Alta","Negociación sin movimiento","Martín Rodríguez lleva 5 días sin avance de etapa.","martin-rodriguez"],
  ["Media","Visita sin seguimiento","La visita de Alejandro Silva todavía no tiene próximo paso agendado.","alejandro-silva"],
] as const

export default async function DemoNotificationsPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-5xl"><PageHeader eyebrow="Prioridades comerciales" title="Notificaciones" subtitle="Alertas automáticas de fugas comerciales, seguimientos y oportunidades que requieren intervención." /><section className="grid gap-4 sm:grid-cols-2"><MetricCard title="Sin leer" value={3}/><MetricCard title="Fugas detectadas" value={3}/></section><section className="mt-8 space-y-3">{ITEMS.map(([priority,title,body,id])=><article key={title} className={`rounded-xl border p-5 ${priority==="Alta"?"border-[#b88e75] bg-[#f1dfd2]":"border-[#cdbfa9] bg-[#f7f0e6]"}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 flex-1 gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] text-[#725d40]">{priority==="Alta"?<ShieldAlert size={17}/>:<Bell size={17}/>}</span><div><div className="flex items-center gap-2"><h2 className="font-medium text-[#37332d]">{title}</h2><span className="rounded-full border border-[#b88e75] bg-[#ead3c3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b4433]">{priority}</span></div><p className="mt-2 text-sm text-[#625d55]">{body}</p><p className="mt-2 text-xs text-[#8b8378]">Automática · hace 18 min</p></div></div><Link href={demoHref(`/demo/leads/${id}`,plan)} className="rounded-lg bg-[#302d28] px-4 py-2 text-sm font-semibold !text-[#fffaf2]">Resolver</Link></div></article>)}</section></div></main>
}
