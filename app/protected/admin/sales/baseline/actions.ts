"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const optionalInt = (fd: FormData, key: string) => {
  const raw = text(fd, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`invalid-${key}`);
  return value;
};
const optionalNumber = (fd: FormData, key: string) => {
  const raw = text(fd, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`invalid-${key}`);
  return value;
};

function parseKeyValueLines(raw: string) {
  if (!raw) return {};
  const result: Record<string, number> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [label, valueRaw] = trimmed.split(":").map((x) => x.trim());
    const value = Number(valueRaw);
    if (!label || !Number.isFinite(value) || value < 0) throw new Error("invalid-distribution");
    result[label] = value;
  }
  return result;
}

function parseDecisionMetrics(raw: string) {
  if (!raw) return [];
  return raw.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split("|").map((x) => x.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) throw new Error("invalid-decision-metric");
    return { metric: parts[0], baseline: parts[1], notes: parts[2] || null };
  }).slice(0, 3);
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

function revalidateBaseline(opportunityId: string) {
  revalidatePath("/protected/admin/sales/baseline");
  revalidatePath(`/protected/admin/sales/baseline/${opportunityId}`);
  revalidatePath("/protected/admin/sales/onboarding");
  revalidatePath("/protected/admin/sales");
}

export async function savePilotBaseline(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/baseline");
  const { supabase, userId } = await requireAdmin();

  const [{ data: opportunity }, { data: onboarding }, { data: pilot }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,stage").eq("id", opportunityId).maybeSingle(),
    supabase.from("b2b_onboarding_plans").select("id,status").eq("opportunity_id", opportunityId).maybeSingle(),
    supabase.from("b2b_pilot_agreements").select("id,status,decision_metrics").eq("opportunity_id", opportunityId).maybeSingle(),
  ]);
  if (!opportunity || !["PILOT_ACTIVE","PAID"].includes(opportunity.stage)) {
    redirect(`/protected/admin/sales/baseline/${opportunityId}?error=${encodeURIComponent("El baseline requiere piloto activo o cuenta pagada")}`);
  }
  if (!onboarding || onboarding.status !== "COMPLETED") {
    redirect(`/protected/admin/sales/baseline/${opportunityId}?error=${encodeURIComponent("Completá primero el onboarding de 7 días")}`);
  }

  try {
    const payload = {
      opportunity_id: opportunityId,
      onboarding_plan_id: onboarding.id,
      pilot_agreement_id: pilot?.id || null,
      created_by: userId,
      status: "DRAFT",
      dataset_reference: text(formData, "dataset_reference") || null,
      captured_at: text(formData, "captured_at") ? new Date(`${text(formData, "captured_at")}:00-03:00`).toISOString() : null,
      active_leads_count: optionalInt(formData, "active_leads_count"),
      source_count: optionalInt(formData, "source_count"),
      unowned_leads_count: optionalInt(formData, "unowned_leads_count"),
      no_next_step_count: optionalInt(formData, "no_next_step_count"),
      overdue_followups_count: optionalInt(formData, "overdue_followups_count"),
      high_intent_inactive_count: optionalInt(formData, "high_intent_inactive_count"),
      median_first_response_minutes: optionalNumber(formData, "median_first_response_minutes"),
      reactivation_candidates_count: optionalInt(formData, "reactivation_candidates_count"),
      stage_distribution: parseKeyValueLines(text(formData, "stage_distribution")),
      source_distribution: parseKeyValueLines(text(formData, "source_distribution")),
      decision_metric_baselines: parseDecisionMetrics(text(formData, "decision_metric_baselines")),
      process_notes: text(formData, "process_notes") || null,
      evidence_notes: text(formData, "evidence_notes") || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase.from("b2b_pilot_baselines").select("id,status").eq("opportunity_id", opportunityId).maybeSingle();
    if (existing?.status === "LOCKED") redirect(`/protected/admin/sales/baseline/${opportunityId}?error=${encodeURIComponent("El baseline está bloqueado para preservar la comparación antes/después")}`);
    const result = existing
      ? await supabase.from("b2b_pilot_baselines").update(payload).eq("id", existing.id)
      : await supabase.from("b2b_pilot_baselines").insert(payload);
    if (result.error) throw result.error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el baseline";
    redirect(`/protected/admin/sales/baseline/${opportunityId}?error=${encodeURIComponent(message)}`);
  }

  await supabase.from("b2b_opportunities").update({ next_step: "Bloquear baseline y calcular Activation Score.", updated_at: new Date().toISOString() }).eq("id", opportunityId);
  revalidateBaseline(opportunityId);
  redirect(`/protected/admin/sales/baseline/${opportunityId}?success=Baseline%20guardado`);
}

export async function lockPilotBaseline(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/baseline");
  const { supabase } = await requireAdmin();
  const { data: baseline } = await supabase.from("b2b_pilot_baselines").select("*").eq("opportunity_id", opportunityId).maybeSingle();
  if (!baseline) redirect(`/protected/admin/sales/baseline/${opportunityId}?error=${encodeURIComponent("Primero registrá el baseline")}`);
  if (baseline.status === "LOCKED") redirect(`/protected/admin/sales/baseline/${opportunityId}?success=Baseline%20ya%20bloqueado`);

  const requiredCounts = [baseline.active_leads_count, baseline.unowned_leads_count, baseline.no_next_step_count, baseline.overdue_followups_count];
  if (!baseline.dataset_reference || !baseline.captured_at || requiredCounts.some((value) => value === null) || !baseline.process_notes) {
    redirect(`/protected/admin/sales/baseline/${opportunityId}?error=${encodeURIComponent("Para bloquear: dataset, fecha, leads activos, sin owner, sin próximo paso, vencidos y proceso actual son obligatorios")}`);
  }
  if (Array.isArray(baseline.decision_metric_baselines) && baseline.decision_metric_baselines.length > 0 && baseline.decision_metric_baselines.length !== 3) {
    redirect(`/protected/admin/sales/baseline/${opportunityId}?error=${encodeURIComponent("Si registrás métricas de decisión, deben ser exactamente 3")}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_pilot_baselines").update({ status: "LOCKED", locked_at: now, updated_at: now }).eq("id", baseline.id);
  if (error) redirect(`/protected/admin/sales/baseline/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ next_step: "Calcular Activation Score con evidencia de uso.", updated_at: now }).eq("id", opportunityId);
  revalidateBaseline(opportunityId);
  redirect(`/protected/admin/sales/baseline/${opportunityId}?success=Baseline%20bloqueado%20para%20comparaci%C3%B3n`);
}
