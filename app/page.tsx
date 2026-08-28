import Link from "next/link"
import { ArrowUpRight, Building2, MessagesSquare, Workflow } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#efe6d8] text-[#292722]">
      <nav className="border-b border-[#d5c8b6] bg-[#f5eee4]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-tight">RevScale</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden text-sm text-[#625d55] transition hover:text-[#2d2923] sm:inline">
              Planes
            </Link>
            <Link
              href="/demos"
              className="rounded-md border border-[#b9aa94] px-4 py-2 text-sm font-medium text-[#38342d] transition hover:bg-[#e7dbca]"
            >
              Ver cómo funciona
            </Link>
            <Link
              href="/auth/login"
              className="rounded-md bg-[#2f2b25] px-4 py-2 text-sm font-medium text-[#f5eee4] transition hover:bg-[#1f1c18]"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[72vh] max-w-7xl items-center gap-14 px-6 py-16 md:px-8 lg:grid-cols-[1.12fr_.88fr] lg:py-24">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a714d]">
            Inteligencia comercial inmobiliaria
          </p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-medium leading-[1.02] tracking-tight text-[#29251f] md:text-7xl">
            Menos leads perdidos. Más operaciones avanzando.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#69635a]">
            Centralizá las consultas de tu operación y convertí cada lead en una próxima acción: RevScale prioriza qué atender, encuentra propiedades compatibles y deja cada seguimiento con dueño, contexto y próximo paso.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/demos"
              className="inline-flex items-center gap-2 rounded-md bg-[#2f2b25] px-6 py-3 font-medium text-[#f5eee4] transition hover:bg-[#1f1c18]"
            >
              Ver cómo funciona en 7 minutos
              <ArrowUpRight size={16} />
            </Link>
            <Link
              href="/pilot"
              className="rounded-md border border-[#b9aa94] px-6 py-3 font-medium text-[#39352e] transition hover:bg-[#e7dbca]"
            >
              Diagnosticar mi operación
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#81796e]">
            Primero entendé cómo se priorizan las oportunidades. Si tiene sentido para tu equipo, seguimos con un diagnóstico y una activación asistida.
          </p>
        </div>

        <div className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-5 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-7">
          <div className="border-b border-[#ddd1c1] pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c8478]">Hoy en tu cartera</p>
            <p className="mt-2 font-serif text-3xl text-[#302b25]">12 oportunidades requieren acción</p>
          </div>

          <div className="divide-y divide-[#ddd1c1]">
            <div className="flex gap-4 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5d9c8] text-[#79664c]"><MessagesSquare size={18} /></div>
              <div>
                <p className="font-medium text-[#37322b]">Seguimientos pendientes</p>
                <p className="mt-1 text-sm leading-6 text-[#746e65]">Contactos con intención alta que todavía esperan respuesta.</p>
              </div>
            </div>
            <div className="flex gap-4 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5d9c8] text-[#79664c]"><Workflow size={18} /></div>
              <div>
                <p className="font-medium text-[#37322b]">Pipeline comercial</p>
                <p className="mt-1 text-sm leading-6 text-[#746e65]">Visualizá visitas, negociaciones y cierres en una sola vista.</p>
              </div>
            </div>
            <div className="flex gap-4 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5d9c8] text-[#79664c]"><Building2 size={18} /></div>
              <div>
                <p className="font-medium text-[#37322b]">Cartera y demanda</p>
                <p className="mt-1 text-sm leading-6 text-[#746e65]">Entendé qué propiedades concentran más interés comercial.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
