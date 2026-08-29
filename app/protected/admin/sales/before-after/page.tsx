import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Scale, LockKeyhole, PencilLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Opportunity = { id: string; company: string; contact_name: string | null; stage: string; next_step: string | null };
type Measurement = { opportunity_id: string; measurement_day: number; status: string; measured_at: string };

export default async function BeforeAfterQueuePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunitiesData }, { data: baselineData }, { data: measurementData }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").in("stage", ["PILOT_ACTIVE","PAID"]).order("updated_at", { ascending: false }),
    supabase.from("b2b_pilot_baselines").select("opportunity_id,status"),
    supabase.from("b2b_before_after_measurements").select("opportunity_id,measurement_day,status,measured_at").order("measurement_day", { ascending: false }),
  ]);

  const opportunities = (opportunitiesData || []) as Opportunity[];
  const baselineLocked = new Set(((baselineData || []) as { opportunity_id: string; status: string }[]).filter((x) => x.status === "LOCKED").map((x) => x.opportunity_id));
  const measurements = (measurementData || []) as Measurement[];
  const byOpportunity = new Map<string, Measurement[]>();
  for (const item of measurements) byOpportunity.set(item.opportunity_id, [...(byOpportunity.get(item.opportunity_id) || []), item]);
  const eligible = opportunities.filter((x) => baselineLocked.has(x.id));
  const locked = measurements.filter((x) => x.status === "LOCKED").length;
  const drafts = measurements.filter((x) => x.status === "DRAFT").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/admin/sales/weekly-reviews" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a weekly reviews</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 7 · Paso 60</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Métricas antes / después</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Compara el baseline bloqueado contra mediciones posteriores usando el mismo alcance y evidencia. No convierte correlación en atribución comercial.</p></div>
        <section className="mt-8 grid gap-4 md:grid-cols-3"><Summary icon={<Scale size={17}/>} label="Cuentas comparables" value={eligible.length}/><Summary icon={<PencilLine size={17}/>} label="Mediciones draft" value={drafts}/><Summary icon={<LockKeyhole size={17}/>} label="Mediciones locked" value={locked}/></section>
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {eligible.map((item) => {
            const current = byOpportunity.get(item.id) || [];
            return <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-start justify-between gap-4"><div><Link href={`/protected/admin/sales/before-after/${item.id}`} className="font-serif text-2xl underline decoration-[#b8a487] underline-offset-4">{item.company}</Link><p className="mt-1 text-xs text-[#746c62]">{item.contact_name || "Contacto pendiente"} · {item.stage}</p></div><span className="rounded-full border border-[#cdbda5] bg-[#eee4d5] px-3 py-1 text-[10px] font-semibold">{current.length} MEDICIONES</span></div><div className="mt-4 flex flex-wrap gap-2">{current.slice(0,5).map((m) => <span key={`${m.measurement_day}-${m.measured_at}`} className="rounded-full border border-[#d2c5b3] px-2.5 py-1 text-[10px]">Día {m.measurement_day} · {m.status}</span>)}{!current.length && <span className="text-xs text-[#81786d]">Todavía no hay medición posterior.</span>}</div><p className="mt-4 text-xs leading-5 text-[#81786d]">Próximo paso: {item.next_step || "Registrar medición comparable"}</p></article>;
          })}
          {!eligible.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-8 text-center text-sm text-[#81786d] lg:col-span-2">Todavía no hay cuentas con baseline bloqueado listas para comparación.</div>}
        </section>
      </div>
    </main>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
