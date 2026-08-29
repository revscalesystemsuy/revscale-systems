"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_CATALOG, type PaidPlanName } from "@/lib/plan-catalog";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
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

export async function saveB2BProposal(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const discoverySessionId = text(formData, "discovery_session_id") || null;
  const status = text(formData, "status") || "DRAFT";
  const planName = (text(formData, "plan_name") || "PROFESSIONAL") as PaidPlanName;
  const billingCycle = text(formData, "billing_cycle") === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  if (!opportunityId || !["STARTER","PROFESSIONAL","ENTERPRISE"].includes(planName)) redirect("/protected/admin/sales/proposals?error=Datos%20de%20propuesta%20inv%C3%A1lidos");

  const { supabase, userId } = await requireAdmin();
  const { data: opportunity } = await supabase.from("b2b_opportunities").select("id,stage").eq("id", opportunityId).maybeSingle();
  if (!opportunity || !["DEMO_COMPLETED","PILOT_PROPOSED","QUALIFIED"].includes(opportunity.stage)) {
    redirect(`/protected/admin/sales/proposals/${opportunityId}?error=${encodeURIComponent("La propuesta requiere una oportunidad calificada o con demo completada")}`);
  }

  const facts = list(formData, "observed_facts").slice(0, 5);
  if (status === "READY" && (facts.length < 3 || facts.length > 5)) {
    redirect(`/protected/admin/sales/proposals/${opportunityId}?error=${encodeURIComponent("Una propuesta READY requiere entre 3 y 5 hechos observados")}`);
  }

  const basePrice = billingCycle === "ANNUAL" ? PLAN_CATALOG[planName].annual : PLAN_CATALOG[planName].monthly;
  const founding = text(formData, "founding_price_used") === "YES";
  const foundingPrice = founding ? Number(text(formData, "founding_price_usd") || 0) : null;
  const quotedPrice = founding && foundingPrice ? foundingPrice : basePrice;

  const payload = {
    opportunity_id: opportunityId,
    discovery_session_id: discoverySessionId,
    created_by: userId,
    status,
    observed_facts: facts,
    process_change: text(formData, "process_change") || null,
    implementation_plan: text(formData, "implementation_plan") || null,
    measurement_plan: text(formData, "measurement_plan") || null,
    decision_metrics: list(formData, "decision_metrics").slice(0, 3),
    plan_name: planName,
    billing_cycle: billingCycle,
    quoted_price_usd: quotedPrice,
    pilot_days: 45,
    onboarding_days: 7,
    onboarding_waived: true,
    activation_guarantee: true,
    long_term_contract_required: false,
    founding_price_used: founding,
    founding_price_usd: foundingPrice,
    commercial_notes: text(formData, "commercial_notes") || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase.from("b2b_proposals").select("id").eq("opportunity_id", opportunityId).in("status", ["DRAFT","READY","SENT"]).maybeSingle();
  const result = existing
    ? await supabase.from("b2b_proposals").update(payload).eq("id", existing.id)
    : await supabase.from("b2b_proposals").insert(payload);
  if (result.error) redirect(`/protected/admin/sales/proposals/${opportunityId}?error=${encodeURIComponent(result.error.message)}`);

  revalidatePath("/protected/admin/sales/proposals");
  revalidatePath(`/protected/admin/sales/proposals/${opportunityId}`);
  redirect(`/protected/admin/sales/proposals/${opportunityId}?success=${status === "READY" ? "Propuesta%20lista%20para%20enviar" : "Borrador%20guardado"}`);
}

export async function markB2BProposalSent(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const proposalId = text(formData, "proposal_id");
  if (!opportunityId || !proposalId) redirect("/protected/admin/sales/proposals");
  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_proposals").update({ status: "SENT", sent_at: now, updated_at: now }).eq("id", proposalId).eq("status", "READY");
  if (error) redirect(`/protected/admin/sales/proposals/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ stage: "PILOT_PROPOSED", pilot_proposed_at: now, next_step: "Confirmar decisión sobre Revenue Recovery Pilot.", updated_at: now }).eq("id", opportunityId);
  revalidatePath("/protected/admin/sales/proposals");
  revalidatePath(`/protected/admin/sales/proposals/${opportunityId}`);
  revalidatePath("/protected/admin/sales/conversion");
  redirect(`/protected/admin/sales/proposals/${opportunityId}?success=Propuesta%20marcada%20como%20enviada`);
}
