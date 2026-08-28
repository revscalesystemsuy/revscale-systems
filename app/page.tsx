import Link from "next/link"
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Gauge,
  MessagesSquare,
  Radar,
  ShieldCheck,
  Target,
  Workflow,
} from "lucide-react"

const diagnosticQuestions = [
  "¿Cuántos leads entraron y nunca tuvieron un próximo paso claro?",
  "¿Cuántas oportunidades dependen hoy de memoria, chats o planillas paralelas?",
  "¿Cuántas propiedades compatibles existen sin que el agente las vea a tiempo?",
  "¿Qué seguimientos vencidos, SLA o reactivaciones debería revisar dirección hoy?",
]

const flow = [
  ["01", "Priorizar", "RevScale ordena qué oportunidad requiere acción ahora según intención, SLA, seguimiento y riesgo."],
  ["02", "Entender", "Cada lead conserva responsable, contexto, preferencias, etapa y próximo paso en un solo lugar."],
  ["03", "Conectar", "Matching cruza demanda e inventario y explica por qué una propiedad puede encajar con un comprador."],
  ["04", "Mover", "WhatsApp, seguimiento y Opportunity Radar ayudan a ejecutar la próxima acción sin perder contexto."],
]

const faqs = [
  ["¿RevScale reemplaza mi CRM actual?", "Puede convertirse en el sistema comercial principal o convivir durante una migración. El foco no es sumar otra base de datos, sino que cada oportunidad tenga dueño, prioridad y próximo paso."],
  ["¿Necesito cambiar cómo trabaja todo el equipo desde el día uno?", "No. La activación se hace por etapas: importación, responsables, pipeline, SLA, Qué hacer hoy y luego capacidades como matching, WhatsApp o automatizaciones según el plan."],
  ["¿Es solo para inmobiliarias grandes?", "No. Starter cubre equipos chicos; Professional está pensado para operaciones con volumen; Enterprise agrega gobierno para varios equipos, territorios, desarrollos e integraciones."],
  ["¿Cómo sé si está funcionando?", "El Revenue Recovery Pilot define baseline, criterios de activación y revisiones semanales. No medimos solo actividad: medimos ownership, próximos pasos, uso operativo y oportunidades movidas."],
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[#efe6d8] text-[#292722]">
      <nav className="sticky top-0 z-20 border-b border-[#d5c8b6] bg-[#f5eee4]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-tight">RevScale</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden text-sm text-[#625d55] transition hover:text-[#2d2923] sm:inline">Planes</Link>
            <Link href="/demos" className="rounded-md border border-[#b9aa94] px-4 py-2 text-sm font-medium text-[#38342d] transition hover:bg-[#e7dbca]">Ver cómo funciona</Link>
            <Link href="/auth/login" className="rounded-md bg-[#2f2b25] px-4 py-2 text-sm font-medium text-[#f5eee4] transition hover:bg-[#1f1c18]">Ingresar</Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[76vh] max-w-7xl items-center gap-14 px-6 py-16 md:px-8 lg:grid-cols-[1.12fr_.88fr] lg:py-24">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a714d]">Inteligencia comercial inmobiliaria</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-medium leading-[1.02] tracking-tight text-[#29251f] md:text-7xl">Menos leads perdidos. Más operaciones avanzando.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#69635a]">Centralizá las consultas de tu operación y convertí cada lead en una próxima acción: RevScale prioriza qué atender, encuentra propiedades compatibles y deja cada seguimiento con dueño, contexto y próximo paso.</p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/demos" className="inline-flex items-center gap-2 rounded-md bg-[#2f2b25] px-6 py-3 font-medium text-[#f5eee4] transition hover:bg-[#1f1c18]">Ver cómo funciona en 7 minutos <ArrowUpRight size={16} /></Link>
            <Link href="/diagnostico" className="rounded-md border border-[#b9aa94] px-6 py-3 font-medium text-[#39352e] transition hover:bg-[#e7dbca]">Diagnosticar mi operación</Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#81796e]">Primero entendé cómo se priorizan las oportunidades. Si tiene sentido para tu equipo, seguimos con un diagnóstico y una activación asistida.</p>
        </div>

        <div className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-5 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-7">
          <div className="border-b border-[#ddd1c1] pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c8478]">Qué hacer hoy</p>
            <p className="mt-2 font-serif text-3xl text-[#302b25]">Una cola comercial ordenada por prioridad.</p>
          </div>
          <div className="divide-y divide-[#ddd1c1]">
            <div className="flex gap-4 py-5"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5d9c8] text-[#79664c]"><MessagesSquare size={18} /></div><div><p className="font-medium text-[#37322b]">Responder</p><p className="mt-1 text-sm leading-6 text-[#746e65]">Leads con intención alta o SLA en riesgo antes de que pierdan temperatura.</p></div></div>
            <div className="flex gap-4 py-5"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5d9c8] text-[#79664c]"><Target size={18} /></div><div><p className="font-medium text-[#37322b]">Avanzar</p><p className="mt-1 text-sm leading-6 text-[#746e65]">Visitas, negociaciones y próximos pasos que ya tienen contexto suficiente.</p></div></div>
            <div className="flex gap-4 py-5"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5d9c8] text-[#79664c]"><Radar size={18} /></div><div><p className="font-medium text-[#37322b]">Reactivar</p><p className="mt-1 text-sm leading-6 text-[#746e65]">Oportunidades que vuelven a tener motivo comercial por precio, disponibilidad o nuevo match.</p></div></div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d5c8b6] bg-[#e8ddce]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#816d50]">Diagnóstico comercial</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#302b25] md:text-5xl">¿Qué pasó con tus últimos 100 leads?</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#6d665d]">La fuga rara vez es solamente “falta de leads”. Suele estar entre la consulta y la siguiente acción: asignación, respuesta, seguimiento, matching o reactivación.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {diagnosticQuestions.map((question) => <div key={question} className="rounded-xl border border-[#cfbfa8] bg-[#f5eee4] p-5 text-sm leading-6 text-[#5f5951]"><CheckCircle2 className="mb-4 h-5 w-5 text-[#806b4d]" strokeWidth={1.6} />{question}</div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-8">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Cómo funciona</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-[#302b25] md:text-5xl">De la oportunidad invisible a una próxima acción concreta.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {flow.map(([number, title, description]) => <article key={number} className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">{number}</p><h3 className="mt-4 font-serif text-2xl text-[#302b25]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#716a61]">{description}</p></article>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 md:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#bda98a] bg-[#e5d7c3] p-7 md:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#c3b090] bg-[#eee3d3] text-[#745f43]"><Gauge size={20} strokeWidth={1.6} /></div>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#745f43]">Operación diaria</p>
            <h2 className="mt-3 font-serif text-3xl text-[#302b25]">Qué hacer hoy + lead + matching + WhatsApp.</h2>
            <p className="mt-4 text-sm leading-6 text-[#645c52]">El agente no debería empezar el día revisando todo. RevScale ordena la prioridad, concentra el contexto del lead, muestra propiedades compatibles y conserva el próximo paso comercial.</p>
            <Link href="/demos" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#4d4234] underline decoration-[#9f8968] underline-offset-4">Ver el flujo en la demo <ArrowUpRight size={14} /></Link>
          </article>

          <article className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 md:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d1c3af] bg-[#eee4d5] text-[#745f43]"><Building2 size={20} strokeWidth={1.6} /></div>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Dirección</p>
            <h2 className="mt-3 font-serif text-3xl text-[#302b25]">Visibilidad de proceso, no una colección de dashboards.</h2>
            <p className="mt-4 text-sm leading-6 text-[#716a61]">Dirección puede revisar pendientes, SLA, riesgo, pipeline, reactivaciones y ROI comercial sin depender de reconstruir la operación desde mensajes sueltos o reportes manuales.</p>
            <Link href="/demos" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#594c3d] underline decoration-[#a89271] underline-offset-4">Ver la experiencia Professional <ArrowUpRight size={14} /></Link>
          </article>
        </div>
      </section>

      <section className="border-y border-[#d5c8b6] bg-[#f5eee4]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:px-8 lg:grid-cols-[1fr_.8fr] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Implementación</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#302b25]">Activación asistida, no una prueba libre sin contexto.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#6d665d]">Para equipos con volumen recomendamos el Revenue Recovery Pilot: activación en 7 días, baseline inicial y 45 días para medir dónde se pierden o recuperan oportunidades.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/pilot" className="inline-flex items-center gap-2 rounded-md bg-[#2f2b25] px-5 py-3 text-sm font-medium text-[#f5eee4]">Ver Revenue Recovery Pilot <ArrowUpRight size={15} /></Link><Link href="/pricing" className="rounded-md border border-[#b9aa94] px-5 py-3 text-sm font-medium text-[#39352e]">Comparar planes</Link></div>
          </div>
          <div className="rounded-2xl border border-[#d5c8b6] bg-[#efe6d8] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#806b4d]">Definición de activación</p>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-[#5f5951]">
              <li className="flex gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#745f43]" />Leads activos con responsable y próximo paso.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#745f43]" />Uso recurrente de la cola Qué hacer hoy.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#745f43]" />Matches, riesgo y reactivaciones revisados.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#745f43]" />Dirección revisando SLA y pendientes semanalmente.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Prueba honesta</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#302b25]">No publicamos resultados que todavía no podemos demostrar.</h2>
            <p className="mt-5 text-sm leading-6 text-[#716a61]">Las métricas de la demo son datos simulados para mostrar el producto. La prueba comercial real se construye con baseline, activación y resultados antes/después de cada implementación.</p>
          </div>
          <div className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#806b4d]">Qué sí medimos</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Ownership y próximo paso", "Velocidad y SLA", "Uso operativo", "Matches y reactivaciones", "Oportunidades movidas", "Conversión pilot → pago"].map((item) => <div key={item} className="rounded-lg border border-[#ddd1c1] bg-[#efe6d8] px-4 py-3 text-sm text-[#5e574e]">{item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20 md:px-8">
        <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Preguntas frecuentes</p><h2 className="mt-4 font-serif text-4xl text-[#302b25] md:text-5xl">Lo importante antes de evaluar RevScale.</h2></div>
        <div className="mt-10 divide-y divide-[#d8ccbc] rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] px-6 md:px-8">
          {faqs.map(([question, answer]) => <div key={question} className="py-6"><h3 className="font-medium text-[#37322b]">{question}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#716a61]">{answer}</p></div>)}
        </div>
      </section>

      <section className="bg-[#302b25] text-[#f5eee4]">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center md:px-8 md:py-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c8b99f]">Siguiente paso</p>
          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-4xl leading-tight md:text-5xl">Encontrá primero dónde se están perdiendo tus oportunidades.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-[#d5ccc0]">Mirá el flujo completo y después evaluamos si tu operación tiene suficiente volumen y fricción para justificar una activación asistida.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/demos" className="inline-flex items-center gap-2 rounded-md bg-[#f0e6d8] px-6 py-3 font-medium text-[#302b25]">Ver cómo funciona en 7 minutos <ArrowUpRight size={16} /></Link><Link href="/diagnostico" className="rounded-md border border-[#766b5c] px-6 py-3 font-medium text-[#f0e6d8]">Diagnosticar mi operación</Link></div>
        </div>
      </section>
    </main>
  )
}