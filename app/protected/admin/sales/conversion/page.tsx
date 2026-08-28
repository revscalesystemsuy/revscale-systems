import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarCheck2, CircleDollarSign, Clock3, Presentation, Rocket, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { advanceB2BConversion, recordB2BDemoOutcome, scheduleB2BDemo } from "./actions";

type Opportunity = {
  id: string;
  company: string;
  contact_name: string | null;
  stage: string;
  tier: string;
  next_step: string | null;
  next_step_due_at: string | null;
  demo_booked_at: string | null;
  demo_scheduled_for: string | null;
  demo_attendance: string | null;
  demo_completed_at: string | null;
  pilot_proposed_at: string | null;
  pilot_started_at: string | null;
  paid_at: string | null;
  created_at: string;
};

type ConversionEvent = {
  id: string;
  opportunity_id: string;
  event_type: string;
  occurred_at: string;
  scheduled_for: string | null;
};

const stageOrder = ["NEW","CONTACTED","QUALIFIED","DEMO_BOOKED","DEMO_COMPLETED","PILOT_PROPOSED","PILOT_ACTIVE","PAID","LOST"];
const stageLabels: Record<string, string> = {
  NEW:"Nuevo", CONTACTED:"Contactado", QUALIFIED:"Calificado", DEMO_BOOKED:"Demo agendada",
  DEMO_COMPLETED:"Demo realizada", PILOT_PROPOSED:"Pilot propuesto", PILOT_ACTIVE:"Pilot activo", PAID:"Pago", LOST:"Perdido",
};
const eventLabels: Record<string, string> = {
  DEMO_BOOKED:"Demo agendada", DEMO_SHOW:"Demo realizada", DEMO_NO_SHOW:"No-show", DEMO_RESCHEDULED:"Demo reagendada",
  PILOT_PROPOSED:"Pilot propuesto", PILOT_STARTED:"Pilot iniciado", PAID:"Pago confirmado",
};

function localValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("sv-SE", { timeZone:"America/Montevideo", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false }).format(date).replace(" ", "T");
}

function humanDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-UY", { dateStyle:"medium", timeStyle:"short", timeZone:"America/Montevideo" }).format(new Date(value));
}

export default async function B2BConversionPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunityData }, { data: eventData }] = await Promise.all([
    supabase.from("b2b_opportunities")
      .select("id,company,contact_name,stage,tier,next_step,next_step_due_at,demo_booked_at,demo_scheduled_for,demo_attendance,demo_completed_at,pilot_proposed_at,pilot_started_at,paid_at,created_at")
      .neq("stage", "LOST")
      .order("created_at", { ascending:false }),
    supabase.from("b2b_conversion_events")
      .select("id,opportunity_id,event_type,occurred_at,scheduled_for")
      .order("occurred_at", { ascending:false })
      .limit(50),
  ]);

  const opportunities = ((opportunityData || []) as Opportunity[]).sort((a,b) => stageOrder.indexOf(b.stage) - stageOrder.indexOf(a.stage));
  const events = (eventData || []) as ConversionEvent[];
  const booked = opportunities.filter((item) => item.demo_booked_at).length;
  const shown = opportunities.filter((item) => item.demo_completed_at).length;
  const noShows = events.filter((item) => item.event_type === "DEMO_NO_SHOW").length;
  const pilots = opportunities.filter((item) => item.pilot_started_at).length;
  const paidWithDate = opportunities.filter((item) => item.paid_at).length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
          <Link href="/protected/admin/sales/metrics" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver métricas</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Sales conversion</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Demo → Pilot → Pago</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Agenda demos, registra show/no-show y deja trazados los hitos que realmente ocurrieron. Los datos históricos que no pueden demostrarse quedan vacíos.</p>
        </div>

        {messages.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={<CalendarCheck2 size={16}/>} label="Demos agendadas" value={booked}/>
          <Stat icon={<Presentation size={16}/>} label="Shows" value={shown}/>
          <Stat icon={<Clock3 size={16}/>} label="No-shows" value={noShows}/>
          <Stat icon={<Rocket size={16}/>} label="Pilots iniciados" value={pilots}/>
          <Stat icon={<CircleDollarSign size={16}/>} label="Pagos con fecha" value={paidWithDate}/>
        </section>

        <section className="mt-8 space-y-5">
          {opportunities.map((item) => <ConversionCard key={item.id} item={item}/>) }
          {!opportunities.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">No hay oportunidades activas para seguir.</div>}
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Auditoría de conversión</p>
          <h2 className="mt-2 font-serif text-2xl">Últimos eventos registrados</h2>
          <div className="mt-5 divide-y divide-[#ded2c1]">
            {events.map((event) => {
              const opportunity = opportunities.find((item) => item.id === event.opportunity_id);
              return <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><strong>{eventLabels[event.event_type] || event.event_type}</strong><span className="ml-2 text-[#81786d]">{opportunity?.company || "Oportunidad histórica"}</span></div><div className="text-right text-xs text-[#81786d]"><p>{humanDate(event.occurred_at)}</p>{event.scheduled_for && <p>Demo: {humanDate(event.scheduled_for)}</p>}</div></div>;
            })}
            {!events.length && <p className="py-4 text-sm text-[#81786d]">Todavía no hay eventos de conversión.</p>}
          </div>
        </section>
      </div>
      <style>{`.field{width:100%;border:1px solid #cfc1ad;background:#fffaf2;border-radius:.5rem;padding:.65rem .75rem;color:#403b34;outline:none}.field:focus{border-color:#9d8767}`}</style>
    </main>
  );
}

function ConversionCard({ item }: { item: Opportunity }) {
  const early = ["NEW","CONTACTED","QUALIFIED"].includes(item.stage);
  const demoBooked = item.stage === "DEMO_BOOKED";
  const demoCompleted = item.stage === "DEMO_COMPLETED";
  const pilotProposed = item.stage === "PILOT_PROPOSED";
  const pilotActive = item.stage === "PILOT_ACTIVE";
  const paid = item.stage === "PAID";

  return (
    <article className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d5c8b6] bg-[#efe5d6] text-[#796548]"><UserRound size={17}/></span><div><h2 className="font-serif text-2xl">{item.company}</h2><p className="mt-1 text-xs text-[#81786d]">{item.contact_name || "Sin contacto"} · {stageLabels[item.stage] || item.stage} · {item.tier === "UNSCORED" ? "Sin score" : `Tier ${item.tier}`}</p></div></div>
        <Link href={`/protected/admin/sales/${item.id}`} className="text-xs font-semibold text-[#675743] underline decoration-[#a89271] underline-offset-4">Abrir ficha</Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Milestone label="Demo agendada" value={humanDate(item.demo_scheduled_for)} active={Boolean(item.demo_booked_at)}/>
        <Milestone label="Demo realizada" value={humanDate(item.demo_completed_at)} active={Boolean(item.demo_completed_at)}/>
        <Milestone label="Pilot propuesto" value={humanDate(item.pilot_proposed_at)} active={Boolean(item.pilot_proposed_at)}/>
        <Milestone label="Pilot activo" value={humanDate(item.pilot_started_at)} active={Boolean(item.pilot_started_at)}/>
        <Milestone label="Pago" value={item.paid_at ? humanDate(item.paid_at) : paid ? "Sin fecha confirmada" : "—"} active={Boolean(item.paid_at)}/>
      </div>

      {early && <form action={scheduleB2BDemo} className="mt-5 grid gap-3 rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4 md:grid-cols-3"><input type="hidden" name="opportunity_id" value={item.id}/><Field label="Fecha de demo"><input type="datetime-local" name="demo_scheduled_for" required className="field"/></Field><Field label="Próximo paso"><input name="next_step" required className="field" defaultValue="Realizar demo"/></Field><Field label="Vence"><input type="datetime-local" name="next_step_due_at" required className="field"/></Field><button className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2] md:col-span-3">Agendar demo</button></form>}

      {demoBooked && <form action={recordB2BDemoOutcome} className="mt-5 grid gap-3 rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4 md:grid-cols-4"><input type="hidden" name="opportunity_id" value={item.id}/><Field label="Resultado"><select name="demo_attendance" required defaultValue="SHOW" className="field"><option value="SHOW">Show / realizada</option><option value="NO_SHOW">No-show</option><option value="RESCHEDULED">Reagendada</option></select></Field><Field label="Nueva fecha si reagenda"><input type="datetime-local" name="demo_scheduled_for" className="field" defaultValue={localValue(item.demo_scheduled_for)}/></Field><Field label="Próximo paso"><input name="next_step" required className="field" defaultValue="Definir siguiente decisión"/></Field><Field label="Vence"><input type="datetime-local" name="next_step_due_at" required className="field"/></Field><button className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2] md:col-span-4">Registrar resultado de demo</button></form>}

      {demoCompleted && <AdvanceForm item={item} target="PILOT_PROPOSED" label="Registrar Pilot propuesto" defaultNext="Confirmar decisión sobre Revenue Recovery Pilot"/>}
      {pilotProposed && <AdvanceForm item={item} target="PILOT_ACTIVE" label="Iniciar Pilot" defaultNext="Completar activación inicial del Pilot"/>}
      {pilotActive && <AdvanceForm item={item} target="PAID" label="Registrar pago" defaultNext="Revisar activación y continuidad"/>}
      {paid && <p className="mt-5 rounded-xl border border-[#aeb99f] bg-[#e4e8dc] p-4 text-sm leading-6 text-[#536048]">Esta oportunidad está en Pago. {item.paid_at ? "La fecha está trazada en el sistema." : "Es una activación histórica sin timestamp de pago verificable; no se inventó una fecha."}</p>}
    </article>
  );
}

function AdvanceForm({ item, target, label, defaultNext }: { item: Opportunity; target: string; label: string; defaultNext: string }) {
  return <form action={advanceB2BConversion} className="mt-5 grid gap-3 rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4 md:grid-cols-[1.4fr_1fr_auto]"><input type="hidden" name="opportunity_id" value={item.id}/><input type="hidden" name="target_stage" value={target}/><Field label="Próximo paso"><input name="next_step" required className="field" defaultValue={defaultNext}/></Field><Field label="Vence"><input type="datetime-local" name="next_step_due_at" required className="field"/></Field><button className="self-end rounded-lg bg-[#302d28] px-5 py-2.5 text-sm font-semibold text-[#fffaf2]">{label}</button></form>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p></div> }
function Milestone({ label, value, active }: { label: string; value: string; active: boolean }) { return <div className={`rounded-lg border p-3 ${active ? "border-[#b8bda5] bg-[#e8eadf]" : "border-[#ddd1c0] bg-[#f7f0e6]"}`}><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{label}</p><p className="mt-1 text-xs font-medium leading-5 text-[#514b43]">{value}</p></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{label}</span>{children}</label> }
