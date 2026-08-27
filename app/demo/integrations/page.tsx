import Link from "next/link"
import { Globe2, MessageCircle, PlugZap, Radio, ShieldCheck, Webhook } from "lucide-react"
import { PageHeader } from "../demo-ui"

const INTEGRATIONS = [
  { name: "Web leads", detail: "Captura automática desde formularios y landing pages", status: "Activo", icon: Globe2 },
  { name: "Webhooks", detail: "Salida de eventos comerciales hacia sistemas externos", status: "Activo", icon: Webhook },
]

export default function DemoIntegrationsPage() {
  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <PageHeader eyebrow="Enterprise · Demo ficticia" title="Integraciones" subtitle="Capa de conectividad para operaciones más complejas. La demo replica el flujo del producto sin usar credenciales externas reales." />

        <section className="mb-5 rounded-2xl border border-[#cbb99f] bg-[#efe3d3] p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex max-w-3xl gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d2c5b3] bg-[#fffaf2] text-[#786447]"><MessageCircle size={18} /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-2xl text-[#37332d]">WhatsApp Business</h2><span className="rounded-full border border-[#c4b795] bg-[#eee4d5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66583f]">Preparado</span></div>
                <p className="mt-2 text-sm leading-6 text-[#665f56]">Webhook, inbox, calificación, estados de entrega y handoff forman parte del flujo demostrado. En una cuenta real, el estado pasa a LIVE únicamente después de vincular un WABA/número real y verificar Meta.</p>
              </div>
            </div>
            <Link href="/demo/inbox?plan=enterprise" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">Ver Inbox demo</Link>
          </div>
        </section>

        <section className="mb-5 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-[#b6bea6] bg-[#e8ebdf] p-6">
            <div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c4ccb8] bg-[#fffaf2] text-[#667154]"><Radio size={18}/></span><span className="rounded-full border border-[#a9b39b] bg-[#f4f6ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4f5d43]">LIVE disponible</span></div>
            <h2 className="mt-5 font-serif text-2xl text-[#37332d]">Mercado Libre Inmuebles</h2>
            <p className="mt-2 text-sm leading-6 text-[#5e6655]">La cuenta real usa OAuth por inmobiliaria. Los tokens quedan cifrados en backend y RevScale permite validar, publicar, sincronizar, pausar y reactivar cada aviso sin crear duplicados.</p>
            <div className="mt-5 space-y-2 rounded-xl border border-[#c8ceb9] bg-[#fffaf2] p-4 text-sm text-[#625d55]"><Feature text="Conexión solo por Dirección."/><Feature text="Validación oficial antes de publicar."/><Feature text="ID externo, URL, errores y última sync guardados."/><Feature text="Refresh token automático desde backend."/></div>
            <Link href="/demo/distribution/mercadolibre?plan=enterprise" className="mt-5 block rounded-lg bg-[#302d28] px-4 py-2.5 text-center text-sm font-semibold !text-[#fffaf2]">Ver flujo de publicación</Link>
          </article>

          <article className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><PlugZap size={18}/></span><span className="rounded-full border border-[#cbb99f] bg-[#efe3d3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#755c3f]">Convenio requerido</span></div>
            <h2 className="mt-5 font-serif text-2xl text-[#37332d]">InfoCasas</h2>
            <p className="mt-2 text-sm leading-6 text-[#6f685f]">La arquitectura del producto ya contempla el proveedor, pero la activación LIVE se habilita únicamente con credenciales y especificación técnica oficial de la cuenta inmobiliaria.</p>
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4 text-xs leading-5 text-[#665f56]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/> RevScale no presenta como conectada una integración que dependa de un convenio externo todavía inexistente.</div>
          </article>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {INTEGRATIONS.map(({ name, detail, status, icon: Icon }) => (
            <article key={name} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
              <div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><Icon size={18} /></span><span className="rounded-full border border-[#a9b39b] bg-[#e1e5d9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4f5d43]">{status}</span></div>
              <h2 className="mt-5 font-serif text-2xl text-[#37332d]">{name}</h2><p className="mt-2 text-sm leading-6 text-[#6f685f]">{detail}</p><button disabled className="mt-6 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#6f685f] opacity-70">Configurar en cuenta real</button>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

function Feature({ text }: { text: string }) { return <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#657052]"/><span>{text}</span></div> }
