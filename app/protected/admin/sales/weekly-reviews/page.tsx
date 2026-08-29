import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ClipboardCheck, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Opportunity = { id: string; company: string; contact_name: string | null; stage: string; next_step: string | null; next_step_due_at: string | null };
type Score = { opportunity_id: string; score_total: number; band: string; evaluated_at: string };
type Review = { opportunity_id: string; review_week: string; decision_next_week: string; decision_due_at: string; reviewed_at: string };

export default async function WeeklyReviewsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunitiesData }, { data: scoresData }, { data: reviewsData }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step,next_step_due_at").in("stage", ["PILOT_ACTIVE","PAID"]).order("updated_at", { ascending: false }),
    supabase.from("b2b_activation_scores").select("opportunity_id,score_total,band,evaluated_at").order("evaluated_at", { ascending: false }),
    supabase.from("b2b_weekly_reviews").select("opportunity_id,review_week,decision_next_week,decision_due_at,reviewed_at").order("reviewed_at", { ascending: false }),
  ]);

  const opportunities = (opportunitiesData || []) as Opportunity[];
  const latestScore = new Map<string, Score>();
  for (const row of (scoresData || []) as Score[]) if (!latestScore.has(row.opportunity_id)) latestScore.set(row.opportunity_id, row);
  const latestReview = new Map<string, Review>();
  for (const row of (reviewsData || []) as Review[]) if (!latestReview.has(row.opportunity_id)) latestReview.set(row.opportunity_id, row);
  const eligible = opportunities.filter((x) => latestScore.has(x.id));
  const reviewed = eligible.filter((x) => latestReview.has(x.id)).length;
  const blocked = eligible.filter((x) => latestScore.get(x.id)?.band !== "ACTIVATED").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/admin/sales/activation" className="text-sm text-[#7a6e5c]">← Volver a Activation Score</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 7 · Paso 59</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Weekly reviews</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Una revisión semanal por cuenta para convertir señales de adopción en una decisión concreta, con responsable y fecha.</p></div>
        <section className="mt-8 grid gap-4 md:grid-cols-3"><Summary icon={<ClipboardCheck size={17}/>} label="Con Activation Score" value={eligible.length}/><Summary icon={<CalendarDays size={17}/>} label="Con review registrada" value={reviewed}/><Summary icon={<TriangleAlert size={17}/>} label="En riesgo/crítico" value={blocked}/></section>
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {eligible.map((item) => { const score = latestScore.get(item.id)!; const review = latestReview.get(item.id); return <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-start justify-between gap-4"><div><Link href={`/protected/admin/sales/weekly-reviews/${item.id}`} className="font-serif text-2xl underline decoration-[#b8a487] underline-offset-4">{item.company}</Link><p className="mt-1 text-xs text-[#746c62]">{item.contact_name || "Contacto pendiente"} · {item.stage}</p></div><span className="rounded-full border border-[#cdbda5] bg-[#eee4d5] px-3 py-1 text-[10px] font-semibold">{score.score_total}/100 · {score.band}</span></div>{review ? <div className="mt-4 text-sm leading-6 text-[#625d55]"><p><strong>Última review:</strong> {review.review_week}</p><p><strong>Decisión:</strong> {review.decision_next_week}</p><p><strong>Vence:</strong> {new Date(review.decision_due_at).toLocaleString("es-UY")}</p></div> : <p className="mt-4 text-sm text-[#746c62]">Todavía no hay weekly review para esta cuenta.</p>}<p className="mt-4 text-xs leading-5 text-[#81786d]">Próximo paso: {item.next_step || "Registrar weekly review"}</p></article>; })}
          {!eligible.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-8 text-center text-sm text-[#81786d] lg:col-span-2">Todavía no hay cuentas con Activation Score para revisar.</div>}
        </section>
      </div>
    </main>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
