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

function revalidateClosing(opportunityId: string) {
  revalidatePath("/protected/admin/sales/closing");
  revalidatePath(`/protected/admin/sales/closing/${opportunityId}`);
  revalidatePath("/protected/admin/sales/conversion");
  revalidatePath("/protected/admin/sales");
  revalidatePath(`/protected/admin/sales/${opportunityId}`);
}

export async function saveClosing(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/closing");
  const { supabase, userId } = await requireAdmin();

  const { data: opportunity } = await supabase.from("b2b_opportunities").select("id,stage").eq("id", opportunityId).maybeSingle();
  if (!opportunity || !["PILOT_PROPOSED","PILOT_ACTIVE"].includes(opportunity.stage)) {
    redirect(`/protected/admin/sales/closing/${opportunityId}?error=${encodeURIComponent("El cierre requiere una oportunidad con piloto propuesto o activo")}`);
  }

  const { data: negotiation } = await supabase.from("b2b_negotiations").select("id,status,revised_price_usd,revised_pilot_days").eq("opportunity_id", opportunityId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!negotiation || negotiation.status !== "AGREED") {
    redirect(`/protected/admin/sales/closing/${opportunityId}?error=${encodeURIComponent("Antes de cerrar debe existir una negociación acordada")}`);
  }

  const finalPlan = text(formData, "final_plan_name") || "PROFESSIONAL";
  const billingCycle = text(formData, "final_billing_cycle") === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const finalPrice = Number(text(formData, "final_price_usd") || negotiation.revised_price_usd || 249);
  const finalPilotDays = Number(text(formData, "final_pilot_days") || negotiation.revised_pilot_days || 45);
  const now = new Date().toISOString();

  const payload = {
    opportunity_id: opportunityId,
    proposal_id: text(formData, "proposal_id") || null,
    pilot_agreement_id: text(formData, "pilot_agreement_id") || null,
    negotiation_id: negotiation.id,
    created_by: userId,
    status: "PREPARED",
    final_plan_name: finalPlan,
    final_billing_cycle: billingCycle,
    final_price_usd: finalPrice,
    final_pilot_days: finalPilotDays,
    accepted_by_name: text(formData, "accepted_by_name") || null,
    accepted_by_role: text(formData, "accepted_by_role") || null,
    acceptance_notes: text(formData, "acceptance_notes") || null,
    handoff_notes: text(formData, "handoff_notes") || null,
    updated_at: now,
  };

  const { data: existing } = await supabase.from("b2b_closings").select("id").eq("opportunity_id", opportunityId).maybeSingle();
  const result = existing ? await supabase.from("b2b_closings").update(payload).eq("id", existing.id) : await supabase.from("b2b_closings").insert(payload);
  if (result.error) redirect(`/protected/admin/sales/closing/${opportunityId}?error=${encodeURIComponent(result.error.message)}`);

  await supabase.from("b2b_opportunities").update({ next_step: "Confirmar aceptación comercial.", updated_at: now }).eq("id", opportunityId);
  revalidateClosing(opportunityId);
  redirect(`/protected/admin/sales/closing/${opportunityId}?success=Cierre%20preparado`);
}

export async function confirmCommercialAcceptance(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/closing");
  const { supabase } = await requireAdmin();
  const { data: closing } = await supabase.from("b2b_closings").select("id,status,accepted_by_name").eq("opportunity_id", opportunityId).maybeSingle();
  if (!closing || !["PREPARED","COMMERCIAL_ACCEPTED"].includes(closing.status) || !closing.accepted_by_name) {
    redirect(`/protected/admin/sales/closing/${opportunityId}?error=${encodeURIComponent("Falta registrar quién aceptó comercialmente")}`);
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_closings").update({ status: "COMMERCIAL_ACCEPTED", commercial_accepted_at: now, updated_at: now }).eq("id", closing.id);
  if (error) redirect(`/protected/admin/sales/closing/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ next_step: "Confirmar pago real antes de marcar PAID.", updated_at: now }).eq("id", opportunityId);
  revalidateClosing(opportunityId);
  redirect(`/protected/admin/sales/closing/${opportunityId}?success=Aceptaci%C3%B3n%20comercial%20confirmada`);
}

export async function confirmPayment(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const paymentReference = text(formData, "payment_reference");
  if (!opportunityId || !paymentReference) redirect(`/protected/admin/sales/closing/${opportunityId}?error=${encodeURIComponent("Ingresá una referencia verificable del pago")}`);
  const { supabase } = await requireAdmin();
  const { data: closing } = await supabase.from("b2b_closings").select("id,status").eq("opportunity_id", opportunityId).maybeSingle();
  if (!closing || closing.status !== "COMMERCIAL_ACCEPTED") {
    redirect(`/protected/admin/sales/closing/${opportunityId}?error=${encodeURIComponent("Primero debe existir aceptación comercial confirmada")}`);
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_closings").update({ status: "PAYMENT_CONFIRMED", payment_reference: paymentReference, payment_notes: text(formData, "payment_notes") || null, payment_confirmed_at: now, updated_at: now }).eq("id", closing.id);
  if (error) redirect(`/protected/admin/sales/closing/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ stage: "PAID", paid_at: now, next_step: "Handoff a onboarding y seguimiento de activación.", updated_at: now }).eq("id", opportunityId);
  revalidateClosing(opportunityId);
  redirect(`/protected/admin/sales/closing/${opportunityId}?success=Pago%20confirmado%20y%20oportunidad%20marcada%20PAID`);
}
