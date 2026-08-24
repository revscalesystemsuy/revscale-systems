import Link from "next/link"
import { ArrowUpRight, Building2, CheckCircle2, Layers3, Sparkles, UsersRound } from "lucide-react"

const DEMOS = [
  {
    key: "starter",
    name: "Starter",
    eyebrow: "Recorrido operativo",
    title: "Vea cómo se ordena un día comercial.",
    description:
      "Entrá a una cartera chica, revisá leads, mové oportunidades, consultá propiedades y seguimientos. Esta demo muestra cómo RevScale reemplaza el caos operativo por una rutina clara.",
    icon: Building2,
    experiences: [
      "Empezar por un lead nuevo y llevarlo al pipeline.",
      "Revisar propiedades sin salir de la operación comercial.",
      "Detectar qué seguimiento toca hacer hoy.",
    ],
    footer: "Ideal para entender la base del sistema.",
  },
  {
    key: "professional",
    name: "Professional",
    eyebrow: "Recorrido de priorización",
    title: "Vea cómo RevScale decide qué merece atención.",
    description:
      "Explorá una operación con más volumen, señales de intención, WhatsApp IA, reportes y analítica. La experiencia está pensada para mostrar cómo pasar de administrar datos a decidir mejor.",
    icon: Sparkles,
    experiences: [
      "Detectar oportunidades calientes antes de que se enfríen.",
      "Ver una conversación calificada y derivada por WhatsApp IA.",
      "Leer reportes y analítica antes de repartir trabajo.",
    ],
    footer: "La demo más completa para entender el valor diario de RevScale.",
    popular: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    eyebrow: "Recorrido de control",
    title: "Vea cómo se supervisa una operación más grande.",
    description:
      "Recorré una vista pensada para coordinación, equipos y una operación con más complejidad. Esta demo pone el foco en control, visibilidad y consistencia comercial a escala.",
    icon: UsersRound,
    experiences: [
      "Revisar actividad del equipo desde una visión de gestión.",
      "Entender cómo escala el seguimiento cuando crece la operación.",
      "Explorar la capa de configuración y control del sistema.",
    ],
    footer: "Las conexiones externas reales permanecen desactivadas dentro de la demo.",
  },
] as const

export default function DemosPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-8 text-[#292722] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between border-b border-[#d5c8b6] pb-5">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-tight">RevScale</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-[#625d55] transition hover:text-[#292722]">Ver planes</Link>
            <Link href="/auth/login" className="text-sm text-[#625d55] transition hover:text-[#292722]">Iniciar sesión</Link>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-4xl text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#d2c4b0] bg-[#f7f1e8] text-[#806b4d]">
            <Layers3 size={19} strokeWidth={1.6} />
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Demos por tipo de operación</p>
          <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#29251f] md:text-6xl">
            Elegí qué versión de RevScale querés recorrer.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#6d665d]">
            Acá no repetimos precios ni listas de funcionalidades. Cada recorrido muestra una forma distinta de trabajar con RevScale, desde ordenar el día a día hasta supervisar una operación más grande.
          </p>
        </div>

        <section className="mt-14 grid gap-5 lg:grid-cols-3">
          {DEMOS.map((demo) => {
            const Icon = demo.icon
            return (
              <article
                key={demo.key}
                className={`relative flex min-h-full flex-col rounded-2xl border p-6 shadow-[0_18px_50px_rgba(70,58,42,.05)] ${demo.popular ? "border-[#a99270] bg-[#e5d7c3]" : "border-[#d5c8b6] bg-[#f7f1e8]"}`}
              >
                {demo.popular && (
                  <span className="absolute right-5 top-5 rounded-full border border-[#bda98a] bg-[#f0e6d8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#705d43]">
                    Recomendada
                  </span>
                )}

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d1c3af] bg-[#eee4d5] text-[#745f43]">
                  <Icon size={18} strokeWidth={1.6} />
                </div>
                <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">{demo.eyebrow}</p>
                <h2 className="mt-3 font-serif text-3xl font-medium leading-tight text-[#302b25]">{demo.name}</h2>
                <p className="mt-3 text-lg font-medium leading-7 text-[#403a32]">{demo.title}</p>
                <p className="mt-4 text-sm leading-6 text-[#716a61]">{demo.description}</p>

                <div className="mt-6 border-t border-[#d3c6b4] pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c7a61]">Durante el recorrido</p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5f5951]">
                    {demo.experiences.map((experience) => (
                      <li key={experience} className="flex gap-2.5">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#816d4f]" strokeWidth={1.7} />
                        <span>{experience}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-6 text-xs leading-5 text-[#82796d]">{demo.footer}</p>

                <div className="mt-auto pt-7">
                  <Link
                    href={`/demo?plan=${demo.key}`}
                    className={`flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition ${demo.popular ? "bg-[#302b25] text-[#f5eee4] hover:bg-[#211e1a]" : "border border-[#b9aa94] text-[#3c3730] hover:bg-[#e9dece]"}`}
                  >
                    Ver demo {demo.name}
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </article>
            )
          })}
        </section>

        <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-[#d5c8b6] bg-[#f7f1e8] px-5 py-4 text-center text-sm leading-6 text-[#6e675e]">
          Podés cambiar de demo en cualquier momento desde el menú lateral. Ninguna demo realiza cobros, envía mensajes reales ni conecta servicios externos.
        </div>
      </div>
    </main>
  )
}
