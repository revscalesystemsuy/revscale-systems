import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarClock, CircleDollarSign, Compass, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buildRevenueSnapshot, getRevenueWeek, type RevenueConversionEvent, type RevenueOpportunity } from "@/lib/b2b-revenue-review";
import { saveWeeklyRevenueReview } from "./actions";

type Review = {
  id: string;
  week_start: string;
  hypotheses: string | null;
  results: string | null;
  decisions: string | null;
  next_focus: string | null;
  reviewed_at: string;
};

const sourceLabels: Record<string, string> = { UNKNOWN:"Sin atribuir", WEBSITE:"Website", WHATSAPP:"WhatsApp", EMAIL:"Email", LINKEDIN:"LinkedIn", REFERRAL:"Referral", PARTNER:"Partner", OUTBOUND:"Outbound", EVENT:"Evento", OTHER:"Otro" };
const lossLabels: Record<string, string> = { NO_FIT:"No encaja con ICP", NO_RESPONSE:"Sin respuesta", PRICE:"Precio", TIMING:"Timing", COMPETITOR:"Competidor", NO_DECISION:"Sin decisión", INTERNAL_PRIORITY:"Prioridad interna", TECHNICAL_GAP:"Gap técnico", OTHER:"Otro", UNKNOWN:"Sin clasificar" };

function pct(value: number | null) { return value === null ? "Sin muestra" : `${value}%`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-UY", { dateStyle:"medium", timeStyle:"short", timeZone:"America/Montevideo" }).format(new Date(value)); }

export default async function WeeklyRevenueReviewPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunityData }, { data: eventData }, { data: reviewData }] = await Promise.all([
    supabase.from("b2b_opportunities").select("stage,tier,acquisition_source,next_step_due_at,created_at,lost_at,loss_reason,demo_booked_at,demo_completed_at,pilot_proposed_at,pilot_started_at,paid_at"),
    supabase.from("b2b_conversion_events").select("event_type,occurred_at"),
    supabase.from("b2b_revenue_reviews").select("id,week_start,hypotheses,results,decisions,next_focus,reviewed_at").order("week_start", { ascending:false }).limit(12),
  ]);

  const snapshot = buildRevenueSnapshot(
    (opportunityData || []) as RevenueOpportunity[],
    (eventData || []) as RevenueConversionEvent[],
  );
  const { weekStartDate } = getRevenueWeek();
  const reviews = (reviewData || []) as Review[];
  const currentReview = reviews.find((review) => review.week_start === weekStartDate);
  const sources = Object.entries(snapshot.acquisition_this_week).sort((a,b) => b[1] - a[1]);
  const losses = Object.entries(snapshot.loss_reasons_this_week).sort((a,b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
          <div className="flex flex-wrap gap-2"><Link href="/protected/admin/sales/conversion" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Demo → Pilot → Pago</Link><Link href="/protected/admin/sales/metrics" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Métricas</Link></div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Weekly Revenue Review · semana {weekStartDate}</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Qué cambió, qué aprendimos y qué hacemos ahora.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">El snapshot se calcula con el pipeline real al momento de guardar. La revisión conserva hipótesis, resultados y decisiones para no cambiar ICP, mensaje, CTA o proceso por intuición aislada.</p>
        </div>

        {messages.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Target size={16}/>} label="Pipeline abierto" value={snapshot.pipeline.open} detail={`${snapshot.pipeline.total} oportunidades totales`}/>
          <Metric icon={<Compass size={16}/>} label="Entradas esta semana" value={snapshot.pipeline.new_this_week} detail="nuevas oportunidades"/>
          <Metric icon={<CalendarClock size={16}/>} label="Próximos pasos vencidos" value={snapshot.pipeline.overdue_next_steps} detail="requieren acción"/>
          <Metric icon={<CircleDollarSign size={16}/>} label="Pagos esta semana" value={snapshot.weekly_activity.payments} detail="eventos con fecha trazable"/>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]"><BarChart3 size={14}/> Actividad semanal</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Small label="Demos agendadas" value={snapshot.weekly_activity.demos_booked}/>
              <Small label="Shows" value={snapshot.weekly_activity.demo_shows}/>
              <Small label="No-shows" value={snapshot.weekly_activity.demo_no_shows}/>
              <Small label="Reagendadas" value={snapshot.weekly_activity.demos_rescheduled}/>
              <Small label="Pilots propuestos" value={snapshot.weekly_activity.pilots_proposed}/>
              <Small label="Pilots iniciados" value={snapshot.weekly_activity.pilots_started}/>
              <Small label="Pagos" value={snapshot.weekly_activity.payments}/>
              <Small label="Pérdidas" value={snapshot.weekly_activity.losses}/>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Conversión observada</p>
            <div className="mt-5 space-y-3">
              <Rate label="Agendada → Show" value={pct(snapshot.conversion_observed.booked_to_show_pct)}/>
              <Rate label="Show → Pilot" value={pct(snapshot.conversion_observed.show_to_pilot_pct)}/>
              <Rate label="Pilot → Pago" value={pct(snapshot.conversion_observed.pilot_to_paid_pct)}/>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#81786d]">“Sin muestra” significa que todavía no existe denominador real suficiente; no se sustituye por una hipótesis.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <Distribution title="Fuentes de nuevas oportunidades" empty="No entraron oportunidades esta semana." rows={sources.map(([key,value]) => [sourceLabels[key] || key, value])}/>
          <Distribution title="Motivos de pérdida de la semana" empty="No hay pérdidas registradas esta semana." rows={losses.map(([key,value]) => [lossLabels[key] || key, value])}/>
        </section>

        <form action={saveWeeklyRevenueReview} className="mt-8 rounded-2xl border border-[#cbbda8] bg-[#fffaf2] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Decisión semanal</p><h2 className="mt-2 font-serif text-3xl">Cerrar el loop de aprendizaje.</h2></div>{currentReview && <span className="rounded-full border border-[#b6bfaa] bg-[#e6eadd] px-3 py-1 text-xs font-semibold text-[#56614d]">Ya guardada · se puede actualizar</span>}</div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Hipótesis que estábamos probando"><textarea name="hypotheses" rows={5} maxLength={5000} defaultValue={currentReview?.hypotheses || ""} className="field resize-y" placeholder="Ej. Tier A responde mejor al diagnóstico que a una demo directa."/></Field>
            <Field label="Resultados observados"><textarea name="results" rows={5} maxLength={5000} required defaultValue={currentReview?.results || ""} className="field resize-y" placeholder="Qué ocurrió realmente, incluyendo objeciones o patrones."/></Field>
            <Field label="Decisiones / cambios"><textarea name="decisions" rows={5} maxLength={5000} required defaultValue={currentReview?.decisions || ""} className="field resize-y" placeholder="Qué mantenemos, cambiamos o dejamos de hacer y por qué."/></Field>
            <Field label="Foco de la próxima semana"><textarea name="next_focus" rows={5} maxLength={5000} required defaultValue={currentReview?.next_focus || ""} className="field resize-y" placeholder="La prioridad comercial concreta de la próxima semana."/></Field>
          </div>
          <button className="mt-6 rounded-lg bg-[#302d28] px-6 py-3 text-sm font-semibold text-[#fffaf2]">Guardar Revenue Review</button>
        </form>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Historial de decisiones</p>
          <h2 className="mt-2 font-serif text-2xl">Revenue Reviews anteriores</h2>
          <div className="mt-5 space-y-3">
            {reviews.map((review) => <article key={review.id} className="rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>Semana {review.week_start}</strong><span className="text-xs text-[#81786d]">{formatDate(review.reviewed_at)}</span></div><p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">Decisión</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#5f5951]">{review.decisions || "—"}</p><p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">Foco siguiente</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#5f5951]">{review.next_focus || "—"}</p></article>)}
            {!reviews.length && <p className="rounded-xl border border-dashed border-[#cdbfa9] p-6 text-center text-sm text-[#81786d]">Todavía no hay Revenue Reviews guardadas.</p>}
          </div>
        </section>
      </div>
      <style>{`.field{width:100%;border:1px solid #cfc1ad;background:#f7f0e6;border-radius:.6rem;padding:.8rem;color:#403b34;outline:none}.field:focus{border-color:#9d8767}`}</style>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div> }
function Small({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-[#ddd1c0] bg-[#fffaf2] p-3"><p className="text-[9px] uppercase tracking-[0.11em] text-[#81796e]">{label}</p><p className="mt-1 font-serif text-2xl">{value}</p></div> }
function Rate({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between rounded-lg border border-[#ddd1c0] bg-[#f7f0e6] px-4 py-3 text-sm"><span className="text-[#625d55]">{label}</span><strong>{value}</strong></div> }
function Distribution({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) { return <div className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8d7553]">{title}</p><div className="mt-4 space-y-3">{rows.map(([label,value]) => <Rate key={label} label={label} value={String(value)}/>)}{!rows.length && <p className="text-sm text-[#81786d]">{empty}</p>}</div></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#81796e]">{label}</span>{children}</label> }
