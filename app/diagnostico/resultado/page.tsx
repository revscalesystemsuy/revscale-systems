import Link from "next/link";
import { ArrowUpRight, Gauge, Radar, ShieldCheck } from "lucide-react";

type Tier = "A" | "B" | "C" | "LOW";
type Recommendation = "PILOT" | "DIAGNOSTIC_REVIEW" | "DEMO_FIRST";

const VALID_TIERS = new Set<Tier>(["A", "B", "C", "LOW"]);
const VALID_RECOMMENDATIONS = new Set<Recommendation>(["PILOT", "DIAGNOSTIC_REVIEW", "DEMO_FIRST"]);

export default async function DiagnosticResultPage({ searchParams }: { searchParams: Promise<{ score?: string; tier?: string; recommendation?: string }> }) {
  const params = await searchParams;
  const parsedScore = Number.parseInt(String(params.score || "0"), 10);
  const score = Number.isFinite(parsedScore) ? Math.min(100, Math.max(0, parsedScore)) : 0;
  const tierCandidate = String(params.tier || "LOW").toUpperCase() as Tier;
  const recommendationCandidate = String(params.recommendation || "DEMO_FIRST").toUpperCase() as Recommendation;
  const tier: Tier = VALID_TIERS.has(tierCandidate) ? tierCandidate : "LOW";
  const recommendation: Recommendation = VALID_RECOMMENDATIONS.has(recommendationCandidate) ? recommendationCandidate : "DEMO_FIRST";

  const content = resultContent(tier, recommendation);

  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-8 text-[#292722] md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between border-b border-[#d5c8b6] pb-5">
          <Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl tracking-tight">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link>
          <Link href="/diagnostico" className="text-sm text-[#625d55] transition hover:text-[#292722]">Repetir diagnóstico</Link>
        </div>

        <section className="mx-auto max-w-4xl py-14 text-center md:py-20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#d2c4b0] bg-[#f7f1e8] text-[#806b4d]"><Gauge size={20} strokeWidth={1.6} /></div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Resultado del diagnóstico</p>
          <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#29251f] md:text-6xl">Score de encaje: {score}/100</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#6d665d]">{content.summary}</p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <article className="rounded-2xl border border-[#bda98a] bg-[#e5d7c3] p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#705d43]">Tier {tier}</p>
            <p className="mt-3 font-serif text-6xl text-[#302b25]">{score}</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#d2c1a7]"><div className="h-full rounded-full bg-[#6f604b]" style={{ width: `${score}%` }} /></div>
            <p className="mt-5 text-sm leading-6 text-[#5f5951]">Este score mide fit operativo con el problema que RevScale resuelve. No es un benchmark de mercado ni una estimación de ingresos.</p>
          </article>

          <article className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d1c3af] bg-[#eee4d5] text-[#745f43]"><Radar size={18} strokeWidth={1.6} /></div>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Siguiente paso recomendado</p>
            <h2 className="mt-3 font-serif text-3xl text-[#302b25]">{content.title}</h2>
            <p className="mt-4 text-sm leading-6 text-[#716a61]">{content.detail}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={content.primaryHref} className="inline-flex items-center gap-2 rounded-md bg-[#2f2b25] px-5 py-3 text-sm font-semibold text-[#f5eee4] transition hover:bg-[#1f1c18]">{content.primaryLabel} <ArrowUpRight size={15} /></Link>
              <Link href={content.secondaryHref} className="rounded-md border border-[#b9aa94] px-5 py-3 text-sm font-semibold text-[#39352e] transition hover:bg-[#e7dbca]">{content.secondaryLabel}</Link>
            </div>
          </article>
        </section>

        <div className="mx-auto my-10 max-w-3xl rounded-xl border border-[#d5c8b6] bg-[#f7f1e8] p-5 text-sm leading-6 text-[#6e675e]">
          <div className="flex gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#806b4d]" strokeWidth={1.6} /><p>El diagnóstico usa señales de equipo, volumen, canales, WhatsApp, dolor de seguimiento, inversión y acceso a decisión. La validación definitiva se hace sobre la operación real y su baseline.</p></div>
        </div>
      </div>
    </main>
  );
}

function resultContent(tier: Tier, recommendation: Recommendation) {
  if (tier === "A" || tier === "B" || recommendation === "PILOT") {
    return {
      summary: "Hay suficiente señal de volumen y complejidad para evaluar una activación asistida de RevScale.",
      title: "Revisar la operación y evaluar el Revenue Recovery Pilot.",
      detail: "El siguiente paso útil no es mirar más módulos: es identificar dónde se pierden oportunidades, fijar baseline y validar si RevScale puede entrar con responsables, SLA, prioridad y próximos pasos.",
      primaryHref: "/pilot",
      primaryLabel: "Ver el pilot de 45 días",
      secondaryHref: "/demos",
      secondaryLabel: "Ver el producto primero",
    };
  }

  if (tier === "C" || recommendation === "DIAGNOSTIC_REVIEW") {
    return {
      summary: "Hay señales de fricción comercial, aunque todavía conviene validar volumen, proceso y urgencia antes de una implementación completa.",
      title: "Profundizar el diagnóstico antes de activar.",
      detail: "RevScale puede tener sentido, pero la mejor decisión es revisar primero cómo entran, se asignan y se siguen las oportunidades para evitar comprar complejidad que el equipo todavía no necesita.",
      primaryHref: "/pilot",
      primaryLabel: "Ver alcance del diagnóstico",
      secondaryHref: "/demos",
      secondaryLabel: "Explorar la demo",
    };
  }

  return {
    summary: "Hoy el encaje operativo es bajo. Eso no significa que haya un problema: puede indicar que el volumen o la complejidad todavía no justifican una activación asistida.",
    title: "Entender el producto antes de avanzar.",
    detail: "Empezá por la demo pública. Si el volumen, las fuentes de leads o la necesidad de seguimiento crecen, podés repetir este diagnóstico con datos actualizados.",
    primaryHref: "/demos",
    primaryLabel: "Ver cómo funciona",
    secondaryHref: "/pricing",
    secondaryLabel: "Ver planes",
  };
}
