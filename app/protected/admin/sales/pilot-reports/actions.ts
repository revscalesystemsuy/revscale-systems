"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

function refresh(id: string) {
  revalidatePath("/protected/admin/sales/pilot-reports");
  revalidatePath(`/protected/admin/sales/pilot-reports/${id}`);
  revalidatePath("/protected/admin/sales");
}

export async function savePilotReport(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const reportDay = Number(text(formData, "report_day"));
  if (!opportunityId || ![30,45].includes(reportDay)) redirect("/protected/admin/sales/pilot-reports");
  const { supabase, userId } = await requireAdmin();

  const [{ data: baseline }, { data: measurement }, { data: activation }, { data: review }] = await Promise.all([
    supabase.from("b2b_pilot_baselines").select("*").eq("opportunity_id", opportunityId).eq("status", "LOCKED").maybeSingle(),
    supabase.from("b2b_before_after_measurements").select("*").eq("opportunity_id", opportunityId).eq("status", "LOCKED").gte("measurement_day", reportDay).order("measurement_day", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("b2b_activation_scores").select("id,score_total,band,owner_next_step_pct,today_usage_days,evaluated_at").eq("opportunity_id", opportunityId).order("evaluated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("b2b_weekly_reviews").select("review_week,activation_score,owner_next_step_pct,today_usage_days,overdue_followups_count,sponsor_present,decision_next_week,decision_owner,decision_due_at,reviewed_at").eq("opportunity_id", opportunityId).order("reviewed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!baseline) redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent("Se requiere baseline bloqueado")}`);
  if (!measurement) redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent(`Se requiere una medición bloqueada de día ${reportDay} o posterior`)}`);

  const coreMetrics = [
    ["Leads sin owner", baseline.unowned_leads_count, measurement.unowned_leads_count],
    ["Sin próximo paso", baseline.no_next_step_count, measurement.no_next_step_count],
    ["Follow-ups vencidos", baseline.overdue_followups_count, measurement.overdue_followups_count],
    ["Alta intención inactiva", baseline.high_intent_inactive_count, measurement.high_intent_inactive_count],
    ["Mediana primera respuesta (min)", baseline.median_first_response_minutes, measurement.median_first_response_minutes],
    ["Candidatos de reactivación", baseline.reactivation_candidates_count, measurement.reactivation_candidates_count],
  ].map(([metric, before, after]) => ({ metric, before, after }));

  const baselineDecision = Array.isArray(baseline.decision_metric_baselines) ? baseline.decision_metric_baselines : [];
  const afterDecision = Array.isArray(measurement.decision_metric_results) ? measurement.decision_metric_results : [];
  const decisionSnapshot = baselineDecision.map((item: { metric?: string; baseline?: string }, index: number) => ({
    metric: item.metric || `Métrica ${index + 1}`,
    before: item.baseline || null,
    after: (afterDecision[index] as { result?: string } | undefined)?.result || null,
  }));

  const guaranteeCriteria = [
    { criterion: "80%+ leads activos con owner y próximo paso", observed: activation?.owner_next_step_pct ?? null },
    { criterion: "Uso de Qué hacer hoy 4/5 días", observed: activation?.today_usage_days ?? null },
    { criterion: "Revisión de matches y oportunidades en riesgo", observed: measurement.matches_processed_count ?? null },
    { criterion: "Manager con revisión semanal de SLA/pendientes", observed: review?.reviewed_at || null },
  ];

  const payload = {
    opportunity_id: opportunityId,
    baseline_id: baseline.id,
    measurement_id: measurement.id,
    activation_score_id: activation?.id || null,
    created_by: userId,
    report_day: reportDay,
    status: "DRAFT",
    executive_summary: text(formData, "executive_summary"),
    intervention_summary: text(formData, "intervention_summary"),
    observed_outcomes: text(formData, "observed_outcomes"),
    attribution_notes: text(formData, "attribution_notes"),
    limitations: text(formData, "limitations"),
    recommendation: text(formData, "recommendation"),
    core_metric_snapshot: coreMetrics,
    decision_metric_snapshot: decisionSnapshot,
    activation_snapshot: activation || {},
    weekly_review_snapshot: review || {},
    guarantee_criteria: guaranteeCriteria,
    guarantee_result: reportDay === 45 ? text(formData, "guarantee_result") || "PENDING" : "PENDING",
    guarantee_notes: text(formData, "guarantee_notes") || null,
    updated_at: new Date().toISOString(),
  };

  if (!payload.executive_summary || !payload.intervention_summary || !payload.observed_outcomes || !payload.attribution_notes || !payload.limitations || !payload.recommendation) {
    redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent("Resumen, intervención, resultados observados, atribución, limitaciones y recomendación son obligatorios")}`);
  }
  if (reportDay === 45 && !["PENDING","MET","NOT_MET"].includes(payload.guarantee_result)) {
    redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent("Resultado de garantía inválido")}`);
  }

  const { data: existing } = await supabase.from("b2b_pilot_reports").select("id,status").eq("opportunity_id", opportunityId).eq("report_day", reportDay).maybeSingle();
  if (existing?.status === "FINAL") redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent("El reporte final no se edita")}`);
  const result = existing
    ? await supabase.from("b2b_pilot_reports").update(payload).eq("id", existing.id)
    : await supabase.from("b2b_pilot_reports").insert(payload);
  if (result.error) redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent(result.error.message)}`);

  await supabase.from("b2b_opportunities").update({ next_step: `Finalizar reporte día ${reportDay}.`, updated_at: new Date().toISOString() }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?success=Reporte%20guardado`);
}

export async function finalizePilotReport(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const reportDay = Number(text(formData, "report_day"));
  if (!opportunityId || ![30,45].includes(reportDay)) redirect("/protected/admin/sales/pilot-reports");
  const { supabase } = await requireAdmin();
  const { data: report } = await supabase.from("b2b_pilot_reports").select("*").eq("opportunity_id", opportunityId).eq("report_day", reportDay).maybeSingle();
  if (!report) redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent("Reporte no encontrado")}`);
  if (report.status === "FINAL") redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?success=Reporte%20ya%20final`);
  if (!report.executive_summary || !report.observed_outcomes || !report.attribution_notes || !report.limitations || !report.recommendation) {
    redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent("Completá el reporte antes de finalizar")}`);
  }
  if (reportDay === 45 && report.guarantee_result === "PENDING") {
    redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent("En día 45 debés registrar MET o NOT_MET para la garantía de activación")}`);
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_pilot_reports").update({ status: "FINAL", finalized_at: now, updated_at: now }).eq("id", report.id);
  if (error) redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  const nextStep = reportDay === 45 ? "Solicitar testimonio si existe permiso y evidencia suficiente." : "Continuar piloto hasta reporte día 45.";
  await supabase.from("b2b_opportunities").update({ next_step: nextStep, updated_at: now }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/pilot-reports/${opportunityId}?success=Reporte%20finalizado`);
}
