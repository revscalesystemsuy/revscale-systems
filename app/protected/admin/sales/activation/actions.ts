"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const checked = (fd: FormData, key: string) => fd.get(key) === "on";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

export async function recordActivationScore(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/activation");
  const { supabase, userId } = await requireAdmin();

  const { data: baseline } = await supabase
    .from("b2b_pilot_baselines")
    .select("id,status")
    .eq("opportunity_id", opportunityId)
    .maybeSingle();
  if (!baseline || baseline.status !== "LOCKED") {
    redirect(`/protected/admin/sales/activation/${opportunityId}?error=${encodeURIComponent("Primero bloqueá un baseline verificable")}`);
  }

  const ownerNextStepPct = Number(text(formData, "owner_next_step_pct"));
  const todayUsageDays = Number(text(formData, "today_usage_days"));
  if (!Number.isFinite(ownerNextStepPct) || ownerNextStepPct < 0 || ownerNextStepPct > 100) {
    redirect(`/protected/admin/sales/activation/${opportunityId}?error=${encodeURIComponent("Owner + próximo paso debe ser un porcentaje entre 0 y 100")}`);
  }
  if (!Number.isInteger(todayUsageDays) || todayUsageDays < 0 || todayUsageDays > 5) {
    redirect(`/protected/admin/sales/activation/${opportunityId}?error=${encodeURIComponent("Uso de Qué hacer hoy debe ser entre 0 y 5 días")}`);
  }

  const overdueReviewed = checked(formData, "overdue_reviewed");
  const matchesProcessed = checked(formData, "matches_alerts_processed");
  const managerReview = checked(formData, "manager_weekly_review");
  const dataComplete = checked(formData, "data_sources_complete");

  const requiredEvidence = [
    [ownerNextStepPct >= 80, "owner_next_step_evidence"],
    [todayUsageDays >= 4, "today_usage_evidence"],
    [overdueReviewed, "overdue_evidence"],
    [matchesProcessed, "matches_evidence"],
    [managerReview, "manager_review_evidence"],
    [dataComplete, "data_quality_evidence"],
  ] as const;
  for (const [earned, key] of requiredEvidence) {
    if (earned && !text(formData, key)) {
      redirect(`/protected/admin/sales/activation/${opportunityId}?error=${encodeURIComponent("Toda señal que suma puntos requiere evidencia")}`);
    }
  }

  const score =
    (ownerNextStepPct >= 80 ? 25 : 0) +
    (todayUsageDays >= 4 ? 25 : 0) +
    (overdueReviewed ? 15 : 0) +
    (matchesProcessed ? 10 : 0) +
    (managerReview ? 15 : 0) +
    (dataComplete ? 10 : 0);
  const band = score >= 75 ? "ACTIVATED" : score >= 50 ? "RISK" : "CRITICAL";
  const now = new Date().toISOString();

  const { error } = await supabase.from("b2b_activation_scores").insert({
    opportunity_id: opportunityId,
    baseline_id: baseline.id,
    created_by: userId,
    evaluated_at: now,
    owner_next_step_pct: ownerNextStepPct,
    today_usage_days: todayUsageDays,
    overdue_reviewed: overdueReviewed,
    matches_alerts_processed: matchesProcessed,
    manager_weekly_review: managerReview,
    data_sources_complete: dataComplete,
    score_total: score,
    band,
    owner_next_step_evidence: text(formData, "owner_next_step_evidence") || null,
    today_usage_evidence: text(formData, "today_usage_evidence") || null,
    overdue_evidence: text(formData, "overdue_evidence") || null,
    matches_evidence: text(formData, "matches_evidence") || null,
    manager_review_evidence: text(formData, "manager_review_evidence") || null,
    data_quality_evidence: text(formData, "data_quality_evidence") || null,
    notes: text(formData, "notes") || null,
  });
  if (error) redirect(`/protected/admin/sales/activation/${opportunityId}?error=${encodeURIComponent(error.message)}`);

  const nextStep = band === "ACTIVATED"
    ? "Programar weekly revenue review y medir evolución contra baseline."
    : band === "RISK"
      ? "Corregir señales de adopción en riesgo y repetir Activation Score."
      : "Intervenir rutina, datos y sponsor antes de continuar el piloto.";
  await supabase.from("b2b_opportunities").update({ next_step: nextStep, updated_at: now }).eq("id", opportunityId);

  revalidatePath("/protected/admin/sales/activation");
  revalidatePath(`/protected/admin/sales/activation/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales/activation/${opportunityId}?success=${encodeURIComponent(`Activation Score ${score}/100 · ${band}`)}`);
}
