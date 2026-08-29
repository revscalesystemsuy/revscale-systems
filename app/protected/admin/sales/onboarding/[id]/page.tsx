import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDot, Target, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding, saveOnboardingPlan } from "../actions";

const days = [
  [0,"Día 0 — línea base","Exportar leads activos, identificar fuentes, medir owner/etapa/última interacción/próxima acción, documentar proceso y elegir manager sponsor."],
  [1,"Día 1 — datos y pipeline","Importar muestra activa, limpiar duplicados críticos, configurar etapas Venta/Alquiler y asignar ownership inicial."],
  [2,"Día 2 — reglas","Definir SLA objetivo, HOT/WARM/COLD como prioridad, reglas de follow-up y campos mínimos."],
  [3,"Día 3 — acción diaria","Activar Qué hacer hoy, revisar riesgos, configurar alertas y elegir 10 leads para ejercicio."],
  [4,"Día 4 — matching y reactivación","Revisar matches, definir triggers reales de recontacto y configurar Opportunity Radar/nurturing."],
  [5,"Día 5 — entrenamiento de agentes","Rutina de 20 minutos: Qué hacer hoy, trabajar 5-10 casos, registrar resultado, dejar próximo paso y revisar matches."],
  [6,"Día 6 — manager","Revisar SLA, vencidos, oportunidades por etapa, rendimiento del equipo y fuentes."],
  [7,"Día 7 — business review","Revisar fugas, fricción, módulos innecesarios y compromiso de rutina semanal."],
] as const;

export default async function OnboardingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunity }, { data: pilot }, { data: plan }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_pilot_agreements").select("id,sponsor_name,sponsor_role,champion_name,champion_role,activation_criteria,decision_metrics,integration_scope,risks").eq("opportunity_id", id).maybeSingle(),
    supabase.from("b2b_onboarding_plans").select("*").eq("opportunity_id", id).maybeSingle(),
  ]);
  if (!opportunity) notFound();

  const completedDays = plan ? days.filter(([day]) => plan[`day${day}_complete`] === true).length : 0;
  const ahaCount = Array.isArray(plan?.aha_opportunities) ? plan.aha_opportunities.length : 0;
  const canComplete = Boolean(plan && completedDays === 8 && plan.sponsor_name && plan.champion_name && ahaCount >= 3 && plan.weekly_routine_committed);

  return <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10"><div className="mx-auto max-w-5xl">
    <Link href="/protected/admin/sales/onboarding" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a onboarding</Link>
    <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 56 · Onboarding</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#6d665d]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage}</p></div>
    {messages.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
    {messages.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

    <section className="mt-8 grid gap-4 md:grid-cols-4"><Card icon={<CircleDot size={16}/>} label="Estado" value={plan?.status || "NOT_STARTED"}/><Card icon={<CheckCircle2 size={16}/>} label="Días" value={`${completedDays}/8`}/><Card icon={<Target size={16}/>} label="Aha" value={`${ahaCount}/3+`}/><Card icon={<UserRound size={16}/>} label="Sponsor" value={plan?.sponsor_name || pilot?.sponsor_name || "Pendiente"}/></section>

    <form action={saveOnboardingPlan} className="mt-8 space-y-6">
      <input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="pilot_agreement_id" value={pilot?.id || ""}/>
      <section className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Kickoff y handoff</h2><p className="mt-2 text-sm text-[#716a61]">Sponsor, champion, baseline, integraciones, riesgos y calendario deben quedar explícitos antes de considerar el onboarding terminado.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Sponsor"><input className="field" name="sponsor_name" defaultValue={plan?.sponsor_name || pilot?.sponsor_name || ""}/></Field><Field label="Rol sponsor"><input className="field" name="sponsor_role" defaultValue={plan?.sponsor_role || pilot?.sponsor_role || ""}/></Field><Field label="Champion operativo"><input className="field" name="champion_name" defaultValue={plan?.champion_name || pilot?.champion_name || ""}/></Field><Field label="Rol champion"><input className="field" name="champion_role" defaultValue={plan?.champion_role || pilot?.champion_role || ""}/></Field><Field label="Kickoff"><input type="datetime-local" className="field" name="kickoff_at"/></Field><Field label="Objetivo día 7"><input type="date" className="field" name="target_complete_date" defaultValue={plan?.target_complete_date || ""}/></Field><Field label="Baseline" wide><textarea className="field min-h-24" name="baseline_notes" defaultValue={plan?.baseline_notes || ""}/></Field><Field label="Integraciones" wide><textarea className="field min-h-20" name="integration_notes" defaultValue={plan?.integration_notes || pilot?.integration_scope || ""}/></Field><Field label="Riesgos" wide><textarea className="field min-h-20" name="risks" defaultValue={plan?.risks || pilot?.risks || ""}/></Field><Field label="Calendario business review" wide><input className="field" name="business_review_cadence" defaultValue={plan?.business_review_cadence || "Revisión semanal durante el piloto"}/></Field></div></section>

      <section className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Checklist operativo</h2><div className="mt-5 space-y-3">{days.map(([day,title,description]) => <label key={day} className="flex gap-3 rounded-xl border border-[#ddd1c0] bg-[#f7f0e6] p-4"><input type="checkbox" name={`day${day}_complete`} defaultChecked={Boolean(plan?.[`day${day}_complete`])} className="mt-1 h-4 w-4"/><span><strong className="text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-[#716a61]">{description}</span></span></label>)}</div></section>

      <section className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Momento aha</h2><p className="mt-2 text-sm leading-6 text-[#716a61]">La primera semana debe descubrir al menos tres oportunidades accionables que antes estaban fuera del radar. No se promete que cierren.</p><textarea className="field mt-4 min-h-32" name="aha_opportunities" defaultValue={Array.isArray(plan?.aha_opportunities) ? plan.aha_opportunities.join("\n") : ""} placeholder="Una oportunidad por línea: seguimiento vencido importante, match no explotado, reactivación por evento..."/><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="weekly_routine_committed" defaultChecked={Boolean(plan?.weekly_routine_committed)}/> Manager y equipo comprometieron una rutina semanal</label></section>

      <button className="w-full rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2]">Guardar avance de onboarding</button>
    </form>

    <form action={completeOnboarding} className="mt-4"><input type="hidden" name="opportunity_id" value={id}/><button disabled={!canComplete || plan?.status === "COMPLETED"} className="w-full rounded-lg border border-[#8c7b62] bg-[#efe5d6] px-5 py-3 text-sm font-semibold text-[#493f32] disabled:cursor-not-allowed disabled:opacity-40">Cerrar onboarding y pasar a baseline / Activation Score</button></form>
  </div><style>{`.field{width:100%;border:1px solid #cfc1ad;background:#fffaf2;border-radius:.5rem;padding:.7rem .8rem;color:#403b34;outline:none}.field:focus{border-color:#9d8767}`}</style></main>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`text-xs font-semibold text-[#665f56] ${wide ? "md:col-span-2" : ""}`}><span className="mb-2 block">{label}</span>{children}</label> }
function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p></div><p className="mt-3 text-sm font-semibold">{value}</p></div> }
