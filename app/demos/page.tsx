import Link from "next/link"
import { ArrowUpRight, Building2, CheckCircle2, Layers3, Sparkles, UsersRound } from "lucide-react"

type DemoCard = {
  key: "starter" | "professional" | "enterprise"
  name: string
  eyebrow: string
  title: string
  description: string
  icon: typeof Building2
  experiences: string[]
  footer: string
  popular: boolean
}

const DEMOS: DemoCard[] = [
  {
    key: "starter",
    name: "Starter",
    eyebrow: "Hasta 3 agentes",
    title: "Ordená la operación comercial esencial.",
    description:
      "Recorré una inmobiliaria chica con gestión de leads, pipeline, propiedades, interacciones y seguimientos. La demo respeta el alcance real del plan y no muestra módulos avanzados que no están incluidos.",
    icon: Building2,
    experiences: [
      "Gestionar leads y mover oportunidades por el pipeline.",
      "Trabajar con hasta 3 agentes, 500 leads y 100 propiedades.",
      "Organizar seguimientos, tareas e interacciones comerciales.",
      "Ver que WhatsApp IA, Matching, Reportes y Analítica no forman parte de Starter.",
    ],
    footer: "Ideal para equipos chicos que necesitan orden comercial sin complejidad extra.",
    popular: false,
  },
  {
    key: "professional",
    name: "Professional",
    eyebrow: "Hasta 15 agentes",
    title: "Priorizá oportunidades y automatizá el trabajo diario.",
    description:
      "La demo Professional suma a la operación base las capas que ayudan a vender con más criterio: Matching inteligente, WhatsApp IA, reportes y analítica avanzada.",
    icon: Sparkles,
    experiences: [
      "Trabajar con hasta 15 agentes y leads ilimitados.",
      "Usar Matching inteligente para detectar propiedades compatibles.",
      "Ver WhatsApp IA calificando, respondiendo y derivando a una persona.",
      "Revisar Reportes y Analítica para decidir qué mover primero.",
    ],
    footer: "La demo recomendada para equipos que ya tienen volumen y necesitan priorización.",
    popular: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    eyebrow: "Hasta 30 agentes",
    title: "Coordiná equipos, roles y automatizaciones a escala.",
    description:
      "Enterprise incluye todo lo de Professional y agrega la capa de gestión organizacional: multi-equipo, roles, asignación automática e integraciones avanzadas.",
    icon: UsersRound,
    experiences: [
      "Trabajar con hasta 30 agentes y varios equipos comerciales.",
      "Ver equipos separados por zona, managers y carga de trabajo.",
      "Explorar roles, asignación automática e integraciones avanzadas.",
      "Usar WhatsApp IA, Matching, Reportes y Analítica a escala de organización.",
    ],
    footer: "Las conexiones externas reales permanecen desactivadas dentro de la demo.",
    popular: false,
  },
]

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
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Demos por plan</p>
          <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#29251f] md:text-6xl">
            Cada demo muestra exactamente el nivel que estás evaluando.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#6d665d]">
            Starter, Professional y Enterprise ya no son recorridos genéricos: cada uno muestra sus propios límites, módulos y forma de trabajo.
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c7a61]">Qué vas a ver</p>
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
