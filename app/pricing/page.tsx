import Link from "next/link";
import { Check, LockKeyhole, Minus, ShieldCheck } from "lucide-react";
import { PLAN_CATALOG, PLAN_COMPARISON_ROWS, PAID_PLAN_ORDER, type BillingCycle } from "@/lib/plan-catalog";

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-[#776449]" strokeWidth={1.8} />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-[#aaa094]" strokeWidth={1.6} />;
  return <span>{value}</span>;
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ email?: string; new?: string; cycle?: string }> }) {
  const params = await searchParams;
  const email = String(params.email || "").trim();
  const cycle: BillingCycle = String(params.cycle || "MONTHLY").toUpperCase() === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const cycleHref = (nextCycle: BillingCycle) => `/pricing?cycle=${nextCycle}${email ? `&email=${encodeURIComponent(email)}` : ""}${params.new === "1" ? "&new=1" : ""}`;

  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-8 text-[#292722] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between border-b border-[#d5c8b6] pb-5">
          <Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl tracking-tight">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link>
          <Link href="/auth/login" className="text-sm text-[#625d55] transition hover:text-[#292722]">Iniciar sesión</Link>
        </div>

        <div className="mx-auto mt-16 max-w-4xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Planes</p>
          <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#29251f] md:text-6xl">Elegí cuánto querés que RevScale haga por tu operación.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#6d665d]">{params.new === "1" ? "Tu cuenta fue creada. Ahora elegí el nivel de operación que querés activar." : "Starter ordena. Professional automatiza y convierte. Enterprise escala equipos, captación y procesos complejos."}</p>
          <div className="mx-auto mt-7 inline-flex rounded-xl border border-[#cdbfa9] bg-[#f7f1e8] p-1">
            <Link href={cycleHref("MONTHLY")} className={`rounded-lg px-5 py-2 text-sm font-medium transition ${cycle === "MONTHLY" ? "bg-[#302b25] text-[#fffaf2]" : "text-[#625d55]"}`}>Mensual</Link>
            <Link href={cycleHref("ANNUAL")} className={`rounded-lg px-5 py-2 text-sm font-medium transition ${cycle === "ANNUAL" ? "bg-[#302b25] text-[#fffaf2]" : "text-[#625d55]"}`}>Anual · 2 meses gratis</Link>
          </div>
        </div>

        <section className="mt-12 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6 shadow-[0_18px_50px_rgba(70,58,42,.04)] md:p-8">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Cómo empezar</p>
            <h2 className="mt-3 font-serif text-3xl font-medium text-[#302b25] md:text-4xl">Diagnóstico → Revenue Recovery Pilot → Suscripción.</h2>
            <p className="mt-3 text-sm leading-6 text-[#716a61]">Para equipos con volumen, la ruta recomendada no es probar módulos al azar: primero identificamos dónde se pierden oportunidades, después activamos el flujo comercial y finalmente dejamos el plan adecuado funcionando como operación recurrente.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#d8ccbc] bg-[#efe6d8] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a714d]">01 · Diagnóstico</p>
              <h3 className="mt-3 font-serif text-2xl text-[#302b25]">Encontrar la fuga</h3>
              <p className="mt-2 text-sm leading-6 text-[#716a61]">Revisamos asignación, velocidad de respuesta, seguimientos, matching y reactivación para ubicar oportunidades que hoy quedan invisibles.</p>
            </div>
            <div className="rounded-xl border border-[#bda98a] bg-[#e5d7c3] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#745f43]">02 · 45 días</p>
              <h3 className="mt-3 font-serif text-2xl text-[#302b25]">Revenue Recovery Pilot</h3>
              <p className="mt-2 text-sm leading-6 text-[#665e54]">En 7 días dejamos la operación priorizada y durante 45 días medimos dónde se pierden o recuperan oportunidades concretas.</p>
            </div>
            <div className="rounded-xl border border-[#d8ccbc] bg-[#efe6d8] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a714d]">03 · Operación continua</p>
              <h3 className="mt-3 font-serif text-2xl text-[#302b25]">Suscripción</h3>
              <p className="mt-2 text-sm leading-6 text-[#716a61]">Una vez activado el proceso, elegís Starter, Professional o Enterprise según volumen, automatización, equipos y complejidad operativa.</p>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {PAID_PLAN_ORDER.map((planName) => {
            const plan = PLAN_CATALOG[planName];
            const totalPrice = cycle === "ANNUAL" ? plan.annual : plan.monthly;
            const requestHref = `/request?plan=${plan.name}&cycle=${cycle}${email ? `&email=${encodeURIComponent(email)}` : ""}`;
            return (
              <article key={plan.name} className={`flex h-full flex-col rounded-2xl border p-6 shadow-[0_18px_50px_rgba(70,58,42,.05)] ${plan.popular ? "border-[#a99270] bg-[#e5d7c3]" : "border-[#d5c8b6] bg-[#f7f1e8]"}`}>
                <div className="flex min-h-7 items-center justify-between gap-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">{plan.stage}</p>
                  {plan.popular && <span className="rounded-full border border-[#bda98a] bg-[#f0e6d8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#705d43]">Recomendado</span>}
                </div>
                <h2 className="mt-5 font-serif text-3xl font-medium text-[#302b25]">{plan.title}</h2>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#88775f]">{plan.audience}</p>
                <p className="mt-4 min-h-20 text-sm leading-6 text-[#716a61]">{plan.description}</p>

                <div className="mt-6 border-y border-[#d3c6b4] py-6">
                  <span className="font-serif text-5xl font-medium tracking-tight text-[#2d2923]">${totalPrice.toLocaleString("en-US")}</span>
                  <span className="ml-1 text-sm text-[#787168]">{cycle === "ANNUAL" ? "/año" : "/mes"}</span>
                  {cycle === "ANNUAL" && <p className="mt-2 text-xs font-medium text-[#806c4d]">Equivale a ${Math.round(plan.annual / 12)}/mes · 2 meses bonificados</p>}
                </div>

                <ul className="mt-6 space-y-3 text-sm text-[#5f5951]">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#816d4f]" strokeWidth={1.8} /><span>{feature}</span></li>)}
                </ul>

                {plan.lockedFeatures.length > 0 && (
                  <div className="mt-6 border-t border-[#d5c8b6] pt-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8c7d69]">Para el siguiente nivel</p>
                    <div className="space-y-2">
                      {plan.lockedFeatures.map((feature) => <div key={feature.label} className="flex items-start gap-2 rounded-lg border border-[#d3c6b4] bg-[#eee5d7] px-3 py-2 text-xs leading-5 text-[#7a7167]"><LockKeyhole className="mt-0.5 shrink-0" size={13} /><span>{feature.label} — {feature.requiredPlan}</span></div>)}
                    </div>
                  </div>
                )}

                <Link href={requestHref} className={`mt-auto block rounded-md px-5 py-3 text-center text-sm font-medium transition ${plan.popular ? "bg-[#302b25] text-[#f5eee4] hover:bg-[#211e1a]" : "border border-[#b9aa94] text-[#3c3730] hover:bg-[#e9dece]"}`}>Elegir {plan.title}</Link>
              </article>
            );
          })}
        </section>

        <section className="mt-14 overflow-hidden rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] shadow-[0_18px_50px_rgba(70,58,42,.04)]">
          <div className="border-b border-[#d5c8b6] px-6 py-6 md:px-8">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 shrink-0 text-[#7a674d]" size={20} strokeWidth={1.6} />
              <div><h2 className="font-serif text-2xl text-[#302b25]">Comparación rápida</h2><p className="mt-1 text-sm leading-6 text-[#716a61]">La diferencia entre planes está en el nivel de automatización y complejidad operativa, no en esconder funciones básicas.</p></div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead><tr className="border-b border-[#ddd1c1] text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#857b6e]"><th className="px-6 py-4 md:px-8">Capacidad</th><th className="px-4 py-4 text-center">Starter</th><th className="px-4 py-4 text-center">Professional</th><th className="px-4 py-4 text-center">Enterprise</th></tr></thead>
              <tbody>{PLAN_COMPARISON_ROWS.map((row) => <tr key={row.label} className="border-b border-[#e1d6c7] last:border-0"><td className="px-6 py-4 text-[#504a42] md:px-8">{row.label}</td><td className="px-4 py-4 text-center text-[#625d55]"><ComparisonCell value={row.starter} /></td><td className="px-4 py-4 text-center text-[#625d55]"><ComparisonCell value={row.professional} /></td><td className="px-4 py-4 text-center text-[#625d55]"><ComparisonCell value={row.enterprise} /></td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-[#8a8379]">Importes en USD. El plan anual se cobra una vez por 12 meses e incluye el equivalente a 2 meses sin cargo.</p>
      </div>
    </main>
  );
}
