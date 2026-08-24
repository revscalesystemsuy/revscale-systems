import { Building2, MapPin, PlugZap } from "lucide-react"
import { DEMO_COMPANY } from "@/lib/demo-data"
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

export default function DemoSettingsPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Configuración"
          title="Configuración"
          subtitle="Vista de demostración. Los ajustes no se guardan en modo demo."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <Card title={<SectionTitle icon={Building2}>Organización</SectionTitle>}>
            <div className="space-y-2 text-[#4f4a42]">
              <p>Nombre: {DEMO_COMPANY.name}</p>
              <p>Mercado: {DEMO_COMPANY.market}</p>
              <p>Plan: PropertyOS Pro</p>
            </div>
          </Card>

          <Card title={<SectionTitle icon={MapPin}>Zonas activas</SectionTitle>}>
            <div className="flex flex-wrap gap-2">
              {DEMO_COMPANY.zones.map((z) => (
                <span
                  key={z}
                  className="rounded-full bg-white/5 px-3 py-1 text-sm text-[#4f4a42]"
                >
                  {z}
                </span>
              ))}
            </div>
          </Card>

          <Card title={<SectionTitle icon={PlugZap}>Integraciones</SectionTitle>} className="md:col-span-2">
            <div className="space-y-3">
              {[
                { name: "WhatsApp Business", status: "Conectado" },
                { name: "Portal inmobiliario", status: "Conectado" },
                { name: "Matching inteligente", status: "Activo" },
                { name: "Reportes automáticos", status: "Pendiente" },
              ].map((int) => (
                <div
                  key={int.name}
                  className="flex items-center justify-between rounded-xl border border-white/10 p-4"
                >
                  <span className="text-[#37332d]">{int.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      int.status === "Pendiente"
                        ? "bg-slate-500/10 text-[#625d55]"
                        : "bg-green-500/10 text-[#41634a]"
                    }`}
                  >
                    {int.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
