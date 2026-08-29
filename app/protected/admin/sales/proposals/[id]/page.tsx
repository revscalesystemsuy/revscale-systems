import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import { markB2BProposalSent, saveB2BProposal } from "../actions";

export default async function ProposalEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunity } = await supabase.from("b2b_opportunities")
    .select("id,company,contact_name,stage,next_step,icp_score,tier,demo_completed_at")
    .eq("id", id).maybeSingle();
  if (!opportunity) notFound();

  const { data: discovery } = await supabase.from("b2b_discovery_sessions")
    .select("id,status,disposition,volume_monthly_inquiries,volume_mix,active_properties,agents_working_leads,teams_count,flow_lead_entry,flow_assignment,flow_next_action,flow_followup_control,flow_no_action,visibility_response_time_known,visibility_response_minutes,visibility_can_list_no_next_step,visibility_overdue_by_agent,matching_new_property,matching_price_drop,matching_reactivation_pct,stack_crm,stack_outside_crm,stack_one_fix,economics_portal_spend_range,economics_net_value_per_deal_range,economics_inquiry_to_visit_pct,economics_visit_to_close_pct,observed_pain,urgency_trigger,sponsor_name,sponsor_role,implementation_constraints,habit_change_signal,economic_case,discovery_summary,next_step_recommendation,qualification_pain_explicit,qualification_volume_sufficient,qualification_sponsor_authority,qualification_urgency_trigger,qualification_stack_fit,qualification_habit_change,qualification_economic_value,completed_at")
    .eq("opportunity_id", id).eq("status", "COMPLETED").order("completed_at", { ascending: false }).limit(1).maybeSingle();

  const { data: proposal } = await supabase.from("b2b_proposals")
    .select("id,status,observed_facts,process_change,implementation_plan,measurement_plan,decision_metrics,plan_name,billing_cycle,quoted_price_usd,pilot_days,onboarding_days,onboarding_waived,activation_guarantee,long_term_contract_required,founding_price_used,founding_price_usd,commercial_notes,sent_at")
    .eq("opportunity_id", id).in("status", ["DRAFT","READY","SENT"]).maybeSingle();

  const qualified = Boolean(discovery && discovery.status === "COMPLETED" && discovery.disposition === "QUALIFIED" && [
    discovery.qualification_pain_explicit, discovery.qualification_volume_sufficient, discovery.qualification_sponsor_authority,
    discovery.qualification_urgency_trigger, discovery.qualification_stack_fit, discovery.qualification_habit_change, discovery.qualification_economic_value,
  ].every((x) => x === true));

  const evidence = discovery ? [
    discovery.volume_monthly_inquiries != null ? `Consultas mensuales: ${discovery.volume_monthly_inquiries}` : null,
    discovery.agents_working_leads != null ? `Agentes trabajando leads: ${discovery.agents_working_leads}` : null,
    discovery.active_properties != null ? `Propiedades activas: ${discovery.active_properties}` : null,
    discovery.stack_crm ? `Stack actual: ${discovery.stack_crm}` : null,
    discovery.observed_pain ? `Dolor observado: ${discovery.observed_pain}` : null,
    discovery.urgency_trigger ? `Trigger de urgencia: ${discovery.urgency_trigger}` : null,
    discovery.sponsor_name ? `Sponsor: ${discovery.sponsor_name}${discovery.sponsor_role ? ` · ${discovery.sponsor_role}` : ""}` : null,
    discovery.economic_case ? `Caso económico: ${discovery.economic_case}` : null,
  ].filter(Boolean) as string[] : [];

  const defaultProcess = "Centralizar una muestra de la operación, definir owner y SLA, activar la cola diaria de prioridades y dejar cada oportunidad con contexto y próximo paso. Configurar matching y reactivación sobre inventario activo cuando corresponda.";
  const defaultImplementation = "Día 0: baseline y exportación. Días 1-2: importación y limpieza. Días 3-4: pipeline, ownership, SLA y reglas. Día 5: matching/reactivación. Día 6: capacitación. Día 7: operación activa y revisión de activación.";
  const defaultMeasurement = "Comparar línea base vs. día 30/45. Medir activación del hábito y métricas de negocio acordadas; no presentar cifras de demo como resultados reales.";

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected/admin/sales/proposals" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a propuestas</Link>
        <div className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Propuesta · Revenue Recovery Pilot</p><h1 className="mt-3 font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#716a61]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage}</p></div>

        {messages.success && <div className="mt-5 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-5 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <section className={`mt-6 rounded-2xl border p-5 ${qualified ? "border-[#b7c5aa] bg-[#e5eadf]" : "border-[#d8cbb8] bg-[#f7f0e6]"}`}><p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={16}/> Gate comercial: {qualified ? "7/7 + discovery completado" : "todavía no está completamente calificada"}</p><p className="mt-2 text-xs leading-5 text-[#665f56]">La propuesta puede trabajarse como borrador, pero solo debería enviarse después de demo/discovery y con hechos verificables.</p></section>

        <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8"><h2 className="font-serif text-2xl">Evidencia disponible</h2><p className="mt-2 text-xs leading-5 text-[#716a61]">Estos datos vienen del discovery. Elegí solo 3–5 hechos que el prospecto haya confirmado; no agregues inferencias.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{evidence.map((item) => <div key={item} className="rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-sm text-[#5f5951]">{item}</div>)}{!evidence.length && <p className="text-sm text-[#716a61]">No hay evidencia estructurada disponible todavía.</p>}</div>{discovery?.discovery_summary && <div className="mt-4 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-sm leading-6 text-[#625d55]"><strong>Resumen discovery:</strong> {discovery.discovery_summary}</div>}</section>

        <form action={saveB2BProposal} className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
          <input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="discovery_session_id" value={discovery?.id || ""}/>
          <h2 className="font-serif text-2xl">Los cinco bloques</h2>
          <Field label="1. Lo que observamos · 3–5 hechos"><textarea name="observed_facts" rows={6} className="field resize-y" defaultValue={(proposal?.observed_facts || []).join("\n")} placeholder="Un hecho por línea. Solo evidencia confirmada."/></Field>
          <Field label="2. Lo que vamos a cambiar · proceso, no features"><textarea name="process_change" rows={5} className="field resize-y" defaultValue={proposal?.process_change || defaultProcess}/></Field>
          <Field label="3. Cómo se implementa · 7 días"><textarea name="implementation_plan" rows={5} className="field resize-y" defaultValue={proposal?.implementation_plan || defaultImplementation}/></Field>
          <Field label="4. Cómo se mide"><textarea name="measurement_plan" rows={4} className="field resize-y" defaultValue={proposal?.measurement_plan || defaultMeasurement}/></Field>
          <Field label="Tres métricas que deciden continuidad"><textarea name="decision_metrics" rows={4} className="field resize-y" defaultValue={(proposal?.decision_metrics || []).join("\n")} placeholder="Una métrica por línea, máximo 3."/></Field>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Plan"><select name="plan_name" defaultValue={proposal?.plan_name || "PROFESSIONAL"} className="field"><option value="STARTER">Starter · USD {PLAN_CATALOG.STARTER.monthly}/mes</option><option value="PROFESSIONAL">Professional · USD {PLAN_CATALOG.PROFESSIONAL.monthly}/mes</option><option value="ENTERPRISE">Enterprise · desde USD {PLAN_CATALOG.ENTERPRISE.monthly}/mes</option></select></Field>
            <Field label="Ciclo"><select name="billing_cycle" defaultValue={proposal?.billing_cycle || "MONTHLY"} className="field"><option value="MONTHLY">Mensual</option><option value="ANNUAL">Anual · 2 meses bonificados</option></select></Field>
            <Field label="Founding price"><select name="founding_price_used" defaultValue={proposal?.founding_price_used ? "YES" : "NO"} className="field"><option value="NO">No</option><option value="YES">Sí, excepción</option></select></Field>
            <Field label="Founding USD"><input name="founding_price_usd" type="number" min="0" defaultValue={proposal?.founding_price_usd || 199} className="field"/></Field>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3"><Info label="Piloto" value="45 días"/><Info label="Implementación" value="7 días · bonificada primeros 10"/><Info label="Salida" value="Sin contrato largo durante piloto"/></div>
          <Field label="Notas comerciales"><textarea name="commercial_notes" rows={4} className="field resize-y" defaultValue={proposal?.commercial_notes || ""}/></Field>
          <div className="mt-6 flex flex-wrap gap-3"><button name="status" value="DRAFT" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-5 py-3 text-sm font-semibold text-[#574936]">Guardar borrador</button><button name="status" value="READY" className="rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2]">Marcar lista para enviar</button></div>
        </form>

        {proposal?.status === "READY" && <form action={markB2BProposalSent} className="mt-6 rounded-2xl border border-[#b7c5aa] bg-[#e5eadf] p-6"><input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="proposal_id" value={proposal.id}/><h2 className="font-serif text-2xl">Envío</h2><p className="mt-2 text-sm leading-6 text-[#56614f]">Este botón no envía un email. Usalo únicamente después de haber enviado la propuesta realmente; deja trazabilidad y mueve la oportunidad a Pilot propuesto.</p><button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#44513f] px-5 py-3 text-sm font-semibold text-white"><Send size={15}/> Registrar propuesta enviada</button></form>}
        {proposal?.status === "SENT" && <div className="mt-6 rounded-2xl border border-[#b7c5aa] bg-[#e5eadf] p-6 text-sm text-[#4d5c46]">Propuesta enviada y registrada. Siguiente paso: decisión sobre Revenue Recovery Pilot.</div>}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-5 block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#d8cbb8] bg-[#fffaf2] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p><p className="mt-2 text-sm text-[#4d4841]">{value}</p></div>; }
