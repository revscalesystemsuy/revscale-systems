"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowUpRight, Calculator, CircleDollarSign, ShieldCheck } from "lucide-react"

const MONTHLY_PLAN = 249
const ANNUAL_PLAN = MONTHLY_PLAN * 12

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
}

export default function RoiPage() {
  const [retainedCommission, setRetainedCommission] = useState(2500)
  const [extraDealsYear, setExtraDealsYear] = useState(2)

  const results = useMemo(() => {
    const commission = Math.max(1, retainedCommission || 1)
    const deals = Math.max(0, extraDealsYear || 0)
    const breakEvenDealsPerMonth = MONTHLY_PLAN / commission
    const monthsCoveredByOneDeal = commission / MONTHLY_PLAN
    const scenarioRevenue = commission * deals
    const scenarioNet = scenarioRevenue - ANNUAL_PLAN
    const scenarioRoi = ANNUAL_PLAN > 0 ? (scenarioNet / ANNUAL_PLAN) * 100 : 0

    return { breakEvenDealsPerMonth, monthsCoveredByOneDeal, scenarioRevenue, scenarioNet, scenarioRoi }
  }, [retainedCommission, extraDealsYear])

  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-8 text-[#292722] md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-[#d5c8b6] pb-5">
          <Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl tracking-tight">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link>
          <Link href="/pricing" className="text-sm text-[#625d55] transition hover:text-[#292722]">Ver planes</Link>
        </header>

        <section className="mx-auto mt-14 max-w-4xl text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#d2c4b0] bg-[#f7f1e8] text-[#806b4d]"><Calculator size={19} strokeWidth={1.6} /></div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Punto de equilibrio</p>
          <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#29251f] md:text-6xl">¿Cuánto tendría que recuperar RevScale para pagarse solo?</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#6d665d]">No usamos un ROI prometido. Ingresá cuánto retiene tu inmobiliaria por una operación cerrada y probá un escenario elegido por vos.</p>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6 md:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Tus números</p>
            <div className="mt-6 space-y-6">
              <label className="block">
                <span className="text-sm font-medium text-[#403a32]">Comisión neta que queda en la inmobiliaria por cierre</span>
                <span className="mt-1 block text-xs leading-5 text-[#81796e]">Usá lo que queda en la oficina después del split del agente. No el valor de la propiedad.</span>
                <div className="mt-3 flex items-center rounded-xl border border-[#cdbfa9] bg-[#efe6d8] px-4"><span className="text-sm text-[#746a5e]">USD</span><input aria-label="Comisión neta por cierre" type="number" min="1" step="100" value={retainedCommission} onChange={(e) => setRetainedCommission(Number(e.target.value))} className="w-full bg-transparent px-3 py-3 text-lg outline-none" /></div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#403a32]">Escenario: operaciones adicionales recuperadas en 12 meses</span>
                <span className="mt-1 block text-xs leading-5 text-[#81796e]">Este número lo elegís vos. No es una proyección de RevScale.</span>
                <input aria-label="Operaciones adicionales por año" type="number" min="0" step="1" value={extraDealsYear} onChange={(e) => setExtraDealsYear(Number(e.target.value))} className="mt-3 w-full rounded-xl border border-[#cdbfa9] bg-[#efe6d8] px-4 py-3 text-lg outline-none" />
              </label>

              <div className="rounded-xl border border-[#d8ccbc] bg-[#efe6d8] p-4 text-sm leading-6 text-[#625d55]">
                <strong className="text-[#403a32]">Plan usado para el cálculo:</strong> Professional, USD {MONTHLY_PLAN}/mes. El cálculo mensual usa 12 pagos para no inflar el escenario con descuentos anuales.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#bda98a] bg-[#e5d7c3] p-6 md:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#745f43]">Resultado</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Metric label="Punto de equilibrio mensual" value={`${results.breakEvenDealsPerMonth.toFixed(2)} cierres`} hint={`Equivale a 1 cierre adicional cada ${results.monthsCoveredByOneDeal.toFixed(1)} meses.`} />
              <Metric label="Costo anual Professional" value={money(ANNUAL_PLAN)} hint="12 mensualidades; sin asumir descuento anual." />
              <Metric label="Ingreso del escenario" value={money(results.scenarioRevenue)} hint={`${extraDealsYear || 0} cierres × ${money(retainedCommission || 0)} netos para la oficina.`} />
              <Metric label="Diferencia vs software" value={money(results.scenarioNet)} hint={`ROI del escenario: ${Number.isFinite(results.scenarioRoi) ? results.scenarioRoi.toFixed(0) : "0"}%`} />
            </div>

            <div className="mt-6 rounded-xl border border-[#c3b090] bg-[#eee3d3] p-5">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#745f43]" strokeWidth={1.6} /><div><p className="font-medium text-[#403a32]">Qué significa este número</p><p className="mt-2 text-sm leading-6 text-[#665e54]">No demuestra que RevScale vaya a producir esos cierres. Solo muestra cuántas operaciones adicionales tendría que recuperar tu equipo para superar el costo del software con tus propios economics.</p></div></div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#d5c8b6] bg-[#f7f1e8] p-5"><CircleDollarSign className="h-5 w-5 text-[#806b4d]" strokeWidth={1.6} /><h2 className="mt-4 font-serif text-2xl text-[#302b25]">Usá comisión retenida</h2><p className="mt-2 text-sm leading-6 text-[#716a61]">El valor de venta de la propiedad no es ingreso de la inmobiliaria. El cálculo usa únicamente lo que queda en oficina.</p></div>
          <div className="rounded-xl border border-[#d5c8b6] bg-[#f7f1e8] p-5"><ShieldCheck className="h-5 w-5 text-[#806b4d]" strokeWidth={1.6} /><h2 className="mt-4 font-serif text-2xl text-[#302b25]">No contamos actividad</h2><p className="mt-2 text-sm leading-6 text-[#716a61]">Más mensajes, más tareas o más leads vistos no son ROI. El argumento económico necesita oportunidades realmente avanzadas o recuperadas.</p></div>
          <div className="rounded-xl border border-[#d5c8b6] bg-[#f7f1e8] p-5"><Calculator className="h-5 w-5 text-[#806b4d]" strokeWidth={1.6} /><h2 className="mt-4 font-serif text-2xl text-[#302b25]">Medilo durante el pilot</h2><p className="mt-2 text-sm leading-6 text-[#716a61]">Baseline, activación y reporte día 30/45 permiten comparar el escenario con señales reales antes de decidir continuidad.</p></div>
        </section>

        <section className="mt-10 rounded-2xl bg-[#302b25] px-6 py-8 text-[#f5eee4] md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c8b99f]">Siguiente paso</p><h2 className="mt-3 font-serif text-3xl">Validá si tu operación tiene suficiente fuga para justificar el pilot.</h2></div>
            <div className="flex flex-wrap gap-3"><Link href="/diagnostico" className="inline-flex items-center gap-2 rounded-md bg-[#f0e6d8] px-5 py-3 text-sm font-medium text-[#302b25]">Diagnosticar mi operación <ArrowUpRight size={15} /></Link><Link href="/pilot" className="rounded-md border border-[#766b5c] px-5 py-3 text-sm font-medium text-[#f0e6d8]">Ver pilot</Link></div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-xl border border-[#c3b090] bg-[#f0e6d8] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#745f43]">{label}</p><p className="mt-3 font-serif text-3xl text-[#302b25]">{value}</p><p className="mt-2 text-xs leading-5 text-[#6f6559]">{hint}</p></div>
}
