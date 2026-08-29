'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STAGE_ORDER = ["NEW","CONTACTED","QUALIFIED","DEMO_BOOKED","DEMO_COMPLETED","PILOT_PROPOSED","PILOT_ACTIVE","PAID","LOST"] as const;
const DEMO_OUTCOMES = ["SHOW","NO_SHOW","RESCHEDULED"] as const;
const ADVANCE_TARGETS = ["PILOT_PROPOSED","PILOT_ACTIVE","PAID"] as const;
const QUALIFICATION_FIELDS = ["qualification_pain_explicit","qualification_volume_sufficient","qualification_sponsor_authority","qualification_urgency_trigger","qualification_stack_fit","qualification_habit_change","qualification_economic_value"] as const;

type Stage = (typeof STAGE_ORDER)[number];

function parseMontevideoDateTime(raw: string) {
  if (!raw) return null;
  const date = new Date(`${raw}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return supabase;
}

function revalidateConversion(opportunityId: string) {
  revalidatePath("/protected/admin/sales");
  revalidatePath("/protected/admin/sales/metrics");
  revalidatePath("/protected/admin/sales/conversion");
  revalidatePath("/protected/admin/sales/demo");
  revalidatePath(`/protected/admin/sales/${opportunityId}`);
}

export async function scheduleB2BDemo(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "").trim();
  const scheduledFor = parseMontevideoDateTime(String(formData.get("demo_scheduled_for") || "").trim());
  const nextStep = String(formData.get("next_step") || "").trim();
  const nextDueAt = parseMontevideoDateTime(String(formData.get("next_step_due_at") || "").trim());

  if (!opportunityId || !scheduledFor || !nextStep || !nextDueAt) {
    redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("Demo, próximo paso y fecha son obligatorios")}`);
  }

  const supabase = await requireAdmin();
  const { data: opportunity } = await supabase.from("b2b_opportunities").select("stage").eq("id", opportunityId).maybeSingle();
  if (!opportunity) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("Oportunidad no encontrada")}`);
  if (opportunity.stage !== "QUALIFIED") {
    redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("Solo una oportunidad QUALIFIED puede agendar Perfect Demo")}`);
  }

  const { data: discovery } = await supabase
    .from("b2b_discovery_sessions")
    .select("status,disposition,qualification_pain_explicit,qualification_volume_sufficient,qualification_sponsor_authority,qualification_urgency_trigger,qualification_stack_fit,qualification_habit_change,qualification_economic_value")
    .eq("opportunity_id", opportunityId)
    .eq("status", "COMPLETED")
    .eq("disposition", "QUALIFIED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const gateOpen = discovery && QUALIFICATION_FIELDS.every((field) => discovery[field] === true);
  if (!gateOpen) {
    redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("La demo requiere Discovery completado y 7/7 criterios de calificación confirmados")}`);
  }

  const { error } = await supabase.from("b2b_opportunities").update({
    stage: "DEMO_BOOKED",
    demo_scheduled_for: scheduledFor.toISOString(),
    demo_attendance: null,
    next_step: nextStep,
    next_step_due_at: nextDueAt.toISOString(),
  }).eq("id", opportunityId);
  if (error) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("No se pudo agendar la demo")}`);

  revalidateConversion(opportunityId);
  redirect(`/protected/admin/sales/conversion?success=${encodeURIComponent("Perfect Demo agendada y gate de calificación verificado")}`);
}

export async function recordB2BDemoOutcome(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "").trim();
  const outcome = String(formData.get("demo_attendance") || "").trim().toUpperCase();
  const rescheduledFor = parseMontevideoDateTime(String(formData.get("demo_scheduled_for") || "").trim());
  const nextStep = String(formData.get("next_step") || "").trim();
  const nextDueAt = parseMontevideoDateTime(String(formData.get("next_step_due_at") || "").trim());

  if (!opportunityId || !DEMO_OUTCOMES.includes(outcome as (typeof DEMO_OUTCOMES)[number]) || !nextStep || !nextDueAt) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("Resultado, próximo paso y fecha son obligatorios")}`);
  if (outcome === "RESCHEDULED" && !rescheduledFor) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("Indicá la nueva fecha de la demo")}`);

  const supabase = await requireAdmin();
  const { data: opportunity } = await supabase.from("b2b_opportunities").select("stage").eq("id", opportunityId).maybeSingle();
  if (!opportunity || opportunity.stage !== "DEMO_BOOKED") redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("La oportunidad no está esperando resultado de demo")}`);

  const payload: Record<string, string> = { demo_attendance: outcome, next_step: nextStep, next_step_due_at: nextDueAt.toISOString(), stage: outcome === "SHOW" ? "DEMO_COMPLETED" : "DEMO_BOOKED" };
  if (outcome === "RESCHEDULED" && rescheduledFor) payload.demo_scheduled_for = rescheduledFor.toISOString();
  const { error } = await supabase.from("b2b_opportunities").update(payload).eq("id", opportunityId);
  if (error) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("No se pudo registrar el resultado de la demo")}`);

  revalidateConversion(opportunityId);
  redirect(`/protected/admin/sales/conversion?success=${encodeURIComponent(`Demo registrada: ${outcome}`)}`);
}

export async function advanceB2BConversion(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "").trim();
  const target = String(formData.get("target_stage") || "").trim().toUpperCase();
  const nextStep = String(formData.get("next_step") || "").trim();
  const nextDueAt = parseMontevideoDateTime(String(formData.get("next_step_due_at") || "").trim());
  if (!opportunityId || !ADVANCE_TARGETS.includes(target as (typeof ADVANCE_TARGETS)[number]) || !nextStep || !nextDueAt) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("Hito, próximo paso y fecha son obligatorios")}`);

  const supabase = await requireAdmin();
  const { data: opportunity } = await supabase.from("b2b_opportunities").select("stage").eq("id", opportunityId).maybeSingle();
  if (!opportunity || ["PAID","LOST"].includes(opportunity.stage)) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("La oportunidad no admite este avance")}`);

  const currentIndex = STAGE_ORDER.indexOf(opportunity.stage as Stage);
  const targetIndex = STAGE_ORDER.indexOf(target as Stage);
  if (targetIndex <= currentIndex) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("El hito debe avanzar la oportunidad")}`);

  const { error } = await supabase.from("b2b_opportunities").update({ stage: target, next_step: nextStep, next_step_due_at: nextDueAt.toISOString() }).eq("id", opportunityId);
  if (error) redirect(`/protected/admin/sales/conversion?error=${encodeURIComponent("No se pudo registrar el hito")}`);

  revalidateConversion(opportunityId);
  redirect(`/protected/admin/sales/conversion?success=${encodeURIComponent(`Hito registrado: ${target}`)}`);
}
