import Link from "next/link"
import { Card, MetricCard, PageHeader } from "../demo-ui"

const formatUSD = (value: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)

const zones = ["Pocitos", "Punta Carretas", "Carrasco", "Malvín", "Buceo", "Cordón", "Parque Miramar"]
const types = ["Apartamento", "Casa", "Penthouse", "Oficina"]

const simulatedProperties = Array.from({ length: 548 }, (_, index) => ({
  id: `PL-${String(index + 1).padStart(4, "0")}`,
  zone: zones[index % zones.length],
  type: types[index % types.length],
  status: index % 19 === 0 ? "Reservada" : "Disponible",
}))

const agents = [
  { name: "Laura Fernández", leads: 31, overdue: 2, sla: 94, visits: 12, pipeline: 1_480_000 },
  { name: "Santiago Pérez", leads: 27, overdue: 1, sla: 91, visits: 10, pipeline: 1_260_000 },
  { name: "Mariana Silva", leads: 24, overdue: 4, sla: 79, visits: 8, pipeline: 1_090_000 },
  { name: "Diego Rodríguez", leads: 22, overdue: 5, sla: 73, visits: 6, pipeline: 910_000 },
  { name: "Carolina Méndez", leads: 18, overdue: 1, sla: 96, visits: 7, pipeline: 820_000 },
  { name: "Federico López", leads: 16, overdue: 3, sla: 82, visits: 5, pipeline: 760_000 },
  { name: "Valentina Costa", leads: 13, overdue: 0, sla: 98, visits: 6, pipeline: 690_000 },
  { name: "Martín Suárez", leads: 11, overdue: 1, sla: 88, visits: 4, pipeline: 610_000 },
  { name: "Agustina Torres", leads: 9, overdue: 0, sla: 100, visits: 3, pipeline: 540_000 },
  { name: "Nicolás Viera", leads: 7, overdue: 0, sla: 92, visits: 2, pipeline: 430_000 },
  { name: "Lucía Pereira", leads: 5, overdue: 0, sla: 96, visits: 2, pipeline: 350_000 },
  { name: "Mateo Cabrera", leads: 4, overdue: 0, sla: 100, visits: 1, pipeline: 280_000 },
]

const riskLeads = [
  { name: "Martín Rodríguez", agent: "Diego Rodríguez", source: "MercadoLibre", budget: 310_000, idle: "74 h", severity: "Crítico", action: "Sin próxima acción" },
  { name: "Sofía Fernández", agent: "Mariana Silva", source: "WhatsApp", budget: 265_000, idle: "51 h", severity: "Crítico", action: "Visita realizada, sin follow-up" },
  { name: "Alejandro Silva", agent: "Federico López", source: "Web", budget: 220_000, idle: "48 h", severity: "Alto", action: "Pidió opciones y no recibió respuesta" },
  { name: "Camila Pereira", agent: "Diego Rodríguez", source: "Instagram", budget: 185_000, idle: "29 h", severity: "Alto", action: "Lead calificado, próxima acción vencida" },
  { name: "Andrés Gómez", agent: "Sin asignar", source: "InfoCasas", budget: 410_000, idle: "26 h", severity: "Alto", action: "Entró sin responsable asignado" },
  { name: "Florencia Rossi", agent: "Mariana Silva", source: "Meta", budget: 195_000, idle: "8 h", severity: "Atención", action: "Segundo intento pendiente" },
]

const sources = [
  { name: "MercadoLibre", leads: 58, unanswered: 4, conversion: "14,2%" },
  { name: "WhatsApp", leads: 46, unanswered: 2, conversion: "18,5%" },
  { name: "Web", leads: 32, unanswered: 1, conversion: "12,8%" },
  { name: "InfoCasas", leads: 24, unanswered: 1, conversion: "11,9%" },
  { name: "Instagram / Meta", leads: 18, unanswered: 1, conversion: "9,7%" },
  { name: "Referidos", leads: 9, unanswered: 0, conversion: "22,2%" },
]

const tasks = [
  { when: "Vencida hace 2 días", owner: "Diego Rodríguez", task: "Retomar negociación · Martín Rodríguez", value: 310_000 },
  { when: "Vencida ayer", owner: "Mariana Silva", task: "Follow-up post visita · Sofía Fernández", value: 265_000 },
  { when: "Vencida hace 18 h", owner: "Federico López", task: "Enviar shortlist · Alejandro Silva", value: 220_000 },
  { when: "Vence hoy 18:00", owner: "Laura Fernández", task: "Confirmar segunda visita · Paula Díaz", value: 480_000 },
]

export default function PlatinumDemoPage() {
  const pipelineValue = agents.reduce((sum, agent) => sum + agent.pipeline, 0)
  const overdueTasks = agents.reduce((sum, agent) => sum + agent.overdue, 0)
  const weightedSla = Math.round(agents.reduce((sum, agent) => sum + agent.sla * agent.leads, 0) / agents.reduce((sum, agent) => sum + agent.leads, 0))

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Demo ejecutiva personalizada · datos ficticios"
          title="Control comercial — escenario Platinum"
          subtitle="Una vista simulada de una inmobiliaria con más de 500 propiedades y un equipo comercial amplio. El objetivo es mostrar en segundos qué oportunidades necesitan intervención antes de que se pierdan."
          action={
            <div className="flex flex-wrap gap-2">
              <Link href="/demo/followups?plan=enterprise" className="rounded-lg border border-[#cbbda8] bg-[#f7f1e8] px-4 py-2 text-xs font-semibold text-[#5f5548] hover:bg-[#efe4d4]">
                Ver follow-ups
              </Link>
              <Link href="/demo/executive?plan=enterprise" className="rounded-lg bg-[#3b352d] px-4 py-2 text-xs font-semibold text-[#fffaf2] hover:bg-[#2f2a24]">
                Vista ejecutiva general
              </Link>
            </div>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Propiedades activas" value={simulatedProperties.length} hint="Inventario simulado en múltiples zonas" />
          <MetricCard title="Leads activos" value="187" hint="Distribuidos entre 12 asesores" />
          <MetricCard title="Sin próxima acción" value="23" hint="Oportunidades que requieren revisión" />
          <MetricCard title="Follow-ups vencidos" value={overdueTasks} hint="Tareas comerciales fuera de fecha" />
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Pipeline abierto" value={formatUSD(pipelineValue)} hint="Valor potencial asignado al equipo" />
          <MetricCard title="Cumplimiento SLA" value={`${weightedSla}%`} hint="Respuesta humana dentro del objetivo" />
          <MetricCard title="Sin asignar" value="9" hint="Leads todavía sin responsable" />
          <MetricCard title="Visitas esta semana" value="66" hint="Actividad comercial consolidada" />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <Card title="Oportunidades que dirección debería ver ahora">
            <div className="space-y-3">
              {riskLeads.map((lead) => (
                <div key={lead.name} className="grid gap-3 rounded-xl border border-[#d7c7b2] bg-[#fffaf2] p-4 md:grid-cols-[1.25fr_0.9fr_0.7fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[#332f29]">{lead.name}</p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${lead.severity === "Crítico" ? "bg-[#efe0d8] text-[#8a4f39]" : lead.severity === "Alto" ? "bg-[#f2e8d7] text-[#80623a]" : "bg-[#e8e3d8] text-[#6a6258]"}`}>
                        {lead.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#7a7166]">{lead.action}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#514b43]">{lead.agent}</p>
                    <p className="mt-1 text-xs text-[#8a8175]">{lead.source}</p>
                  </div>
                  <div>
                    <p className="font-serif text-xl text-[#745f43]">{formatUSD(lead.budget)}</p>
                    <p className="mt-1 text-xs text-[#8a8175]">presupuesto</p>
                  </div>
                  <div className="md:text-right">
                    <p className="font-serif text-2xl text-[#8a4f39]">{lead.idle}</p>
                    <p className="text-xs text-[#8a8175]">sin avance</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Lo que el director detecta en 10 segundos">
            <div className="space-y-3">
              {[
                ["23", "leads sin próxima acción"],
                ["9", "leads todavía sin responsable"],
                [String(overdueTasks), "follow-ups vencidos en el equipo"],
                ["3", "oportunidades > USD 250k en riesgo"],
                ["2", "asesores por debajo de 80% de SLA"],
              ].map(([value, label]) => (
                <div key={label} className="flex items-center gap-4 rounded-xl border border-[#ded2c2] bg-[#fffaf2] p-4">
                  <span className="min-w-12 font-serif text-3xl text-[#745f43]">{value}</span>
                  <p className="text-sm leading-5 text-[#5c554d]">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-[#d8c6ae] bg-[#eee3d2] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806945]">Valor de la vista</p>
              <p className="mt-2 text-sm leading-6 text-[#514b43]">Dirección no necesita revisar WhatsApp, planillas ni asesor por asesor: ve excepciones y riesgos comerciales en una sola pantalla.</p>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card title="Rendimiento por asesor">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d7cbb9] text-[10px] uppercase tracking-[0.14em] text-[#81776b]">
                    <th className="pb-3 pr-4 font-semibold">Asesor</th>
                    <th className="pb-3 pr-4 font-semibold">Leads</th>
                    <th className="pb-3 pr-4 font-semibold">Vencidos</th>
                    <th className="pb-3 pr-4 font-semibold">SLA</th>
                    <th className="pb-3 pr-4 font-semibold">Visitas</th>
                    <th className="pb-3 font-semibold">Pipeline</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.name} className="border-b border-[#e2d8ca] last:border-0">
                      <td className="py-3 pr-4 font-medium text-[#37332d]">{agent.name}</td>
                      <td className="py-3 pr-4 tabular-nums text-[#5e574e]">{agent.leads}</td>
                      <td className={`py-3 pr-4 tabular-nums ${agent.overdue >= 4 ? "font-semibold text-[#8a4f39]" : "text-[#5e574e]"}`}>{agent.overdue}</td>
                      <td className={`py-3 pr-4 tabular-nums ${agent.sla < 80 ? "font-semibold text-[#8a4f39]" : "text-[#5e574e]"}`}>{agent.sla}%</td>
                      <td className="py-3 pr-4 tabular-nums text-[#5e574e]">{agent.visits}</td>
                      <td className="py-3 font-medium tabular-nums text-[#745f43]">{formatUSD(agent.pipeline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Origen de consultas">
            <div className="space-y-4">
              {sources.map((source) => (
                <div key={source.name} className="border-b border-[#ded2c2] pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#37332d]">{source.name}</p>
                      <p className="mt-1 text-xs text-[#81796e]">{source.leads} leads · {source.unanswered} sin respuesta</p>
                    </div>
                    <span className="font-serif text-xl text-[#745f43]">{source.conversion}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Tareas que ya están costando oportunidades">
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.task} className="rounded-xl border border-[#d7c7b2] bg-[#fffaf2] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a4f39]">{task.when}</p>
                      <p className="mt-2 font-medium text-[#37332d]">{task.task}</p>
                      <p className="mt-1 text-xs text-[#81796e]">Responsable: {task.owner}</p>
                    </div>
                    <p className="font-serif text-xl text-[#745f43]">{formatUSD(task.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Escenario de la demo">
            <div className="space-y-4 text-sm leading-6 text-[#5c554d]">
              <p><strong className="text-[#37332d]">548 propiedades simuladas.</strong> El inventario existe en memoria sólo para esta demostración y no representa datos de Platinum.</p>
              <p><strong className="text-[#37332d]">12 asesores.</strong> Se muestra carga comercial, cumplimiento de SLA, visitas, tareas vencidas y pipeline individual.</p>
              <p><strong className="text-[#37332d]">Riesgo visible.</strong> Hay leads con 24, 48 y 72+ horas sin avance para demostrar cómo PropertyOS evita que dirección tenga que revisar cada conversación.</p>
              <p><strong className="text-[#37332d]">Sin datos reales.</strong> Todos los nombres, montos y métricas de esta pantalla son ficticios y fueron preparados exclusivamente para una conversación comercial.</p>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
