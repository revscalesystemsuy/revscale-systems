import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { lockBeforeAfterMeasurement, saveBeforeAfterMeasurement } from "../actions";

type DecisionBaseline = { metric?: string; baseline?: string; notes?: string | null };
type DecisionResult = { metric?: string; result?: string; notes?: string | null };
type Measurement = { id: string; measurement_day: number; status: string; measured_at: string; dataset_reference: string; measurement_scope: string; active_leads_count: number; source_count: number | null; unowned_leads_count: number; no_next_step_count: number; overdue_followups_count: number; high_intent_inactive_count: number | null; median_first_response_minutes: number | null; reactivation_candidates_count: number | null; reactivations_completed_count: number | null; matches_processed_count: number | null; opportunities_moved_count: number | null; decision_metric_results: DecisionResult[]; evidence_notes: string; attribution_notes: string; limitations: string };

const deltaPct = (before: number | null, after: number | null) => {
  if (before === null || after === null || before === 0) return null;
  return ((after - before) / before) * 100;
};

export default async function BeforeAfterDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunity }, { data: baseline }, { data: measurements }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_pilot_baselines").select("*").eq("opportunity_id", id).maybeSingle(),
    supabase.from("b2b_before_after_measurements").select("*").eq("opportunity_id", id).order("measurement_day", { ascending: true }),
  ]);
  if (!opportunity) redirect("/protected/admin/sales/before-after");
  if (!baseline || baseline.status !== "LOCKED") redirect(`/protected/admin/sales/before-after?error=${encodeURIComponent("La cuenta necesita baseline bloqueado")}`);

  const rows = (measurements || []) as Measurement[];
  const baselineDecision = (Array.isArray(baseline.decision_metric_baselines) ? baseline.decision_metric_baselines : []) as DecisionBaseline[];
  const latest = rows.at(-1) || null;

  const comparisons = [
    ["Sin owner", baseline.unowned_leads_count, latest?.unowned_leads_count ?? null],
    ["Sin próximo paso", baseline.no_next_step_count, latest?.no_next_step_count ?? null],
    ["Seguimientos vencidos", baseline.overdue_followups_count, latest?.overdue_followups_count ?? null],
    ["Alta intención inactiva", baseline.high_intent_inactive_count, latest?.high_intent_inactive_count ?? null],
    ["Mediana 1ª respuesta (min)", baseline.median_first_response_minutes, latest?.median_first_response_minutes ?? null],
    ["Candidatos reactivación", baseline.reactivation_candidates_count, latest?.reactivation_candidates_count ?? null],
  ] as const;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected/admin/sales/before-after" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a métricas</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 60 · Before / After</p><h1 className="mt-3 font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#6f675d]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage}</p></div>
        {sp.error && <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{sp.error}</div>}{sp.success && <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{sp.success}</div>}

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Baseline bloqueado</h2><p className="mt-2 text-xs text-[#746c62]">Dataset: {baseline.dataset_reference || "—"} · Captura: {baseline.captured_at ? new Date(baseline.captured_at).toLocaleString("es-UY") : "—"}</p><div className="mt-4 grid gap-3 md:grid-cols-3"><Metric label="Leads activos" value={baseline.active_leads_count}/><Metric label="Sin owner" value={baseline.unowned_leads_count}/><Metric label="Sin próximo paso" value={baseline.no_next_step_count}/><Metric label="Vencidos" value={baseline.overdue_followups_count}/><Metric label="Alta intención inactiva" value={baseline.high_intent_inactive_count}/><Metric label="Respuesta mediana" value={baseline.median_first_response_minutes === null ? "—" : `${baseline.median_first_response_minutes} min`}/></div></section>

        {latest && <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Comparación más reciente · Día {latest.measurement_day}</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[#d8cbb8] text-xs uppercase tracking-wide text-[#7d7163]"><th className="py-2">Métrica</th><th>Antes</th><th>Después</th><th>Δ</th></tr></thead><tbody>{comparisons.map(([label,before,after]) => { const delta = deltaPct(before === null ? null : Number(before), after === null ? null : Number(after)); return <tr key={label} className="border-b border-[#eee3d4]"><td className="py-2">{label}</td><td>{before ?? "—"}</td><td>{after ?? "—"}</td><td>{delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}</td></tr>; })}</tbody></table></div><p className="mt-4 text-xs leading-5 text-[#786f65]">El cambio cuantitativo no implica causalidad. Atribución declarada: {latest.attribution_notes}</p><p className="mt-2 text-xs leading-5 text-[#786f65]">Limitaciones: {latest.limitations}</p></section>}

        <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Registrar medición comparable</h2><p className="mt-2 text-sm text-[#70685e]">Usá el mismo universo y definición del baseline. Las 3 métricas de decisión deben conservar nombre y orden.</p><form action={saveBeforeAfterMeasurement} className="mt-5 grid gap-4 md:grid-cols-2"><input type="hidden" name="opportunity_id" value={id}/><Field label="Día del piloto"><input name="measurement_day" type="number" min="1" max="45" required className="input"/></Field><Field label="Fecha/hora medida"><input name="measured_at" type="datetime-local" required className="input"/></Field><Field label="Referencia dataset"><input name="dataset_reference" required className="input"/></Field><Field label="Alcance / universo"><input name="measurement_scope" required className="input"/></Field><Field label="Leads activos"><input name="active_leads_count" type="number" min="0" required className="input"/></Field><Field label="Fuentes"><input name="source_count" type="number" min="0" className="input"/></Field><Field label="Sin owner"><input name="unowned_leads_count" type="number" min="0" required className="input"/></Field><Field label="Sin próximo paso"><input name="no_next_step_count" type="number" min="0" required className="input"/></Field><Field label="Vencidos"><input name="overdue_followups_count" type="number" min="0" required className="input"/></Field><Field label="Alta intención inactiva"><input name="high_intent_inactive_count" type="number" min="0" className="input"/></Field><Field label="Mediana 1ª respuesta (min)"><input name="median_first_response_minutes" type="number" min="0" step="0.1" className="input"/></Field><Field label="Candidatos reactivación"><input name="reactivation_candidates_count" type="number" min="0" className="input"/></Field><Field label="Reactivaciones completadas"><input name="reactivations_completed_count" type="number" min="0" className="input"/></Field><Field label="Matches procesados"><input name="matches_processed_count" type="number" min="0" className="input"/></Field><Field label="Oportunidades movidas"><input name="opportunities_moved_count" type="number" min="0" className="input"/></Field><div className="md:col-span-2 rounded-xl border border-[#dfd2c0] bg-[#f8f0e5] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#756247]">Métricas de decisión del baseline</p>{baselineDecision.map((m, i) => <p key={i} className="mt-2 text-sm">{i+1}. <strong>{m.metric || "Sin nombre"}</strong> · baseline: {m.baseline || "—"}</p>)}</div><Field label="Resultados de las 3 métricas · métrica | resultado | nota" wide><textarea name="decision_metric_results" required rows={4} className="input" placeholder={baselineDecision.map((m) => `${m.metric || "Métrica"} | resultado | evidencia`).join("\n")}/></Field><Field label="Evidencia observable" wide><textarea name="evidence_notes" required rows={4} className="input"/></Field><Field label="Notas de atribución" wide><textarea name="attribution_notes" required rows={3} className="input" placeholder="Qué puede atribuirse prudentemente a RevScale y qué no."/></Field><Field label="Limitaciones" wide><textarea name="limitations" required rows={3} className="input" placeholder="Cambios de equipo, estacionalidad, campañas, calidad de datos, etc."/></Field><button className="rounded-xl bg-[#37322c] px-5 py-3 text-sm font-semibold text-white md:col-span-2">Guardar medición</button></form></section>

        <section className="mt-6 space-y-3">{rows.map((m) => <article key={m.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center justify-between gap-3"><div><p className="font-serif text-xl">Día {m.measurement_day}</p><p className="text-xs text-[#786f65]">{new Date(m.measured_at).toLocaleString("es-UY")} · {m.dataset_reference}</p></div><span className="rounded-full border border-[#cdbda5] px-3 py-1 text-[10px] font-semibold">{m.status}</span></div><p className="mt-3 text-sm text-[#625d55]">{m.evidence_notes}</p>{m.status !== "LOCKED" && <form action={lockBeforeAfterMeasurement} className="mt-4"><input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="measurement_day" value={m.measurement_day}/><button className="inline-flex items-center gap-2 rounded-lg border border-[#ad9b83] px-3 py-2 text-xs font-semibold"><LockKeyhole size={14}/> Bloquear medición</button></form>}</article>)}</section>
      </div>
    </main>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={wide ? "md:col-span-2" : ""}><span className="mb-1 block text-xs font-semibold text-[#6c6257]">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string | number | null }) { return <div className="rounded-xl border border-[#e1d5c4] bg-[#faf3e9] p-3"><p className="text-[10px] uppercase tracking-wide text-[#827667]">{label}</p><p className="mt-1 font-serif text-xl">{value ?? "—"}</p></div>; }
