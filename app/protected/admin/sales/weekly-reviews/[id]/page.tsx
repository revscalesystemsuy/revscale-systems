import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordWeeklyReview } from "../actions";

export default async function WeeklyReviewDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunity }, { data: scores }, { data: reviews }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_activation_scores").select("id,score_total,band,owner_next_step_pct,today_usage_days,evaluated_at").eq("opportunity_id", id).order("evaluated_at", { ascending: false }).limit(5),
    supabase.from("b2b_weekly_reviews").select("review_week,activation_score,owner_next_step_pct,today_usage_days,overdue_followups_count,blocked_items,wins,product_learning,decision_next_week,decision_owner,decision_due_at,sponsor_present,evidence_notes,reviewed_at").eq("opportunity_id", id).order("reviewed_at", { ascending: false }).limit(8),
  ]);
  if (!opportunity) redirect("/protected/admin/sales/weekly-reviews");
  const latestScore = scores?.[0];
  if (!latestScore) redirect(`/protected/admin/sales/activation/${id}`);

  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10"><div className="mx-auto max-w-5xl">
      <Link href="/protected/admin/sales/weekly-reviews" className="text-sm text-[#7a6e5c]">← Volver a weekly reviews</Link>
      <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 7 · Paso 59</p><h1 className="mt-3 font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#746c62]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage}</p></div>
      {query.error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p>}{query.success && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p>}
      <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><h2 className="font-serif text-2xl">Señales que llegan del Activation Score</h2><div className="mt-4 grid gap-3 md:grid-cols-3 text-sm"><p>Score: <strong>{latestScore.score_total}/100</strong></p><p>Banda: <strong>{latestScore.band}</strong></p><p>Owner + next step: <strong>{latestScore.owner_next_step_pct}%</strong></p><p>Qué hacer hoy: <strong>{latestScore.today_usage_days}/5 días</strong></p><p>Evaluado: <strong>{new Date(latestScore.evaluated_at).toLocaleString("es-UY")}</strong></p></div></section>
      <form action={recordWeeklyReview} className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><input type="hidden" name="opportunity_id" value={id}/><h2 className="font-serif text-2xl">Registrar review semanal</h2><p className="mt-2 text-sm text-[#746c62]">La review no reescribe el score: registra el estado, bloqueos y una decisión concreta para la próxima semana.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Semana"><input name="review_week" type="date" defaultValue={today} className="input" required/></Field><Field label="Seguimientos vencidos actuales"><input name="overdue_followups_count" type="number" min="0" defaultValue="0" className="input" required/></Field></div>
        <Field label="Qué funcionó / wins"><textarea name="wins" className="input min-h-24"/></Field><Field label="Bloqueos de activación"><textarea name="blocked_items" className="input min-h-24"/></Field><Field label="Aprendizaje de producto"><textarea name="product_learning" className="input min-h-24"/></Field><Field label="Evidencia observada"><textarea name="evidence_notes" className="input min-h-28" required placeholder="Datos, comportamiento observado, links internos o notas verificables."/></Field>
        <label className="mt-4 flex items-center gap-2 text-sm"><input name="sponsor_present" type="checkbox"/> Sponsor/manager participó de la revisión</label>
        <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Decisión para próxima semana"><input name="decision_next_week" className="input" required/></Field><Field label="Responsable"><input name="decision_owner" className="input" required/></Field><Field label="Fecha límite"><input name="decision_due_at" type="datetime-local" className="input" required/></Field></div>
        <button className="mt-6 rounded-xl bg-[#302d28] px-5 py-3 text-sm font-semibold text-white">Guardar weekly review</button>
      </form>
      <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><h2 className="font-serif text-2xl">Historial</h2><div className="mt-4 space-y-3">{(reviews || []).map((r, index) => <article key={`${r.review_week}-${index}`} className="rounded-xl border border-[#e0d5c5] bg-[#faf5ed] p-4 text-sm leading-6"><div className="flex justify-between gap-4"><strong>{r.review_week}</strong><span>{r.activation_score ?? "—"}/100</span></div><p><strong>Decisión:</strong> {r.decision_next_week} — {r.decision_owner}</p><p><strong>Vencidos:</strong> {r.overdue_followups_count ?? "—"} · <strong>Sponsor:</strong> {r.sponsor_present ? "sí" : "no"}</p>{r.blocked_items && <p><strong>Bloqueos:</strong> {r.blocked_items}</p>}{r.product_learning && <p><strong>Aprendizaje:</strong> {r.product_learning}</p>}</article>)}{!reviews?.length && <p className="text-sm text-[#81786d]">Todavía no hay reviews registradas.</p>}</div></section>
      <style>{`.input{margin-top:.35rem;width:100%;border:1px solid #cdbfa9;border-radius:.75rem;background:#fffdf8;padding:.7rem .8rem;color:#302d28}.input:focus{outline:2px solid #b8a487;outline-offset:1px}`}</style>
    </div></main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-4 block text-sm font-medium text-[#625d55]">{label}{children}</label>; }
