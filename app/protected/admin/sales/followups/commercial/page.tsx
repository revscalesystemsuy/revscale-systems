import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Handshake, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function humanDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value));
}

export default async function CommercialFollowupPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunities } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,stage,next_step,next_step_due_at,pilot_proposed_at,pilot_started_at,paid_at")
    .in("stage", ["PILOT_PROPOSED","PILOT_ACTIVE","PAID"])
    .order("next_step_due_at", { ascending: true });

  const ids = (opportunities || []).map((x) => x.id);
  const [{ data: proposals }, { data: pilots }, { data: closings }] = await Promise.all([
    ids.length ? supabase.from("b2b_proposals").select("opportunity_id,status,sent_at").in("opportunity_id", ids) : Promise.resolve({ data: [] } as any),
    ids.length ? supabase.from("b2b_pilot_agreements").select("opportunity_id,status,sponsor_name,champion_name,target_start_date,updated_at").in("opportunity_id", ids) : Promise.resolve({ data: [] } as any),
    ids.length ? supabase.from("b2b_closings").select("opportunity_id,status,commercial_accepted_at,payment_confirmed_at,payment_reference").in("opportunity_id", ids) : Promise.resolve({ data: [] } as any),
  ]);

  const proposalById = new Map((proposals || []).map((x: any) => [x.opportunity_id, x]));
  const pilotById = new Map((pilots || []).map((x: any) => [x.opportunity_id, x]));
  const closingById = new Map((closings || []).map((x: any) => [x.opportunity_id, x]));
  const now = new Date();

  const pendingDecision = (opportunities || []).filter((x) => x.stage === "PILOT_PROPOSED" && pilotById.get(x.id)?.status !== "ACCEPTED");
  const pendingActivation = (opportunities || []).filter((x) => ["PILOT_PROPOSED","PILOT_ACTIVE"].includes(x.stage) && pilotById.get(x.id)?.status === "ACCEPTED");
  const pendingPayment = (opportunities || []).filter((x) => closingById.get(x.id)?.status === "COMMERCIAL_ACCEPTED" && !x.paid_at);
  const handoff = (opportunities || []).filter((x) => x.stage === "PAID");

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/admin/sales/followups" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a seguimientos</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 6 · Paso 55</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Seguimiento comercial</h1><p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">La venta no termina con la propuesta. Esta mesa separa decisión pendiente, activación, pago verificable y handoff para que ninguna oportunidad quede sin próximo paso.</p></div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric icon={<Clock3 size={16}/>} label="Decisión pendiente" value={pendingDecision.length}/>
          <Metric icon={<Handshake size={16}/>} label="Activación" value={pendingActivation.length}/>
          <Metric icon={<ReceiptText size={16}/>} label="Pago pendiente" value={pendingPayment.length}/>
          <Metric icon={<CheckCircle2 size={16}/>} label="Handoff" value={handoff.length}/>
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-2">
          <Queue title="1. Decisión pendiente" subtitle="Propuesta/piloto enviado pero todavía sin aceptación operativa." items={pendingDecision} proposalById={proposalById} pilotById={pilotById} closingById={closingById} now={now}/>
          <Queue title="2. Activación" subtitle="Piloto aceptado: confirmar kickoff, sponsor, champion y fecha de arranque." items={pendingActivation} proposalById={proposalById} pilotById={pilotById} closingById={closingById} now={now}/>
          <Queue title="3. Pago verificable" subtitle="Aceptación comercial no equivale a cobro. El pago se confirma solo desde Cierre." items={pendingPayment} proposalById={proposalById} pilotById={pilotById} closingById={closingById} now={now}/>
          <Queue title="4. Handoff" subtitle="Cliente pago: el vendedor sigue presente y entrega contexto completo a onboarding." items={handoff} proposalById={proposalById} pilotById={pilotById} closingById={closingById} now={now}/>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }

function Queue({ title, subtitle, items, proposalById, pilotById, closingById, now }: any) {
  return <section className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="border-b border-[#dfd3c2] pb-4"><h2 className="font-serif text-2xl">{title}</h2><p className="mt-1 text-xs leading-5 text-[#746c62]">{subtitle}</p></div><div className="mt-4 space-y-4">{items.map((item: any) => {
    const proposal = proposalById.get(item.id); const pilot = pilotById.get(item.id); const closing = closingById.get(item.id);
    const overdue = item.next_step_due_at && new Date(item.next_step_due_at).getTime() < now.getTime();
    const href = closing?.status === "COMMERCIAL_ACCEPTED" || item.stage === "PAID" ? `/protected/admin/sales/closing/${item.id}` : pilot ? `/protected/admin/sales/pilots/${item.id}` : `/protected/admin/sales/proposals/${item.id}`;
    return <article key={item.id} className="rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-xl">{item.company}</h3><p className="mt-1 text-xs text-[#81786d]">{item.contact_name || "Contacto pendiente"} · {item.stage}</p></div><span className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${overdue ? "border-[#d6b7aa] bg-[#f0ddd4] text-[#7b4539]" : "border-[#cbbda8] bg-[#efe5d6] text-[#655744]"}`}>{item.next_step_due_at ? (overdue ? "VENCIDO" : humanDate(item.next_step_due_at)) : "SIN FECHA"}</span></div><div className="mt-4 grid gap-2 text-xs text-[#665f56]"><p><strong>Próximo paso:</strong> {item.next_step || "Sin próximo paso"}</p>{proposal && <p><strong>Propuesta:</strong> {proposal.status}</p>}{pilot && <p><strong>Piloto:</strong> {pilot.status} · sponsor {pilot.sponsor_name || "pendiente"} · champion {pilot.champion_name || "pendiente"}</p>}{closing && <p><strong>Cierre:</strong> {closing.status}{closing.payment_reference ? ` · ${closing.payment_reference}` : ""}</p>}</div><div className="mt-4 flex flex-wrap gap-3"><Link href={href} className="rounded-lg bg-[#302d28] px-4 py-2 text-xs font-semibold text-[#fffaf2]">Abrir siguiente gate</Link><Link href={`/protected/admin/sales/${item.id}`} className="rounded-lg border border-[#baa98f] bg-[#fffaf2] px-4 py-2 text-xs font-semibold text-[#574936]">Ficha comercial</Link></div></article>;
  })}{!items.length && <p className="rounded-xl border border-dashed border-[#cdbfa9] p-6 text-center text-xs text-[#81786d]">Sin oportunidades en esta cola.</p>}</div></section>;
}
