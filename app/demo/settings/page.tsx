import { DEMO_COMPANY } from "@/lib/demo-data"
import { PageHeader, Card } from "../demo-ui"

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
          <Card title="🏢 Organización">
            <div className="space-y-2 text-slate-300">
              <p>Nombre: {DEMO_COMPANY.name}</p>
              <p>Mercado: {DEMO_COMPANY.market}</p>
              <p>Plan: PropertyOS Pro</p>
            </div>
          </Card>

          <Card title="📍 Zonas activas">
            <div className="flex flex-wrap gap-2">
              {DEMO_COMPANY.zones.map((z) => (
                <span
                  key={z}
                  className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-300"
                >
                  {z}
                </span>
              ))}
            </div>
          </Card>

          <Card title="🔌 Integraciones" className="md:col-span-2">
            <div className="space-y-3">
              {[
                { name: "WhatsApp Business", status: "Conectado" },
                { name: "Portal inmobiliario", status: "Conectado" },
                { name: "Matching IA", status: "Activo" },
                { name: "Reportes automáticos", status: "Pendiente" },
              ].map((int) => (
                <div
                  key={int.name}
                  className="flex items-center justify-between rounded-xl border border-white/10 p-4"
                >
                  <span className="text-slate-200">{int.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      int.status === "Pendiente"
                        ? "bg-slate-500/10 text-slate-400"
                        : "bg-green-500/10 text-green-400"
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
