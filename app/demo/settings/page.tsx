import { Building2, MapPin, PlugZap, ShieldCheck } from "lucide-react"
import { DEMO_COMPANY } from "@/lib/demo-data"
import { DEMO_PLAN_CONFIG, normalizeDemoPlan } from "@/lib/demo-plan"
import { PageHeader, Card } from "../demo-ui"

function SectionTitle({ icon: Icon, children }: { icon: typeof Building2; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]">
        <Icon size={15} strokeWidth={1.7} />
      </span>
      {children}
    </span>
  )
}

export default async function DemoSettingsPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams
  const plan = normalizeDemoPlan(params.plan)
  const config = DEMO_PLAN_CONFIG[plan]

  const integrations = [
    { name: "WhatsApp Business", enabled: config.modules.whatsapp, status: config.modules.whatsapp ? "Disponible" : "No incluido" },
    { name: "Matching inteligente", enabled: config.modules.matching, status: config.modules.matching ? "Activo" : "No incluido" },
    { name: "Reportes y analítica", enabled: config.modules.analytics, status: config.modules.analytics ? "Activo" : "No incluido" },
    { name: "Auto-reasignación por SLA", enabled: plan === "enterprise", status: plan === "enterprise" ? "Disponible" : "Enterprise" },
    { name: "Integraciones avanzadas", enabled: config.modules.integrations, status: config.modules.integrations ? "Disponible" : "Enterprise" },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow={`${config.label} · Configuración`}
          title="Configuración"
          subtitle="Vista de demostración. Los ajustes no se guardan, pero las capacidades visibles corresponden al plan seleccionado."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <Card title={<SectionTitle icon={Building2}>Organización</SectionTitle>}>
            <div className="space-y-2 text-[#4f4a42]">
              <p>Nombre: {DEMO_COMPANY.name}</p>
              <p>Mercado: {DEMO_COMPANY.market}</p>
              <p>Plan: {config.label}</p>
              <p>Agentes incluidos: hasta {config.maxAgents}</p>
              <p>{config.leadLimit}</p>
              <p>{config.propertyLimit}</p>
            </div>
          </Card>

          <Card title={<SectionTitle icon={MapPin}>Zonas activas</SectionTitle>}>
            <div className="flex flex-wrap gap-2">
              {DEMO_COMPANY.zones.map((z) => (
                <span key={z} className="rounded-full border border-[#d4c7b6] bg-[#efe6d9] px-3 py-1 text-sm text-[#4f4a42]">{z}</span>
              ))}
            </div>
          </Card>

          <Card title={<SectionTitle icon={ShieldCheck}>Capacidades del plan</SectionTitle>} className="md:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {config.capabilities.map((capability) => (
                <div key={capability} className="rounded-xl border border-[#d6cbbb] bg-[#efe6d9] p-4 text-sm text-[#514b43]">{capability}</div>
              ))}
            </div>
          </Card>

          {plan === "enterprise" && (
            <Card title={<SectionTitle icon={ShieldCheck}>SLA y rescate automático</SectionTitle>} className="md:col-span-2">
              <div className="grid gap-3 sm:grid-cols-4">
                {[["Respuesta humana", "15 min"], ["Aviso preventivo", "5 min antes"], ["Escalamiento", "15 min después"], ["Reasignación", "20 min después"]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#d6cbbb] bg-[#efe6d9] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{label}</p><p className="mt-2 font-serif text-xl text-[#37332d]">{value}</p></div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-[#625d55]">Si un lead sigue sin respuesta humana después del escalamiento, RevScale puede moverlo una sola vez a otro agente activo del mismo equipo con menor carga abierta. Si no hay reemplazo seguro, conserva la asignación y avisa a Dirección/Gerencia.</p>
            </Card>
          )}

          <Card title={<SectionTitle icon={PlugZap}>Módulos e integraciones</SectionTitle>} className="md:col-span-2">
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div key={integration.name} className="flex items-center justify-between rounded-xl border border-[#d6cbbb] p-4">
                  <span className="text-[#37332d]">{integration.name}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${integration.enabled ? "bg-[#dfe8da] text-[#41634a]" : "bg-[#eee5d7] text-[#7a7167]"}`}>{integration.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
