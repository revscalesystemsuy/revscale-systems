import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const qualificationFields = [
  "qualification_pain_explicit",
  "qualification_volume_sufficient",
  "qualification_sponsor_authority",
  "qualification_urgency_trigger",
  "qualification_stack_fit",
  "qualification_habit_change",
  "qualification_economic_value",
] as const;

export default async function PerfectDemoDesk() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunities } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,stage,next_step,demo_scheduled_for,demo_attendance")
    .in("stage", ["QUALIFIED", "DEMO_BOOKED", "DEMO_COMPLETED"])
    .order("updated_at", { ascending: false });

  const ids = (opportunities || []).map((item) => item.id);
  const { data: sessions } = ids.length ? await supabase
    .from("b2b_discovery_sessions")
    .select("opportunity_id,status,disposition,qualification_pain_explicit,qualification_volume_sufficient,qualification_sponsor_authority,qualification_urgency_trigger,qualification_stack_fit,qualification_habit_change,qualification_economic_value,discovery_summary,completed_at")
    .in("opportunity_id", ids)
    .order("completed_at", { ascending: false }) : { data: [] } as { data: any[] };

  const latest = new Map<string, any>();
  for (const session of sessions || []) if (!latest.has(session.opportunity_id)) latest.set(session.opportunity_id, session);

  const rows = (opportunities || []).map((opportunity) => {
    const session = latest.get(opportunity.id);
    const gate = Boolean(session && session.status === "COMPLETED" && session.disposition === "QUALIFIED" && qualificationFields.every((field) => session[field] === true));
    return { opportunity, session, gate };
  });

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/qualification" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a calificación</Link>
          <Link href="/demo/recorrido?plan=professional" target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Abrir recorrido de 7 min <ExternalLink size={14}/></Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 6 · Paso 50</p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">Perfect Demo</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">La demo no es un tour de módulos. Sigue una sola oportunidad durante 7 minutos. Solo se agenda cuando Discovery está completo y los 7 criterios de calificación están confirmados.</p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric label="Gate abierto" value={rows.filter((row) => row.gate && row.opportunity.stage === "QUALIFIED").length}/>
          <Metric label="Demo agendada" value={rows.filter((row) => row.opportunity.stage === "DEMO_BOOKED").length}/>
          <Metric label="Demo completada" value={rows.filter((row) => row.opportunity.stage === "DEMO_COMPLETED").length}/>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Guion operativo</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {["0:00 encuadre","1:20 qué hacer hoy","2:30 lead","3:30 matching","4:30 WhatsApp","5:20 Radar","6:10 dirección + ROI","6:50 cierre"].map((step) => <div key={step} className="rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-3 text-xs font-semibold text-[#665f56]">{step}</div>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#716a61]">No abrir Configuración, Billing, Documentos ni módulos Enterprise salvo pregunta expresa. Toda cifra del recorrido público es ficticia de demo.</p>
        </section>

        <section className="mt-8 space-y-4">
          {rows.map(({ opportunity, session, gate }) => (
            <article key={opportunity.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">{opportunity.stage}</p><h2 className="mt-2 font-serif text-2xl">{opportunity.company}</h2><p className="mt-1 text-xs text-[#81786d]">{opportunity.contact_name || "Contacto pendiente"}</p></div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${gate ? "border-[#b7c5aa] bg-[#e5eadf] text-[#56614f]" : "border-[#d9b7aa] bg-[#f4e4dc] text-[#7b4539]"}`}>{gate ? "7/7 · LISTA" : "GATE CERRADO"}</span>
              </div>
              {session?.discovery_summary && <div className="mt-4 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-sm leading-6 text-[#625d55]"><strong>Discovery:</strong> {session.discovery_summary}</div>}
              <div className="mt-4 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-xs leading-5 text-[#665f56]"><strong>Próximo paso:</strong> {opportunity.next_step || "Sin próximo paso"}</div>
              <div className="mt-5 flex flex-wrap gap-3">
                {gate && opportunity.stage === "QUALIFIED" && <Link href="/protected/admin/sales/conversion" className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]"><PlayCircle size={15}/> Agendar demo</Link>}
                {opportunity.stage === "DEMO_BOOKED" && <span className="inline-flex items-center gap-2 rounded-lg border border-[#b7c5aa] bg-[#e5eadf] px-4 py-2.5 text-sm font-semibold text-[#56614f]"><CheckCircle2 size={15}/> Agendada</span>}
                <Link href={`/protected/admin/sales/discovery/${opportunity.id}`} className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver discovery</Link>
              </div>
            </article>
          ))}
          {!rows.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">Todavía no hay oportunidades calificadas para demo.</div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
