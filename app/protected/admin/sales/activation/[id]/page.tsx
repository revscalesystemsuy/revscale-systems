import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { recordActivationScore } from "../actions";

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<{ error?: string; success?: string }> };

type Score = {
  id: string;
  score_total: number;
  band: string;
  evaluated_at: string;
  owner_next_step_pct: number;
  today_usage_days: number;
  overdue_reviewed: boolean;
  matches_alerts_processed: boolean;
  manager_weekly_review: boolean;
  data_sources_complete: boolean;
};

export default async function ActivationDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunity }, { data: baseline }, { data: scores }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_pilot_baselines").select("id,status,locked_at").eq("opportunity_id", id).maybeSingle(),
    supabase.from("b2b_activation_scores").select("id,score_total,band,evaluated_at,owner_next_step_pct,today_usage_days,overdue_reviewed,matches_alerts_processed,manager_weekly_review,data_sources_complete").eq("opportunity_id", id).order("evaluated_at", { ascending: false }).limit(10),
  ]);
  if (!opportunity) redirect("/protected/admin/sales/activation");
  const history = (scores || []) as Score[];
  const latest = history[0];
  const eligible = baseline?.status === "LOCKED";

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/protected/admin/sales/activation" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a Activation Score</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 7 · Paso 58</p><h1 className="mt-3 font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#6e665d]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage}</p></div>
        {query.error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{query.error}</div>}
        {query.success && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{query.success}</div>}

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Última evaluación</p><p className="mt-2 font-serif text-3xl">{latest ? `${latest.score_total}/100` : "Sin medir"}</p></div><span className="rounded-full border border-[#cdbda5] bg-[#eee4d5] px-3 py-1 text-xs font-semibold">{latest?.band || (eligible ? "LISTA" : "BASELINE PENDIENTE")}</span></div>
          <p className="mt-4 text-sm text-[#6e665d]">Umbrales: 75+ ACTIVATED · 50–74 RISK · &lt;50 CRITICAL.</p>
        </section>

        <form action={recordActivationScore} className="mt-6 space-y-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
          <input type="hidden" name="opportunity_id" value={opportunity.id}/>
          <div><h2 className="font-serif text-2xl">Evaluación con evidencia</h2><p className="mt-1 text-sm text-[#6e665d]">No marques una señal como cumplida sin evidencia observable.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <SignalNumber label="Leads activos con owner + próximo paso (%)" name="owner_next_step_pct" min="0" max="100" defaultValue={latest?.owner_next_step_pct ?? ""} evidence="owner_next_step_evidence" threshold="≥80% = 25 pts" />
            <SignalNumber label="Uso de Qué hacer hoy (días de 5)" name="today_usage_days" min="0" max="5" defaultValue={latest?.today_usage_days ?? ""} evidence="today_usage_evidence" threshold="≥4/5 = 25 pts" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SignalCheck label="Seguimientos vencidos revisados" name="overdue_reviewed" evidence="overdue_evidence" points="15 pts" />
            <SignalCheck label="Matches / alertas procesados" name="matches_alerts_processed" evidence="matches_evidence" points="10 pts" />
            <SignalCheck label="Manager hizo revisión semanal" name="manager_weekly_review" evidence="manager_review_evidence" points="15 pts" />
            <SignalCheck label="Datos / fuentes suficientemente completos" name="data_sources_complete" evidence="data_quality_evidence" points="10 pts" />
          </div>
          <label className="block"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Notas</span><textarea name="notes" rows={4} className="mt-2 w-full rounded-xl border border-[#cdbfa9] bg-white p-3 text-sm" placeholder="Fricciones, cambios de rutina, contexto de la medición…"/></label>
          <button disabled={!eligible} className="rounded-xl bg-[#302d28] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Calcular y registrar Activation Score</button>
          {!eligible && <p className="text-sm text-[#8a5d49]">Primero bloqueá el baseline de esta cuenta.</p>}
        </form>

        <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Historial</h2><div className="mt-4 space-y-3">{history.map((score) => <div key={score.id} className="flex items-center justify-between rounded-xl border border-[#ded3c2] bg-white p-4 text-sm"><span>{new Date(score.evaluated_at).toLocaleString("es-UY", { timeZone: "America/Montevideo" })}</span><strong>{score.score_total}/100 · {score.band}</strong></div>)}{!history.length && <p className="text-sm text-[#746c62]">Todavía no hay evaluaciones.</p>}</div></section>
      </div>
    </main>
  );
}

function SignalNumber({ label, name, min, max, defaultValue, evidence, threshold }: { label: string; name: string; min: string; max: string; defaultValue: string | number; evidence: string; threshold: string }) {
  return <div className="rounded-xl border border-[#ded3c2] bg-white p-4"><label className="block text-sm font-semibold">{label}<input type="number" name={name} min={min} max={max} defaultValue={defaultValue} required className="mt-2 w-full rounded-lg border border-[#cdbfa9] p-2"/></label><p className="mt-2 text-xs text-[#7b7061]">{threshold}</p><textarea name={evidence} rows={3} className="mt-3 w-full rounded-lg border border-[#cdbfa9] p-2 text-sm" placeholder="Evidencia observable…"/></div>;
}

function SignalCheck({ label, name, evidence, points }: { label: string; name: string; evidence: string; points: string }) {
  return <div className="rounded-xl border border-[#ded3c2] bg-white p-4"><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name={name}/>{label}</label><p className="mt-2 text-xs text-[#7b7061]">{points}</p><textarea name={evidence} rows={3} className="mt-3 w-full rounded-lg border border-[#cdbfa9] p-2 text-sm" placeholder="Evidencia si se marca como cumplido…"/></div>;
}
