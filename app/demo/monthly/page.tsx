import { DEMO_LEADS_BY_MONTH } from "@/lib/demo-data"
import { BarRow, Card, PageHeader } from "../demo-ui"

export default function DemoMonthlyPage() {
  const max=Math.max(...DEMO_LEADS_BY_MONTH.map((m)=>m.leads),1)
  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-6xl"><PageHeader eyebrow="Dirección" title="Evolución mensual" subtitle="Lectura de tendencia para entender si la operación está ganando volumen y consistencia mes a mes."/><Card title="Leads generados por mes"><div className="space-y-5">{DEMO_LEADS_BY_MONTH.map((m)=><BarRow key={m.month} label={m.month} value={m.leads} max={max}/>)}</div></Card><div className="mt-6 grid gap-5 md:grid-cols-3">{[["Conversión","11.8%","+1.6 pp"],["Tiempo de respuesta","8 min","-4 min"],["Pipeline activo","USD 2.4M","+14%"]].map(([a,b,c])=><div key={a} className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80786e]">{a}</p><p className="mt-3 font-serif text-3xl text-[#2f2c27]">{b}</p><p className="mt-2 text-xs text-[#6f685f]">{c} vs. mes anterior</p></div>)}</div></div></main>
}
