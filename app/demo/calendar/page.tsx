import Link from "next/link"
import { DEMO_LEADS, formatUSD } from "@/lib/demo-data"
import { demoHref, normalizeDemoPlan } from "@/lib/demo-plan"
import { MetricCard, PageHeader } from "../demo-ui"

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const CLOSES = [
  { day: 3, lead: DEMO_LEADS[0], risk: "Alto" },
  { day: 7, lead: DEMO_LEADS[1], risk: "Medio" },
  { day: 12, lead: DEMO_LEADS[2], risk: "Medio" },
  { day: 18, lead: DEMO_LEADS[3], risk: "Bajo" },
  { day: 24, lead: DEMO_LEADS[4], risk: "Alto" },
  { day: 28, lead: DEMO_LEADS[5], risk: "Medio" },
]
const WITHOUT_DATE = DEMO_LEADS.slice(6, 9)

export default async function DemoCalendarPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  const total = CLOSES.reduce((sum, item) => sum + item.lead.budgetUSD, 0)
  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1500px]">
        <PageHeader eyebrow="Agenda comercial" title="Calendario de cierres" subtitle="RevScale arma esta vista automáticamente con las fechas estimadas de cierre. Cuando falta un dato que el sistema no debe inventar, lo detecta y deja una acción manual clara para completarlo." action={<Link href={demoHref("/demo/today", plan)} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2 text-sm font-semibold text-[#554f47]">Volver a Qué hacer hoy</Link>} />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Vencidos" value={2} />
          <MetricCard title="Sin fecha" value={WITHOUT_DATE.length} />
          <MetricCard title="Este mes" value={CLOSES.length} />
          <MetricCard title="Riesgo alto" value={2} />
          <MetricCard title="Valor previsto" value={formatUSD(total)} />
        </section>

        <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#efe6d9] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8d7553]">Dato que requiere criterio humano</p>
              <h2 className="mt-1 font-serif text-2xl text-[#37332d]">Oportunidades sin fecha estimada</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f685f]">El sistema detecta automáticamente cuáles faltan. No inventa una fecha: el equipo la completa cuando existe una estimación comercial real.</p>
            </div>
            <span className="rounded-full border border-[#cdbfa9] bg-[#fffaf2] px-3 py-1 text-xs font-semibold text-[#705d43]">{WITHOUT_DATE.length} pendientes</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {WITHOUT_DATE.map((lead) => (
              <article key={lead.id} className="rounded-xl border border-[#d8ccbc] bg-[#fffaf2] p-4">
                <p className="text-sm font-semibold text-[#37332d]">{lead.fullName}</p>
                <p className="mt-1 text-xs text-[#81796e]">{lead.stage} · {formatUSD(lead.budgetUSD)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href={demoHref(`/demo/leads/${lead.id}`, plan)} className="rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-3 py-2 text-center text-xs font-semibold text-[#554f47]">Ver ficha</Link>
                  <Link href={demoHref(`/demo/leads/${lead.id}`, plan)} className="rounded-lg bg-[#302d28] px-3 py-2 text-center text-xs font-semibold !text-[#fffaf2]">Definir fecha</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
          <div className="flex items-center justify-between"><h2 className="font-serif text-2xl text-[#37332d]">Agosto 2026</h2><span className="text-xs text-[#81796e]">Lunes a domingo · demo Uruguay</span></div>
          <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-[#d8ccbc] bg-[#d8ccbc]">
            {DAYS.map((day) => <div key={day} className="bg-[#eee4d5] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#776f64]">{day}</div>)}
            {Array.from({ length: 35 }, (_, i) => {
              const day = i < 5 ? null : i - 4
              const item = CLOSES.find((close) => close.day === day)
              return <div key={i} className="min-h-[145px] bg-[#fffaf2] p-3">{day && day <= 30 ? <><span className="text-xs font-semibold text-[#81796e]">{day}</span>{item && <div className="mt-2 rounded-lg border border-[#d2c5b3] bg-[#f7f0e6] p-2.5"><Link href={demoHref(`/demo/leads/${item.lead.id}`, plan)} className="block"><div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-semibold text-[#37332d]">{item.lead.fullName}</p><span className="text-[9px] font-semibold text-[#756246]">{item.risk}</span></div><p className="mt-1 text-[10px] text-[#625d55]">{formatUSD(item.lead.budgetUSD)}</p></Link><Link href={demoHref(`/demo/leads/${item.lead.id}`, plan)} className="mt-2 block border-t border-[#ddd1c0] pt-2 text-[10px] font-semibold text-[#725d40]">Editar fecha / datos</Link></div>}</> : null}</div>
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
