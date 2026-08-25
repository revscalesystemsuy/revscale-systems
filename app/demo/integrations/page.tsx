import { Globe2, PlugZap, Webhook } from "lucide-react"
import { PageHeader } from "../demo-ui"

const INTEGRATIONS = [
  { name: "WhatsApp Business", detail: "Conversaciones, calificación y derivación humana", status: "Conectado", icon: PlugZap },
  { name: "Web leads", detail: "Captura automática desde formularios y landing pages", status: "Activo", icon: Globe2 },
  { name: "Webhooks", detail: "Salida de eventos comerciales hacia sistemas externos", status: "Activo", icon: Webhook },
  { name: "Portal inmobiliario", detail: "Sincronización de inventario y oportunidades", status: "Disponible", icon: PlugZap },
]

export default function DemoIntegrationsPage() {
  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-6xl"><PageHeader eyebrow="Enterprise" title="Integraciones" subtitle="Capa de conectividad para operaciones más complejas. En la demo todo es visual y ninguna conexión externa se ejecuta."/><section className="grid gap-5 md:grid-cols-2">{INTEGRATIONS.map(({name,detail,status,icon:Icon})=><article key={name} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><Icon size={18}/></span><span className="rounded-full border border-[#a9b39b] bg-[#e1e5d9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4f5d43]">{status}</span></div><h2 className="mt-5 font-serif text-2xl text-[#37332d]">{name}</h2><p className="mt-2 text-sm leading-6 text-[#6f685f]">{detail}</p><button disabled className="mt-6 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#6f685f] opacity-70">Configurar en cuenta real</button></article>)}</section></div></main>
}
