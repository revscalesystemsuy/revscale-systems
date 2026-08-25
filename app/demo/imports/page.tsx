import { Database, FileSpreadsheet, UploadCloud } from "lucide-react"
import { DEMO_PLAN_CONFIG, normalizeDemoPlan } from "@/lib/demo-plan"
import { PageHeader } from "../demo-ui"

export default async function DemoImportsPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  const config = DEMO_PLAN_CONFIG[plan]
  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-6xl"><PageHeader eyebrow={`${config.label} · Administración`} title="Importar datos" subtitle="Vista de demostración del flujo para cargar leads y propiedades desde archivos. Ningún archivo se procesa realmente en la demo." /><section className="grid gap-5 md:grid-cols-2">{[["Leads","CSV o Excel con contactos, presupuesto, zona, etapa y responsable.",Database],["Propiedades","Inventario comercial con ubicación, precio, características y disponibilidad.",FileSpreadsheet]].map(([title,desc,Icon])=><article key={String(title)} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><Icon size={18}/></span><h2 className="mt-5 font-serif text-2xl text-[#37332d]">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-[#6f685f]">{String(desc)}</p><button disabled className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#6f685f] opacity-70"><UploadCloud size={15}/>Seleccionar archivo</button></article>)}</section><section className="mt-6 rounded-xl border border-[#d2c5b3] bg-[#efe6d9] p-5 text-sm text-[#625d55]">La importación real valida duplicados, organización, responsables y estructura antes de escribir datos. En demo solo se muestra el recorrido.</section></div></main>
}
