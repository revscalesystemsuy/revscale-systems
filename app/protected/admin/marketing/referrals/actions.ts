"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

const clean = (v: FormDataEntryValue | null) => String(v || "").trim();

export async function createReferralCode(formData: FormData) {
  const { supabase } = await requireAdmin();
  const organizationId = clean(formData.get("organization_id"));
  const basis = clean(formData.get("eligibility_basis"));
  const evidence = clean(formData.get("eligibility_evidence"));
  if (!organizationId || !basis || !evidence) throw new Error("Organización, base y evidencia son obligatorias.");
  const { error } = await supabase.rpc("create_customer_referral_code", {
    p_referrer_organization_id: organizationId,
    p_eligibility_basis: basis,
    p_eligibility_evidence: evidence,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/protected/admin/marketing/referrals");
}

export async function refreshReferral(formData: FormData) {
  const { supabase } = await requireAdmin();
  const referralId = clean(formData.get("referral_id"));
  const { error } = await supabase.rpc("refresh_customer_referral_eligibility", { p_referral_id: referralId });
  if (error) throw new Error(error.message);
  revalidatePath("/protected/admin/marketing/referrals");
}

export async function approveReferralReward(formData: FormData) {
  const { supabase } = await requireAdmin();
  const referralId = clean(formData.get("referral_id"));
  const notes = clean(formData.get("notes"));
  const { error } = await supabase.rpc("approve_customer_referral_reward", {
    p_referral_id: referralId,
    p_discount_conflict_cleared: formData.get("discount_conflict_cleared") === "on",
    p_notes: notes || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/protected/admin/marketing/referrals");
}

export async function markCreditApplied(formData: FormData) {
  const { supabase } = await requireAdmin();
  const referralId = clean(formData.get("referral_id"));
  const reference = clean(formData.get("reference"));
  const { error } = await supabase.rpc("mark_customer_referral_credit_applied", { p_referral_id: referralId, p_reference: reference });
  if (error) throw new Error(error.message);
  revalidatePath("/protected/admin/marketing/referrals");
}

export async function markNewCustomerBenefitFulfilled(formData: FormData) {
  const { supabase } = await requireAdmin();
  const referralId = clean(formData.get("referral_id"));
  const { error } = await supabase.rpc("mark_referral_new_customer_benefit_fulfilled", { p_referral_id: referralId });
  if (error) throw new Error(error.message);
  revalidatePath("/protected/admin/marketing/referrals");
}

export async function updateReferralSettings(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const rawCap = clean(formData.get("annual_credit_cap_count"));
  const cap = Number.parseInt(rawCap, 10);
  if (!Number.isFinite(cap) || cap < 1 || cap > 24) throw new Error("Definí un máximo anual entre 1 y 24 créditos antes de activar recompensas.");
  const benefit = clean(formData.get("new_customer_benefit_default"));
  if (!['ONBOARDING_COMPED','OPTIMIZATION_SESSION'].includes(benefit)) throw new Error("Beneficio inválido.");
  const { error } = await supabase.from("b2b_referral_program_settings").update({ annual_credit_cap_count: cap, new_customer_benefit_default: benefit, updated_by: userId, updated_at: new Date().toISOString() }).eq("program_key", "REVSCALE_NETWORK");
  if (error) throw new Error(error.message);
  revalidatePath("/protected/admin/marketing/referrals");
}
