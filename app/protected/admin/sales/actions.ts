'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STAGES = ["NEW","CONTACTED","QUALIFIED","DEMO_BOOKED","DEMO_COMPLETED","PILOT_PROPOSED","PILOT_ACTIVE","PAID","LOST"] as const;
const CHANNELS = ["WEB","WHATSAPP","EMAIL","LINKEDIN","PHONE","OTHER"] as const;
const PLANS = ["STARTER","PROFESSIONAL","ENTERPRISE","UNKNOWN"] as const;
type Stage = (typeof STAGES)[number];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: platformAdmin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!platformAdmin) redirect("/protected");
  return supabase;
}

function optionalInteger(value: FormDataEntryValue | null, min: number, max: number) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error("invalid-number");
  return parsed;
}

function optionalBoolean(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw || raw === "UNKNOWN") return null;
  if (raw === "YES") return true;
  if (raw === "NO") return false;
  throw new Error("invalid-boolean");
}

export async function updateB2BStage(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "").trim();
  const stage = String(formData.get("stage") || "").trim().toUpperCase() as Stage;
  if (!opportunityId || !STAGES.includes(stage)) redirect("/protected/admin/sales?error=Etapa+oportunidad+inválida");
  const supabase = await requireAdmin();
  const { error } = await supabase.from("b2b_opportunities").update({ stage }).eq("id", opportunityId);
  if (error) redirect(`/protected/admin/sales?error=${encodeURIComponent("No se pudo cambiar la etapa")}`);
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales?success=${encodeURIComponent("Etapa actualizada")}`);
}

export async function updateB2BCommercialFields(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "").trim();
  const primaryChannel = String(formData.get("primary_channel") || "").trim().toUpperCase();
  const planInterest = String(formData.get("plan_interest") || "").trim().toUpperCase();
  const nextStep = String(formData.get("next_step") || "").trim();
  const dueRaw = String(formData.get("next_step_due_at") || "").trim();
  const contactRaw = String(formData.get("last_contact_at") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!opportunityId || !CHANNELS.includes(primaryChannel as (typeof CHANNELS)[number]) || !PLANS.includes(planInterest as (typeof PLANS)[number])) {
    redirect(`/protected/admin/sales/${opportunityId}?error=${encodeURIComponent("Campos comerciales inválidos")}`);
  }
  if (!nextStep || !dueRaw) redirect(`/protected/admin/sales/${opportunityId}?error=${encodeURIComponent("El próximo paso y su fecha son obligatorios")}`);

  const dueAt = new Date(dueRaw);
  const lastContactAt = contactRaw ? new Date(contactRaw) : null;
  if (Number.isNaN(dueAt.getTime()) || (lastContactAt && Number.isNaN(lastContactAt.getTime()))) {
    redirect(`/protected/admin/sales/${opportunityId}?error=${encodeURIComponent("Fecha inválida")}`);
  }

  const supabase = await requireAdmin();
  const { error } = await supabase.from("b2b_opportunities").update({
    primary_channel: primaryChannel,
    plan_interest: planInterest,
    next_step: nextStep,
    next_step_due_at: dueAt.toISOString(),
    last_contact_at: lastContactAt ? lastContactAt.toISOString() : null,
    notes: notes || null,
  }).eq("id", opportunityId);

  if (error) redirect(`/protected/admin/sales/${opportunityId}?error=${encodeURIComponent("No se pudo guardar la ficha comercial")}`);
  revalidatePath("/protected/admin/sales");
  revalidatePath(`/protected/admin/sales/${opportunityId}`);
  redirect(`/protected/admin/sales/${opportunityId}?success=${encodeURIComponent("Ficha comercial actualizada")}`);
}

export async function updateB2BScoringSignals(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "").trim();
  if (!opportunityId) redirect("/protected/admin/sales?error=Oportunidad+inválida");

  let signals: Record<string, number | boolean | null>;
  try {
    signals = {
      icp_team_size: optionalInteger(formData.get("icp_team_size"), 1, 500),
      icp_monthly_inquiries: optionalInteger(formData.get("icp_monthly_inquiries"), 0, 1000000),
      icp_lead_sources: optionalInteger(formData.get("icp_lead_sources"), 1, 100),
      icp_whatsapp_daily: optionalBoolean(formData.get("icp_whatsapp_daily")),
      icp_followup_pain: optionalBoolean(formData.get("icp_followup_pain")),
      icp_growth_investment: optionalBoolean(formData.get("icp_growth_investment")),
      icp_decision_access: optionalBoolean(formData.get("icp_decision_access")),
      icp_geography_fit: optionalBoolean(formData.get("icp_geography_fit")),
    };
  } catch {
    redirect(`/protected/admin/sales/${opportunityId}?error=${encodeURIComponent("Señales de ICP inválidas")}`);
  }

  const supabase = await requireAdmin();
  const { error } = await supabase.from("b2b_opportunities").update(signals!).eq("id", opportunityId);
  if (error) redirect(`/protected/admin/sales/${opportunityId}?error=${encodeURIComponent("No se pudo recalcular el ICP")}`);

  revalidatePath("/protected/admin/sales");
  revalidatePath(`/protected/admin/sales/${opportunityId}`);
  redirect(`/protected/admin/sales/${opportunityId}?success=${encodeURIComponent("Scoring ICP actualizado")}`);
}
