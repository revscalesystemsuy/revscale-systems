import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  PlugZap,
  ShieldCheck,
} from "lucide-react";

type RequiredPlan = "Professional" | "Enterprise";

const CONTENT = {
  "Reportes comerciales": {
    eyebrow: "Inteligencia comercial",
    icon: BarChart3,
    benefits: [
      "Embudo comercial y evolución de oportunidades.",
      "Actividad y seguimiento del equipo.",
      "Resultados para detectar dónde se pierden leads.",
    ],
  },
  "Analytics avanzado": {
    eyebrow: "Rendimiento comercial",
    icon: BarChart3,
    benefits: [
      "Métricas avanzadas de conversión.",
      "Lectura del rendimiento por fuente y período.",
      "Indicadores para optimizar el pipeline comercial.",
    ],
  },
  Integraciones: {
    eyebrow: "Ecosistema conectado",
    icon: PlugZap,
    benefits: [
      "Conexiones con canales y herramientas externas.",
      "Automatizaciones para evitar carga manual.",
      "Centralización de oportunidades dentro de RevScale.",
    ],
  },
} as const;

export default function UpgradePlanGate({
  title,
  description,
  requiredPlan,
}: {
  title: string;
  description: string;
  requiredPlan: RequiredPlan;
}) {
  const config = CONTENT[title as keyof typeof CONTENT] ?? {
    eyebrow: "Función avanzada",
    icon: ShieldCheck,
    benefits: [
      "Más automatización para tu operación comercial.",
      "Mayor visibilidad sobre oportunidades y actividad.",
      "Herramientas avanzadas para hacer crecer tu equipo.",
    ],
  };
  const Icon = config.icon;
  const planLabel = requiredPlan === "Professional" ? "Profesional" : "Enterprise";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">
              {config.eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">
              {description}
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-2 text-xs font-semibold text-[#655842]">
            <CircleDashed size={14} strokeWidth={1.7} /> Disponible en {planLabel}
          </span>
        </div>

        <section className="mt-8 rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.05)]">
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-[#cdbfa9] bg-[#eee4d5] p-2.5 text-[#705f47]">
              <Icon size={20} strokeWidth={1.7} />
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-[#37332d]">
                Esta función está incluida desde {planLabel}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#665f56]">
                Tu plan actual sigue funcionando con normalidad. Si necesitás esta capacidad, podés comparar los planes y ampliar la suscripción cuando quieras.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} strokeWidth={1.7} className="text-[#786448]" />
              <div>
                <h2 className="font-serif text-xl font-medium text-[#37332d]">Qué desbloqueás</h2>
                <p className="mt-1 text-sm text-[#6b6359]">Capacidades pensadas para una operación comercial más completa.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {config.benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[#6d7557]" />
                  <p className="text-sm leading-6 text-[#554f47]">{benefit}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#d2c5b3] bg-[#eee4d5] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#806d50]">
              Plan necesario
            </p>
            <p className="mt-3 font-serif text-3xl font-medium text-[#37332d]">{planLabel}</p>
            <p className="mt-3 text-sm leading-6 text-[#554f47]">
              Podés ver tu suscripción actual, comparar límites y elegir el plan que mejor se adapte a tu inmobiliaria.
            </p>

            <Link
              href="/protected/billing"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]"
            >
              Mejorar plan <ArrowUpRight size={16} strokeWidth={1.7} />
            </Link>
            <Link
              href="/pricing"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-[#c9bca9] bg-[#f7f0e6] px-5 py-3 text-sm font-semibold text-[#655842] transition hover:bg-[#f0e7da]"
            >
              Comparar planes
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
