import { redirect } from "next/navigation"
import { Building2, Route, ShieldCheck, UsersRound } from "lucide-react"
import { PageHeader, Card, MetricCard } from "../demo-ui"
import { DEMO_PLAN_CONFIG, normalizeDemoPlan } from "@/lib/demo-plan"

const TEAMS = [
  { name: "Ventas Montevideo", manager: "Camila Suárez", agents: 8, zones: "Pocitos · Punta Carretas · Cordón", activeLeads: 184 },
  { name: "Costa & Carrasco", manager: "Santiago Pereira", agents: 6, zones: "Carrasco · Malvín · Punta Gorda", activeLeads: 121 },
  { name: "Inversiones", manager: "Lucía Fernández", agents: 5, zones: "Proyectos · Renta · Inversores", activeLeads: 96 },
]

export default async function DemoTeamsPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  if (!DEMO_PLAN_CONFIG[plan].modules.teams) redirect(`/demo?plan=${plan}`)

  return (
    <div className="p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Enterprise · Multi-equipo"
          title="Equipos y distribución"
          subtitle="Una vista de coordinación para separar zonas, responsables y carga comercial sin perder control central."
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="Equipos activos" value={TEAMS.length} />
          <MetricCard title="Agentes" value={TEAMS.reduce((sum, team) => sum + team.agents, 0)} hint="de 30 disponibles" />
          <MetricCard title="Leads activos" value={TEAMS.reduce((sum, team) => sum + team.activeLeads, 0)} />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          {TEAMS.map((team) => (
            <Card key={team.name} title={<span className="inline-flex items-center gap-2"><UsersRound size={17} strokeWidth={1.7} />{team.name}</span>}>
              <div className="space-y-4 text-sm text-[#5f5951]">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d8579]">Manager</p><p className="mt-1 font-medium text-[#37332d]">{team.manager}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d8579]">Cobertura</p><p className="mt-1">{team.zones}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#d8ccbb] bg-[#efe6d9] p-3"><p className="text-xs text-[#756e64]">Agentes</p><p className="mt-1 font-serif text-2xl text-[#302b25]">{team.agents}</p></div>
                  <div className="rounded-xl border border-[#d8ccbb] bg-[#efe6d9] p-3"><p className="text-xs text-[#756e64]">Leads</p><p className="mt-1 font-serif text-2xl text-[#302b25]">{team.activeLeads}</p></div>
                </div>
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          <Card title={<span className="inline-flex items-center gap-2"><Route size={17} />Asignación automática</span>}><p className="text-sm leading-6 text-[#625d55]">Los leads entrantes se distribuyen por zona, equipo y disponibilidad para evitar reparto manual.</p></Card>
          <Card title={<span className="inline-flex items-center gap-2"><ShieldCheck size={17} />Roles y alcance</span>}><p className="text-sm leading-6 text-[#625d55]">Director, managers y agentes ven la información correspondiente a su responsabilidad comercial.</p></Card>
          <Card title={<span className="inline-flex items-center gap-2"><Building2 size={17} />Operación centralizada</span>}><p className="text-sm leading-6 text-[#625d55]">La dirección conserva visibilidad del pipeline completo aunque la ejecución esté dividida por equipos.</p></Card>
        </section>
      </div>
    </div>
  )
}
