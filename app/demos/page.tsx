import Link from "next/link";
import { ArrowUpRight, Building2, CheckCircle2, Layers3, PlayCircle, Sparkles, UsersRound } from "lucide-react";
import { PLAN_CATALOG, PAID_PLAN_ORDER, type PaidPlanName } from "@/lib/plan-catalog";

const ICONS: Record<PaidPlanName, typeof Building2> = {
  STARTER: Building2,
  PROFESSIONAL: Sparkles,
  ENTERPRISE: UsersRound,
};

const DEMO_KEYS: Record<PaidPlanName, "starter" | "professional" | "enterprise"> = {
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
};

const SALES_NARRATIVE = [
  {
    step: "01 · El problema",
    title: "La oportunidad invisible",
    description: "El lead ya existe, pero queda repartido entre mensajes, memoria, planillas y seguimientos sin dueño. El problema no es generar más actividad: es no saber qué oportunidad necesita acción ahora.",
  },
  {
    step: "02 · El mecanismo",
    title: "Prioridad + contexto + próximo paso",
    description: "RevScale convierte cada oportunidad en una unidad operativa: responsable claro, prioridad, contexto comercial y una próxima acción visible para el equipo.",
  },
  {
    step: "03 · El avance",
    title: "Mover lo que puede convertirse",
    description: "Qué hacer hoy, matching, WhatsApp y Opportunity Radar ayudan a decidir qué mover primero, por qué y quién debe hacerse cargo, sin sumar trabajo manual innecesario.",
  },
  {
    step: "04 · La dirección",
    title: "Medir proceso, no actividad",
    description: "Dirección puede ver SLA, seguimientos, riesgo, reactivaciones y oportunidades avanzando. La pregunta deja de ser cuántos leads entraron y pasa a ser qué oportunidades estamos moviendo.",
  },
];

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
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Cómo funciona RevScale</p>
          <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#29251f] md:text-6xl">
            De la oportunidad invisible al próximo paso.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#6d665d]">
            RevScale no intenta sumar otro lugar donde mirar leads. Ordena qué oportunidad mover ahora, por qué importa y qué debería pasar después.
          </p>
          <Link href="/demo/recorrido?plan=professional" className="mx-auto mt-7 inline-flex items-center gap-2 rounded-md bg-[#2f2b25] px-6 py-3 font-semibold text-[#f5eee4] transition hover:bg-[#1f1c18]">
            <PlayCircle size={17} strokeWidth={1.7} /> Empezar recorrido guiado de 7 minutos <ArrowUpRight size={15} />
          </Link>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-[#81796e]">El recorrido recomendado usa Professional y datos 100% ficticios de demo. No representa resultados de clientes.</p>
        </div>

        <section className="mt-12 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6 shadow-[0_18px_50px_rgba(70,58,42,.04)] md:p-8">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Narrativa comercial</p>
            <h2 className="mt-3 font-serif text-3xl font-medium text-[#302b25] md:text-4xl">El recorrido que vas a ver en la demo.</h2>
            <p className="mt-3 text-sm leading-6 text-[#716a61]">La demo sigue una sola historia: detectar una oportunidad que hoy puede quedar oculta, darle prioridad y contexto, ejecutar el próximo paso y mostrarle a dirección qué cambió.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {SALES_NARRATIVE.map((item) => (
              <article key={item.step} className="rounded-xl border border-[#d8ccbc] bg-[#efe6d8] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a714d]">{item.step}</p>
                <h3 className="mt-3 font-serif text-2xl leading-tight text-[#302b25]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#716a61]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mx-auto mt-14 max-w-4xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Exploración libre por plan</p>
          <h2 className="mt-4 font-serif text-4xl font-medium tracking-tight text-[#29251f] md:text-5xl">O elegí el nivel de operación que querés recorrer.</h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#6d665d]">Starter ordena. Professional prioriza, automatiza y convierte. Enterprise agrega gobierno para equipos y operaciones complejas. Cada demo respeta el alcance real del plan.</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#81796e]">Todas empiezan en <strong className="font-semibold text-[#5f5548]">Qué hacer hoy</strong>: primero ves qué requiere acción; después podés abrir el lead, revisar matching, WhatsApp, reactivación y dirección desde el menú.</p>
        </div>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {PAID_PLAN_ORDER.map((planName) => {
            const plan = PLAN_CATALOG[planName];
            const Icon = ICONS[planName];
            const demoKey = DEMO_KEYS[planName];
            return (
              <article
                key={plan.name}
                className={`relative flex min-h-full flex-col rounded-2xl border p-6 shadow-[0_18px_50px_rgba(70,58,42,.05)] ${plan.popular ? "border-[#a99270] bg-[#e5d7c3]" : "border-[#d5c8b6] bg-[#f7f1e8]"}`}
              >
                {plan.popular && (
                  <span className="absolute right-5 top-5 rounded-full border border-[#bda98a] bg-[#f0e6d8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#705d43]">
                    Recomendada
                  </span>
                )}

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d1c3af] bg-[#eee4d5] text-[#745f43]">
                  <Icon size={18} strokeWidth={1.6} />
                </div>
                <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">{plan.stage}</p>
                <h2 className="mt-3 font-serif text-3xl font-medium leading-tight text-[#302b25]">{plan.title}</h2>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#88775f]">{plan.audience}</p>
                <p className="mt-4 text-lg font-medium leading-7 text-[#403a32]">{plan.demo.title}</p>
                <p className="mt-4 text-sm leading-6 text-[#716a61]">{plan.demo.description}</p>

                <div className="mt-6 border-t border-[#d3c6b4] pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c7a61]">Qué vas a ver</p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5f5951]">
                    {plan.demo.experiences.map((experience) => (
                      <li key={experience} className="flex gap-2.5">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#816d4f]" strokeWidth={1.7} />
                        <span>{experience}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-6 text-xs leading-5 text-[#82796d]">{plan.demo.footer}</p>

                <div className="mt-auto pt-7">
                  <Link
                    href={`/demo/today?plan=${demoKey}`}
                    className={`flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition ${plan.popular ? "bg-[#302b25] text-[#f5eee4] hover:bg-[#211e1a]" : "border border-[#b9aa94] text-[#3c3730] hover:bg-[#e9dece]"}`}
                  >
                    Empezar recorrido {plan.title}
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-[#d5c8b6] bg-[#f7f1e8] px-5 py-4 text-center text-sm leading-6 text-[#6e675e]">
          Podés cambiar de demo en cualquier momento desde el menú lateral. Ninguna demo realiza cobros, envía mensajes reales ni conecta servicios externos.
        </div>
      </div>
    </main>
  );
}
