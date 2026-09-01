import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { googleSearchCampaign } from "@/lib/marketing/google-search-campaign";
import { metaRetargeting } from "@/lib/marketing/meta-retargeting";
import { evaluatePaidScaling } from "./actions";

const input = "w-full rounded-xl border border-[#d2c5b3] bg-white px-3 py-2 text-sm";

function money(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `USD ${Number(value).toFixed(2)}`;
}

export default async function PaidScalingPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ count: paidCount }, { count: caseCount }, { data: decisions }, { data: reviews }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id", { count: "exact", head: true }).eq("stage", "PAID").not("paid_at", "is", null),
    supabase.from("b2b_case_studies").select("id", { count: "exact", head: true }).eq("status", "READY"),
    supabase.from("b2b_paid_scaling_decisions").select("*").order("created_at", { ascending: false }).limit(12),
    supabase.from("b2b_paid_optimization_reviews").select("channel,campaign_key,verdict,traffic_quality,qualified_demo_count,cost_per_qualified_demo_usd,cpqd_to_gross_profit_ratio,created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const paid = paidCount || 0;
  const cases = caseCount || 0;
  const foundationReady = paid >= 10 && cases >= 3;
  const campaigns = [
    { label: "Google Search", channel: "GOOGLE_SEARCH", key: googleSearchCampaign.campaignKey, defaultBudget: googleSearchCampaign.dailyBudgetUsd },
    { label: "Meta Retargeting", channel: "META_RETARGETING", key: metaRetargeting.campaignKey, defaultBudget: metaRetargeting.monthlyBudgetUsd / 30 },
  ] as const;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#8d7553]">Fase 10 · Paso 81</p>
        <h1 className="mt-3 font-serif text-4xl">Escalado paid con gates</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[#6e665c]">
          Escalar solo cuando la adquisición ya sea repetible: mínimo 10 clientes pagos verificados, 3 casos READY, tráfico ICP limpio,
          demos calificadas atribuidas y CPQD ≤ 25% del beneficio bruto esperado del primer año. Este panel registra la decisión;
          nunca modifica presupuestos externos automáticamente.
        </p>

        {params.error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">{params.error}</p>}
        {params.success && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">{params.success}</p>}

        <section className="mt-7 grid gap-3 md:grid-cols-4">
          <Card label="Clientes pagos" value={`${paid}/10`} ok={paid >= 10} />
          <Card label="Casos READY" value={`${cases}/3`} ok={cases >= 3} />
          <Card label="Fundación" value={foundationReady ? "LISTA" : "BLOQUEADA"} ok={foundationReady} />
          <Card label="Cambio de Ads" value="MANUAL" ok={true} />
        </section>

        <section className="mt-7 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
          <h2 className="font-serif text-2xl">Evaluar aumento de presupuesto</h2>
          <p className="mt-2 text-sm text-[#6e665c]">No uses este formulario para justificar gasto sin señal. Si faltan gates, la decisión queda auditada como bloqueada.</p>
          <form action={evaluatePaidScaling} className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="text-sm">Canal
              <select name="channel" className={`${input} mt-1`}>
                {campaigns.map((c) => <option key={c.channel} value={c.channel}>{c.label}</option>)}
              </select>
            </label>
            <label className="text-sm">Campaña
              <select name="campaign_key" className={`${input} mt-1`}>
                {campaigns.map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
              </select>
            </label>
            <label className="text-sm">Budget diario actual (USD)
              <input name="current_daily_budget_usd" type="number" min="0" step="0.01" defaultValue={campaigns[0].defaultBudget.toFixed(2)} className={`${input} mt-1`} />
            </label>
            <label className="text-sm">Budget diario propuesto (USD)
              <input name="proposed_daily_budget_usd" type="number" min="0.01" step="0.01" defaultValue={(campaigns[0].defaultBudget * 1.2).toFixed(2)} className={`${input} mt-1`} />
            </label>
            <label className="lg:col-span-2 flex items-start gap-3 rounded-xl border border-[#ddd1c1] p-4 text-sm">
              <input name="volume_sufficiency_confirmed" type="checkbox" className="mt-1" />
              <span>Confirmo que el mercado/canal tiene volumen suficiente para absorber más presupuesto sin degradar calidad.</span>
            </label>
            <label className="lg:col-span-2 text-sm">Evidencia de volumen
              <textarea name="volume_evidence" rows={3} placeholder="Referencia verificable: impresiones perdidas por presupuesto, términos de alta intención, frecuencia, cobertura, etc." className={`${input} mt-1`} />
            </label>
            <button className="lg:col-span-2 rounded-xl bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-white">Evaluar gate de escalado</button>
          </form>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
            <h2 className="font-serif text-2xl">Reglas de escalado</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#6e665c]">
              <li>• 10+ clientes pagos verificados.</li>
              <li>• 3+ casos de estudio READY y verificables.</li>
              <li>• Review paid con gasto real y demos calificadas.</li>
              <li>• Tráfico marcado CLEAN.</li>
              <li>• CPQD ≤ 25% del GP esperado año 1.</li>
              <li>• Volumen adicional confirmado con evidencia.</li>
              <li>• Si CPQD &gt; 30% en reviews consecutivas: reestructurar, no escalar.</li>
            </ul>
          </article>
          <article className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
            <h2 className="font-serif text-2xl">Canales permitidos</h2>
            <p className="mt-3 text-sm leading-6 text-[#6e665c]">Paso 81 escala únicamente Google Search y Meta Retargeting ya preparados. LinkedIn Ads permanece fuera del loop automático y no se habilita desde este panel.</p>
            <div className="mt-4 space-y-3">{(reviews || []).length === 0 ? <p className="text-sm text-[#756c61]">Sin reviews paid todavía.</p> : (reviews || []).map((r: any) => <div key={`${r.channel}-${r.created_at}`} className="rounded-xl border border-[#ddd1c1] p-3 text-sm"><strong>{r.channel} · {r.verdict}</strong><p className="mt-1 text-xs text-[#746b60]">QD {r.qualified_demo_count} · CPQD {money(r.cost_per_qualified_demo_usd)} · ratio {r.cpqd_to_gross_profit_ratio == null ? "—" : `${(Number(r.cpqd_to_gross_profit_ratio) * 100).toFixed(1)}%`}</p></div>)}</div>
          </article>
        </section>

        <section className="mt-7 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
          <h2 className="font-serif text-2xl">Historial de decisiones</h2>
          <div className="mt-4 space-y-3">{(decisions || []).length === 0 ? <p className="text-sm text-[#756c61]">Sin evaluaciones de escalado todavía.</p> : (decisions || []).map((d: any) => <div key={d.id} className="rounded-xl border border-[#ddd1c1] p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{d.channel} · {d.verdict}</strong><span className="text-xs text-[#746b60]">{new Date(d.created_at).toLocaleString("es-UY")}</span></div><p className="mt-2 text-[#6e665c]">{d.reason}</p><p className="mt-2 text-xs">Budget {money(d.current_daily_budget_usd)} → {money(d.proposed_daily_budget_usd)} · pagos {d.verified_paid_customers}/10 · casos {d.ready_case_studies}/3 · QD {d.qualified_demo_count}</p></div>)}</div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-4"><p className="text-xs uppercase tracking-[.12em] text-[#8d7553]">{label}</p><p className="mt-2 font-serif text-2xl">{value}</p><p className="mt-1 text-xs text-[#756c61]">{ok ? "Gate cumplido" : "Pendiente"}</p></div>;
}
