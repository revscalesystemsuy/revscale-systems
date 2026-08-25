import { Building2, Check, Database, UserCheck, Users } from "lucide-react"
import { DEMO_LEADS, DEMO_PROPERTIES } from "@/lib/demo-data"
import { DEMO_PLAN_CONFIG, normalizeDemoPlan } from "@/lib/demo-plan"
import { PageHeader } from "../demo-ui"

export default async function DemoOnboardingPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  const config = DEMO_PLAN_CONFIG[plan]
  const steps = [
    { title: "Empresa activa", description: `Inmobiliaria Horizonte · plan ${config.label}`, icon: Building2, completed: true },
    { title: "Cargar leads", description: `${DEMO_LEADS.length} leads de demostración listos para trabajar.`, icon: Database, completed: true },
    { title: "Cargar propiedades", description: `${DEMO_PROPERTIES.length} propiedades cargadas en el inventario demo.`, icon: Building2, completed: true },
    { title: "Preparar equipo", description: `La demo muestra un equipo compatible con el límite de ${config.maxAgents} agentes.`, icon: Users, completed: true },
    { title: "Asignar responsables", description: "Los leads de ejemplo ya tienen responsable asignado.", icon: UserCheck, completed: true },
  ]
  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-6xl"><PageHeader eyebrow="Puesta en marcha" title="Configurar RevScale" subtitle="La demo replica el onboarding del sistema real para mostrar cómo se deja una inmobiliaria lista antes de empezar a operar." /><section className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#81796e]">Progreso</p><p className="mt-2 font-serif text-3xl text-[#302d28]">100%</p></div><p className="text-sm text-[#81796e]">5 de 5 pasos listos</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e3d7c6]"><div className="h-full w-full rounded-full bg-[#8e7654]" /></div></section><section className="mt-7 space-y-3">{steps.map((step,index)=>{const Icon=step.icon;return <article key={step.title} className="grid gap-4 rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:grid-cols-[48px_1fr_auto] md:items-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]"><Check size={18}/></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">Paso {index+1}</p><h2 className="mt-1 font-serif text-xl text-[#37332d]">{step.title}</h2><p className="mt-1 text-sm leading-6 text-[#6f685f]">{step.description}</p></div><Icon size={18} className="text-[#8a775b]" /></article>})}</section><section className="mt-7 rounded-2xl border border-[#a9b39b] bg-[#e6e9df] p-6"><h2 className="font-serif text-2xl text-[#37332d]">Operación lista para empezar</h2><p className="mt-2 text-sm leading-6 text-[#6f685f]">En una cuenta real, este punto marca el fin de la puesta en marcha. En la demo no se guarda ningún cambio.</p></section></div></main>
}
