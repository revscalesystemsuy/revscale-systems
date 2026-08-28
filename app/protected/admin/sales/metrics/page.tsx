import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarClock, CircleDollarSign, Radar, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Opportunity = {
  id: string;
  stage: string;
  tier: string;
  acquisition_source: string;
  next_step_due_at: string | null;
  demo_booked_at: string | null;
  demo_attendance: string | null;
  demo_completed_at: string | null;
  pilot_proposed_at: string | null;
  pilot_started_at: string | null;
  paid_at: string | null;
  created_at: string;
};

type ConversionEvent = { opportunity_id: string; event_type: string; occurred_at: string };

const stageOrder = ["NEW","CONTACTED","QUALIFIED","DEMO_BOOKED","DEMO_COMPLETED","PILOT_PROPOSED","PILOT_ACTIVE","PAID","LOST"];
const stageLabels: Record<string, string> = { NEW:"Nuevo", CONTACTED:"Contactado", QUALIFIED:"Calificado", DEMO_BOOKED:"Demo agendada", DEMO_COMPLETED:"Demo realizada", PILOT_PROPOSED:"Pilot propuesto", PILOT_ACTIVE:"Pilot activo", PAID:"Pago", LOST:"Perdido" };
const sourceLabels: Record<string, string> = { UNKNOWN:"Sin atribuir", WEBSITE:"Website", WHATSAPP:"WhatsApp", EMAIL:"Email", LINKEDIN:"LinkedIn", REFERRAL:"Referral", PARTNER:"Partner", OUTBOUND:"Outbound", EVENT:"Evento", OTHER:"Otro" };

function percent(numerator: number, denominator: number) { return denominator ? Math.round((numerator / denominator) * 100) : null; }

export default async function B2BSalesMetricsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunityData }, { data: conversionData }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,stage,tier,acquisition_source,next_step_due_at,demo_booked_at,demo_attendance,demo_completed_at,pilot_proposed_at,pilot_started_at,paid_at,created_at"),
    supabase.from("b2b_conversion_events").select("opportunity_id,event_type,occurred_at").order("occurred_at", { ascending:true }),
  ]);

  const opportunities = (opportunityData || []) as Opportunity[];
  const conversionEvents = (conversionData || []) as ConversionEvent[];
  const now = Date.now();
  const open = opportunities.filter((item) => !["PAID", "LOST"].includes(item.stage));
  const overdue = open.filter((item) => item.next_step_due_at && new Date(item.next_step_due_at).getTime() < now);
  const scored = opportunities.filter((item) => item.tier !== "UNSCORED");
  const tierA = opportunities.filter((item) => item.tier === "A").length;

  const booked = opportunities.filter((item) => item.demo_booked_at).length;
  const shown = opportunities.filter((item) => item.demo_completed_at).length;
  const shownWithPilot = opportunities.filter((item) => item.demo_completed_at && item.pilot_proposed_at).length;
  const pilotStarted = opportunities.filter((item) => item.pilot_started_at).length;
  const pilotPaid = opportunities.filter((item) => item.pilot_started_at && item.paid_at).length;
  const noShowEvents = conversionEvents.filter((event) => event.event_type === "DEMO_NO_SHOW").length;
  const bookedToShow = percent(shown, booked);
  const showToPilot = percent(shownWithPilot, shown);
  const pilotToPaid = percent(pilotPaid, pilotStarted);

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const newLast7 = opportunities.filter((item) => new Date(item.created_at).getTime() >= sevenDaysAgo).length;
  const stageCounts = Object.fromEntries(stageOrder.map((stage) => [stage, opportunities.filter((item) => item.stage === stage).length]));
  const tierRows = ["A","B","C","LOW","UNSCORED"].map((tier) => ({ tier, count: opportunities.filter((item) => item.tier === tier).length }));
  const sourceRows = Array.from(new Set(opportunities.map((item) => item.acquisition_source))).map((source) => ({ source, count: opportunities.filter((item) => item.acquisition_source === source).length }));

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
          <div className="flex flex-wrap gap-2"><Link href="/protected/admin/sales/conversion" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Demo → Pilot → Pago</Link><Link href="/protected/admin/sales/sources" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Gestionar fuentes</Link></div>
        </div>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Sales Ops interno</p><h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Métricas B2B</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Estado actual del pipeline y conversiones realmente observadas. Las tasas solo aparecen cuando existe un hito explícito y trazable.</p></div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Radar size={17}/>} label="Oportunidades" value={opportunities.length} detail={`${open.length} abiertas`} />
          <Metric icon={<Target size={17}/>} label="Tier A" value={tierA} detail={`${scored.length} oportunidades con score`} />
          <Metric icon={<CalendarClock size={17}/>} label="Próximos pasos vencidos" value={overdue.length} detail="solo oportunidades abiertas" />
          <Metric icon={<BarChart3 size={17}/>} label="Entradas últimos 7 días" value={newLast7} detail="nuevas oportunidades B2B" />
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Conversión observada</p>
          <h2 className="mt-2 font-serif text-2xl">Demo → Pilot → Pago</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Conversion label="Demo agendada → Show" value={bookedToShow} numerator={shown} denominator={booked}/>
            <Conversion label="Show → Pilot propuesto" value={showToPilot} numerator={shownWithPilot} denominator={shown}/>
            <Conversion label="Pilot activo → Pago" value={pilotToPaid} numerator={pilotPaid} denominator={pilotStarted}/>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#81786d]">No-shows registrados: <strong>{noShowEvents}</strong>. De los pagos históricos existentes, solo se conserva fecha cuando hay evidencia verificable; no se reconstruyen demos o pilots inexistentes.</p>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Calidad de pipeline</p><h2 className="mt-2 font-serif text-2xl">Tier y cobertura de datos</h2><div className="mt-5 space-y-3">{tierRows.map((row) => <Row key={row.tier} label={row.tier === "UNSCORED" ? "Sin score" : `Tier ${row.tier}`} value={row.count}/>)}</div></div>
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]"><CircleDollarSign size={14}/> Adquisición</p><h2 className="mt-2 font-serif text-2xl">Fuentes comerciales</h2><div className="mt-5 space-y-3">{sourceRows.map((row) => <Row key={row.source} label={sourceLabels[row.source] || row.source} value={row.count}/>)}{!sourceRows.length && <p className="text-sm text-[#81786d]">Sin datos todavía.</p>}</div></div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Pipeline actual</p><h2 className="mt-2 font-serif text-2xl">Distribución por etapa</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stageOrder.map((stage) => <Row key={stage} label={stageLabels[stage]} value={stageCounts[stage] || 0}/>)}</div></section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div> }
function Conversion({ label, value, numerator, denominator }: { label: string; value: number | null; numerator: number; denominator: number }) { return <div className="rounded-xl border border-[#d8cbb8] bg-[#fffaf2] p-5"><p className="text-xs leading-5 text-[#625d55]">{label}</p><p className="mt-3 font-serif text-3xl">{value === null ? "Sin muestra" : `${value}%`}</p><p className="mt-1 text-[10px] text-[#8a8176]">{denominator ? `${numerator}/${denominator} oportunidades observadas` : "Todavía no hay denominador histórico"}</p></div> }
function Row({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between rounded-lg border border-[#ddd1c0] bg-[#f7f0e6] px-4 py-3 text-sm"><span className="text-[#625d55]">{label}</span><strong>{value}</strong></div> }
