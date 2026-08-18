import { createClient } from "@/lib/supabase/server";

export type PlanName = "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type PlanFeature = "matching" | "analytics" | "reports" | "integrations";

export function normalizePlan(plan?: string | null): PlanName {
  const value = String(plan || "TRIAL").toUpperCase();

  if (value === "PRO" || value === "PROFESSIONAL") return "PROFESSIONAL";
  if (value === "ENTERPRISE") return "ENTERPRISE";
  if (value === "STARTER") return "STARTER";
  return "TRIAL";
}

export function planHasFeature(plan: string | null | undefined, feature: PlanFeature) {
  const normalized = normalizePlan(plan);

  if (feature === "integrations") {
    return normalized === "ENTERPRISE";
  }

  if (feature === "matching" || feature === "analytics" || feature === "reports") {
    return normalized === "PROFESSIONAL" || normalized === "ENTERPRISE";
  }

  return false;
}

export async function getCurrentSubscription() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!membership?.organization_id) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,max_agents,max_leads,max_properties")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  return {
    organizationId: membership.organization_id,
    plan: normalizePlan(subscription?.plan),
    status: subscription?.status || "INACTIVE",
    maxAgents: subscription?.max_agents ?? 0,
    maxLeads: subscription?.max_leads ?? 0,
    maxProperties: subscription?.max_properties ?? 0,
  };
}

export async function currentPlanHasFeature(feature: PlanFeature) {
  const subscription = await getCurrentSubscription();

  if (!subscription || subscription.status !== "ACTIVE") return false;
  return planHasFeature(subscription.plan, feature);
}
