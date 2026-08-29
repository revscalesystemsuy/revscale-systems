"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const bool = (fd: FormData, key: string) => fd.get(key) === "on";
const list = (fd: FormData, key: string) => text(fd, key).split("\n").map((x) => x.trim()).filter(Boolean);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

export async function saveOnboardingPlan(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/onboarding");
  const { supabase, userId } = await requireAdmin();

  const { data: opportunity } = await supabase.from("b2b_opportunities").select("id,stage").eq("id", opportunityId).maybeSingle();
  if (!opportunity || !["PILOT_ACTIVE","PAID"].includes(opportunity.stage)) {
    redirect(`/protected/admin/sales/onboarding/${opportunityId}?error=${encodeURIComponent("El onboarding requiere un piloto activo o una cuenta ya pagada")}`);
  }

  const now = new Date().toISOString();
  const payload = {
    opportunity_id: opportunityId,
    pilot_agreement_id: text(formData, "pilot_agreement_id") || null,
    created_by: userId,
    sponsor_name: text(formData, "sponsor_name") || null,
    sponsor_role: text(formData, "sponsor_role") || null,
    champion_name: text(formData, "champion_name") || null,
    champion_role: text(formData, "champion_role") || null,
    kickoff_at: text(formData, "kickoff_at") ? new Date(`${text(formData, "kickoff_at")}:00-03:00`).toISOString() : null,
    target_complete_date: text(formData, "target_complete_date") || null,
    baseline_notes: text(formData, "baseline_notes") || null,
    integration_notes: text(formData, "integration_notes") || null,
    risks: text(formData, "risks") || null,
    business_review_cadence: text(formData, "business_review_cadence") || null,
    day0_complete: bool(formData, "day0_complete"),
    day1_complete: bool(formData, "day1_complete"),
    day2_complete: bool(formData, "day2_complete"),
    day3_complete: bool(formData, "day3_complete"),
    day4_complete: bool(formData, "day4_complete"),
    day5_complete: bool(formData, "day5_complete"),
    day6_complete: bool(formData, "day6_complete"),
    day7_complete: bool(formData, "day7_complete"),
    aha_opportunities: list(formData, "aha_opportunities").slice(0, 10),
    weekly_routine_committed: bool(formData, "weekly_routine_committed"),
    status: "IN_PROGRESS",
    updated_at: now,
  };

  const { data: existing } = await supabase.from("b2b_onboarding_plans").select("id").eq("opportunity_id", opportunityId).maybeSingle();
  const result = existing
    ? await supabase.from("b2b_onboarding_plans").update(payload).eq("id", existing.id)
    : await supabase.from("b2b_onboarding_plans").insert(payload);
  if (result.error) redirect(`/protected/admin/sales/onboarding/${opportunityId}?error=${encodeURIComponent(result.error.message)}`);

  await supabase.from("b2b_opportunities").update({ next_step: "Completar onboarding de 7 días y preparar baseline medible.", updated_at: now }).eq("id", opportunityId);
  revalidatePath("/protected/admin/sales/onboarding");
  revalidatePath(`/protected/admin/sales/onboarding/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales/onboarding/${opportunityId}?success=Onboarding%20actualizado`);
}

export async function completeOnboarding(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/onboarding");
  const { supabase } = await requireAdmin();
  const { data: plan } = await supabase.from("b2b_onboarding_plans").select("*").eq("opportunity_id", opportunityId).maybeSingle();
  if (!plan) redirect(`/protected/admin/sales/onboarding/${opportunityId}?error=${encodeURIComponent("Primero creá el plan de onboarding")}`);

  const allDays = [0,1,2,3,4,5,6,7].every((day) => plan[`day${day}_complete`] === true);
  const ahaCount = Array.isArray(plan.aha_opportunities) ? plan.aha_opportunities.length : 0;
  if (!plan.sponsor_name || !plan.champion_name || !allDays || ahaCount < 3 || !plan.weekly_routine_committed) {
    redirect(`/protected/admin/sales/onboarding/${opportunityId}?error=${encodeURIComponent("Para cerrar onboarding: sponsor + champion, días 0-7 completos, 3 oportunidades aha y rutina semanal comprometida")}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_onboarding_plans").update({ status: "COMPLETED", completed_at: now, updated_at: now }).eq("id", plan.id);
  if (error) redirect(`/protected/admin/sales/onboarding/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ next_step: "Registrar baseline y calcular Activation Score.", updated_at: now }).eq("id", opportunityId);

  revalidatePath("/protected/admin/sales/onboarding");
  revalidatePath(`/protected/admin/sales/onboarding/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales/onboarding/${opportunityId}?success=Onboarding%20de%207%20días%20completado`);
}
