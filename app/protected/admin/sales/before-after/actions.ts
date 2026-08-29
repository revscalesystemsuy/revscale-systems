"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const int = (fd: FormData, key: string, required = false) => {
  const raw = text(fd, key);
  if (!raw && !required) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`invalid-${key}`);
  return value;
};
const num = (fd: FormData, key: string) => {
  const raw = text(fd, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`invalid-${key}`);
  return value;
};

function parseDecisionResults(raw: string) {
  if (!raw) return [];
  const rows = raw.split("\n").map((x) => x.trim()).filter(Boolean).map((line) => {
    const [metric, result, notes] = line.split("|").map((x) => x.trim());
    if (!metric || !result) throw new Error("invalid-decision-result");
    return { metric, result, notes: notes || null };
  });
  if (rows.length !== 3) throw new Error("decision-results-must-be-three");
  return rows;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

function refresh(opportunityId: string) {
  revalidatePath("/protected/admin/sales/before-after");
  revalidatePath(`/protected/admin/sales/before-after/${opportunityId}`);
  revalidatePath("/protected/admin/sales/weekly-reviews");
  revalidatePath("/protected/admin/sales");
}

export async function saveBeforeAfterMeasurement(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/before-after");
  const { supabase, userId } = await requireAdmin();

  const [{ data: baseline }, { data: activation }, { data: review }] = await Promise.all([
    supabase.from("b2b_pilot_baselines").select("id,status,decision_metric_baselines").eq("opportunity_id", opportunityId).maybeSingle(),
    supabase.from("b2b_activation_scores").select("id").eq("opportunity_id", opportunityId).order("evaluated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("b2b_weekly_reviews").select("id").eq("opportunity_id", opportunityId).order("reviewed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!baseline || baseline.status !== "LOCKED") {
    redirect(`/protected/admin/sales/before-after/${opportunityId}?error=${encodeURIComponent("Primero bloqueá el baseline")}`);
  }

  try {
    const measurementDay = int(formData, "measurement_day", true) as number;
    if (measurementDay < 1 || measurementDay > 45) throw new Error("measurement-day-must-be-1-to-45");
    const measuredRaw = text(formData, "measured_at");
    const measuredAt = measuredRaw ? new Date(`${measuredRaw}:00-03:00`) : null;
    if (!measuredAt || Number.isNaN(measuredAt.getTime())) throw new Error("invalid-measured-at");

    const decisionResults = parseDecisionResults(text(formData, "decision_metric_results"));
    const baselineMetrics = Array.isArray(baseline.decision_metric_baselines) ? baseline.decision_metric_baselines : [];
    if (baselineMetrics.length !== 3) throw new Error("baseline-must-have-three-decision-metrics");
    const expected = baselineMetrics.map((x: { metric?: string }) => String(x.metric || "").trim()).filter(Boolean);
    const actual = decisionResults.map((x) => x.metric);
    if (expected.length !== 3 || !expected.every((metric: string, index: number) => metric === actual[index])) {
      throw new Error("decision-metrics-must-match-baseline-order");
    }

    const payload = {
      opportunity_id: opportunityId,
      baseline_id: baseline.id,
      activation_score_id: activation?.id || null,
      weekly_review_id: review?.id || null,
      created_by: userId,
      status: "DRAFT",
      measurement_day: measurementDay,
      measured_at: measuredAt.toISOString(),
      dataset_reference: text(formData, "dataset_reference"),
      measurement_scope: text(formData, "measurement_scope"),
      active_leads_count: int(formData, "active_leads_count", true),
      source_count: int(formData, "source_count"),
      unowned_leads_count: int(formData, "unowned_leads_count", true),
      no_next_step_count: int(formData, "no_next_step_count", true),
      overdue_followups_count: int(formData, "overdue_followups_count", true),
      high_intent_inactive_count: int(formData, "high_intent_inactive_count"),
      median_first_response_minutes: num(formData, "median_first_response_minutes"),
      reactivation_candidates_count: int(formData, "reactivation_candidates_count"),
      reactivations_completed_count: int(formData, "reactivations_completed_count"),
      matches_processed_count: int(formData, "matches_processed_count"),
      opportunities_moved_count: int(formData, "opportunities_moved_count"),
      decision_metric_results: decisionResults,
      evidence_notes: text(formData, "evidence_notes"),
      attribution_notes: text(formData, "attribution_notes"),
      limitations: text(formData, "limitations"),
      updated_at: new Date().toISOString(),
    };

    if (!payload.dataset_reference || !payload.measurement_scope || !payload.evidence_notes || !payload.attribution_notes || !payload.limitations) {
      throw new Error("dataset-scope-evidence-attribution-limitations-required");
    }

    const { data: existing } = await supabase.from("b2b_before_after_measurements").select("id,status").eq("opportunity_id", opportunityId).eq("measurement_day", measurementDay).maybeSingle();
    if (existing?.status === "LOCKED") throw new Error("measurement-locked");
    const result = existing
      ? await supabase.from("b2b_before_after_measurements").update(payload).eq("id", existing.id)
      : await supabase.from("b2b_before_after_measurements").insert(payload);
    if (result.error) throw result.error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la medición";
    redirect(`/protected/admin/sales/before-after/${opportunityId}?error=${encodeURIComponent(message)}`);
  }

  await supabase.from("b2b_opportunities").update({ next_step: "Validar y bloquear medición antes/después.", updated_at: new Date().toISOString() }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/before-after/${opportunityId}?success=Medici%C3%B3n%20guardada`);
}

export async function lockBeforeAfterMeasurement(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const measurementDay = Number(text(formData, "measurement_day"));
  if (!opportunityId || !Number.isInteger(measurementDay)) redirect("/protected/admin/sales/before-after");
  const { supabase } = await requireAdmin();
  const { data: measurement } = await supabase.from("b2b_before_after_measurements").select("*").eq("opportunity_id", opportunityId).eq("measurement_day", measurementDay).maybeSingle();
  if (!measurement) redirect(`/protected/admin/sales/before-after/${opportunityId}?error=${encodeURIComponent("Medición no encontrada")}`);
  if (measurement.status === "LOCKED") redirect(`/protected/admin/sales/before-after/${opportunityId}?success=Medici%C3%B3n%20ya%20bloqueada`);
  if (!Array.isArray(measurement.decision_metric_results) || measurement.decision_metric_results.length !== 3) {
    redirect(`/protected/admin/sales/before-after/${opportunityId}?error=${encodeURIComponent("La medición requiere las 3 métricas de decisión")}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_before_after_measurements").update({ status: "LOCKED", locked_at: now, updated_at: now }).eq("id", measurement.id);
  if (error) redirect(`/protected/admin/sales/before-after/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ next_step: measurementDay >= 30 ? "Preparar reporte de piloto día 30/45." : "Continuar weekly reviews y próxima medición comparable.", updated_at: now }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/before-after/${opportunityId}?success=Medici%C3%B3n%20bloqueada`);
}
