import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, History, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { completeB2BFollowup } from "../actions";

type Opportunity = {
  id: string;
  company: string;
  contact_name: string | null;
  stage: string;
  tier: string;
  icp_score: number | null;
  primary_channel: string;
  next_step: string;
  next_step_due_at: string;
};

type FollowupEvent = {
  id: string;
  opportunity_id: string;
  completed_step: string;
  outcome: string;
  completed_at: string;
  next_step: string;
};

function montevideoDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function formatDue(value: string) {
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value));
}

export default async function B2BFollowupsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunityData }, { data: eventData }] = await Promise.all([
    supabase.from("b2b_opportunities")
      .select("id,company,contact_name,stage,tier,icp_score,primary_channel,next_step,next_step_due_at")
      .neq("stage", "LOST")
      .order("next_step_due_at", { ascending: true }),
    supabase.from("b2b_followup_events")
      .select("id,opportunity_id,completed_step,outcome,completed_at,next_step")
      .order("completed_at", { ascending: false })
      .limit(12),
  ]);

  const opportunities = (opportunityData || []) as Opportunity[];
  const events = (eventData || []) as FollowupEvent[];
  const now = new Date();
  const todayKey = montevideoDateKey(now);
  const overdue = opportunities.filter((item) => new Date(item.next_step_due_at).getTime() < now.getTime());
  const today = opportunities.filter((item) => new Date(item.next_step_due_at).getTime() >= now.getTime() && montevideoDateKey(new Date(item.next_step_due_at)) === todayKey);
  const upcoming = opportunities.filter((item) => new Date(item.next_step_due_at).getTime() >= now.getTime() && montevideoDateKey(new Date(item.next_step_due_at)) !== todayKey);
  const companyById = new Map(opportunities.map((item) => [item.id, item.company]));

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
          <Link href="/protected/admin/sales/metrics" className="text-sm font-semibold text-[#675743] underline decoration-[#a89271] underline-offset-4">Ver métricas</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Sales follow-up</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Próximos pasos</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Cada seguimiento completado deja historial y obliga a definir qué ocurre después. Un contacto efectivo sobre una oportunidad nueva la mueve automáticamente a Contactado.</p>
        </div>

        {messages.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Summary icon={<Clock3 size={17}/>} label="Vencidos" value={overdue.length} detail="requieren atención" />
          <Summary icon={<CalendarClock size={17}/>} label="Hoy" value={today.length} detail="todavía dentro del día" />
          <Summary icon={<CheckCircle2 size={17}/>} label="Próximos" value={upcoming.length} detail="programados a futuro" />
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-3">
          <Queue title="Vencidos" subtitle="La fecha comprometida ya pasó." items={overdue} tone="danger" />
          <Queue title="Hoy" subtitle="Acciones que todavía corresponden hoy." items={today} tone="today" />
          <Queue title="Próximos" subtitle="Seguimientos futuros ya programados." items={upcoming} tone="future" />
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]"><History size={14}/> Historial reciente</p>
          <h2 className="mt-2 font-serif text-2xl">Seguimientos completados</h2>
          <div className="mt-5 divide-y divide-[#e0d5c5]">
            {events.map((event) => <div key={event.id} className="grid gap-2 py-4 text-sm md:grid-cols-[1fr_auto]"><div><p className="font-semibold">{companyById.get(event.opportunity_id) || "Oportunidad B2B"}</p><p className="mt-1 text-xs leading-5 text-[#716a61]">{event.completed_step} → {event.next_step}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#8a7a67]">{event.outcome}</p></div><p className="text-xs text-[#81786d]">{new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(event.completed_at))}</p></div>)}
            {!events.length && <p className="py-5 text-sm text-[#81786d]">Todavía no hay seguimientos completados.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Summary({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div> }

function Queue({ title, subtitle, items, tone }: { title: string; subtitle: string; items: Opportunity[]; tone: "danger" | "today" | "future" }) {
  const classes = tone === "danger" ? "border-[#d6b7aa] bg-[#eee0d9]" : tone === "today" ? "border-[#ccb991] bg-[#eee5d4]" : "border-[#c8c1ad] bg-[#e9e7dc]";
  return <section className={`rounded-2xl border p-4 md:p-5 ${classes}`}><div className="border-b border-[#d6cabb] pb-4"><div className="flex items-center justify-between gap-3"><h2 className="font-serif text-2xl">{title}</h2><span className="rounded-full border border-[#c8b89f] bg-[#fffaf2] px-3 py-1 text-xs font-semibold">{items.length}</span></div><p className="mt-1 text-xs text-[#746c62]">{subtitle}</p></div><div className="mt-4 space-y-4">{items.map((item) => <FollowupCard key={item.id} item={item}/>)}{!items.length && <div className="rounded-xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-6 text-center text-xs text-[#81786d]">Sin acciones en esta cola.</div>}</div></section>;
}

function FollowupCard({ item }: { item: Opportunity }) {
  return <article className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/protected/admin/sales/${item.id}`} className="font-semibold text-[#39342e] underline decoration-[#b8a487] underline-offset-4">{item.company}</Link><p className="mt-1 flex items-center gap-1.5 text-xs text-[#716a61]"><UserRound size={12}/>{item.contact_name || "Sin contacto"}</p></div><span className="rounded-full border border-[#d0c1ac] bg-[#efe5d6] px-2 py-1 text-[10px] font-semibold">{item.tier === "UNSCORED" ? "Sin score" : `${item.tier} · ${item.icp_score}`}</span></div><div className="mt-4 rounded-lg border border-[#ddd1c0] bg-[#f7f0e6] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">Acción comprometida</p><p className="mt-1 text-sm font-medium leading-5">{item.next_step}</p><p className="mt-2 text-xs text-[#81786d]">{formatDue(item.next_step_due_at)} · {item.primary_channel}</p></div><form action={completeB2BFollowup} className="mt-4 space-y-3"><input type="hidden" name="opportunity_id" value={item.id}/><select name="outcome" required className="w-full rounded-lg border border-[#cfc1ad] bg-[#fffaf2] px-3 py-2 text-xs"><option value="">Resultado…</option><option value="CONTACTED">Contactado</option><option value="NO_RESPONSE">Sin respuesta</option><option value="RESCHEDULED">Reprogramado</option><option value="OTHER">Otro</option></select><input name="next_step" required placeholder="Nuevo próximo paso" className="w-full rounded-lg border border-[#cfc1ad] bg-[#fffaf2] px-3 py-2 text-xs"/><input type="datetime-local" name="next_step_due_at" required className="w-full rounded-lg border border-[#cfc1ad] bg-[#fffaf2] px-3 py-2 text-xs"/><button className="w-full rounded-lg bg-[#302d28] px-3 py-2.5 text-xs font-semibold text-[#fffaf2]">Registrar seguimiento</button></form></article>;
}
