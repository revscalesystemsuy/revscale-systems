import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Rocket, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingQueuePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunities }, { data: plans }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step,next_step_due_at").in("stage", ["PILOT_ACTIVE","PAID"]).order("updated_at", { ascending:false }),
    supabase.from("b2b_onboarding_plans").select("opportunity_id,status,day0_complete,day1_complete,day2_complete,day3_complete,day4_complete,day5_complete,day6_complete,day7_complete,aha_opportunities,weekly_routine_committed,updated_at"),
  ]);
  const planByOpportunity = new Map((plans || []).map((p) => [p.opportunity_id, p]));
  const rows = (opportunities || []).map((opportunity) => ({ opportunity, plan: planByOpportunity.get(opportunity.id) }));
  const completed = rows.filter((row) => row.plan?.status === "COMPLETED").length;
  const inProgress = rows.filter((row) => row.plan?.status === "IN_PROGRESS").length;
  const notStarted = rows.length - completed - inProgress;

  return <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10"><div className="mx-auto max-w-6xl">
    <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a ventas</Link>
    <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 56 · Onboarding</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Onboarding de 7 días</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">La implementación termina cuando cambia la rutina, no cuando entran los datos. Esta mesa sigue los pilotos activos y cuentas pagas hasta completar el ritual de activación inicial.</p></div>
    <section className="mt-8 grid gap-4 md:grid-cols-3"><Stat icon={<Rocket size={16}/>} label="Sin empezar" value={notStarted}/><Stat icon={<Clock3 size={16}/>} label="En progreso" value={inProgress}/><Stat icon={<CheckCircle2 size={16}/>} label="Completados" value={completed}/></section>
    <section className="mt-8 space-y-4">{rows.map(({ opportunity, plan }) => {
      const days = plan ? [0,1,2,3,4,5,6,7].filter((d) => plan[`day${d}_complete`]).length : 0;
      const aha = Array.isArray(plan?.aha_opportunities) ? plan.aha_opportunities.length : 0;
      return <article key={opportunity.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d5c8b6] bg-[#efe5d6] text-[#796548]"><UserRound size={17}/></span><div><h2 className="font-serif text-2xl">{opportunity.company}</h2><p className="mt-1 text-xs text-[#81786d]">{opportunity.contact_name || "Sin contacto"} · {opportunity.stage}</p></div></div><Link href={`/protected/admin/sales/onboarding/${opportunity.id}`} className="rounded-lg bg-[#302d28] px-4 py-2 text-xs font-semibold text-[#fffaf2]">Abrir onboarding</Link></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Mini label="Estado" value={plan?.status || "NOT_STARTED"}/><Mini label="Días" value={`${days}/8`}/><Mini label="Aha" value={`${aha}/3+`}/><Mini label="Rutina semanal" value={plan?.weekly_routine_committed ? "Sí" : "No"}/></div></article>;
    })}{!rows.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">No hay pilotos activos o cuentas pagas pendientes de onboarding.</div>}</section>
  </div></main>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p></div> }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[#ddd1c0] bg-[#f7f0e6] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div> }
