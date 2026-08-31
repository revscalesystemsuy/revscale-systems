import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, LockKeyhole, PencilLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Opportunity = { id: string; company: string; contact_name: string | null; stage: string; next_step: string | null };
type Baseline = { opportunity_id: string; status: string; active_leads_count: number | null; unowned_leads_count: number | null; no_next_step_count: number | null; overdue_followups_count: number | null; captured_at: string | null };

export default async function BaselineQueuePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunityData }, { data: baselineData }, { data: onboardingData }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").in("stage", ["PILOT_ACTIVE","PAID"]).order("updated_at", { ascending: false }),
    supabase.from("b2b_pilot_baselines").select("opportunity_id,status,active_leads_count,unowned_leads_count,no_next_step_count,overdue_followups_count,captured_at"),
    supabase.from("b2b_onboarding_plans").select("opportunity_id,status"),
  ]);
  const opportunities = (opportunityData || []) as Opportunity[];
  const baselines = new Map(((baselineData || []) as Baseline[]).map((x) => [x.opportunity_id, x]));
  const onboarding = new Map(((onboardingData || []) as { opportunity_id: string; status: string }[]).map((x) => [x.opportunity_id, x.status]));

  const eligible = opportunities.filter((x) => onboarding.get(x.id) === "COMPLETED");
  const locked = eligible.filter((x) => baselines.get(x.id)?.status === "LOCKED").length;
  const drafts = eligible.filter((x) => baselines.get(x.id)?.status === "DRAFT").length;
  const pending = eligible.length - locked - drafts;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/admin/sales/onboarding" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a onboarding</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 7 · Paso 57</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Baseline de piloto</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Congela la situación inicial antes de medir impacto. El baseline bloqueado no se edita: sirve como referencia para el antes/después.</p></div>
        <section className="mt-8 grid gap-4 md:grid-cols-3"><Summary icon={<BarChart3 size={17}/>} label="Sin baseline" value={pending}/><Summary icon={<PencilLine size={17}/>} label="Borrador" value={drafts}/><Summary icon={<LockKeyhole size={17}/>} label="Bloqueados" value={locked}/></section>
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {eligible.map((item) => {
            const b = baselines.get(item.id);
            return <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-start justify-between gap-4"><div><Link href={`/protected/admin/sales/baseline/${item.id}`} className="font-serif text-2xl underline decoration-[#b8a487] underline-offset-4">{item.company}</Link><p className="mt-1 text-xs text-[#746c62]">{item.contact_name || "Contacto pendiente"} · {item.stage}</p></div><span className="rounded-full border border-[#cdbda5] bg-[#eee4d5] px-3 py-1 text-[10px] font-semibold">{b?.status || "PENDIENTE"}</span></div>{b ? <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#625d55]"><p>Leads activos: <strong>{b.active_leads_count ?? "—"}</strong></p><p>Sin owner: <strong>{b.unowned_leads_count ?? "—"}</strong></p><p>Sin próximo paso: <strong>{b.no_next_step_count ?? "—"}</strong></p><p>Vencidos: <strong>{b.overdue_followups_count ?? "—"}</strong></p></div> : <p className="mt-4 text-sm text-[#746c62]">Todavía no se registró la línea base.</p>}<p className="mt-4 text-xs leading-5 text-[#81786d]">Próximo paso: {item.next_step || "Registrar baseline"}</p></article>;
          })}
          {!eligible.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-8 text-center text-sm text-[#81786d] lg:col-span-2">Todavía no hay cuentas con onboarding completado listas para baseline.</div>}
        </section>
      </div>
    </main>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
