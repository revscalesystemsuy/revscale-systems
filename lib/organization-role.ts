import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, planHasFeature, type PlanFeature } from "@/lib/plan-access";

export type OrganizationRole = "OWNER" | "MANAGER" | "AGENT";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: "Director",
  MANAGER: "Gerente",
  AGENT: "Agente",
};

export async function getCurrentOrganizationContext() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id,organization_id,role,status,team_id")
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "SUSPENDED_BILLING"])
    .single();

  if (!membership) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  return {
    supabase,
    userId,
    membershipId: membership.id,
    membershipStatus: membership.status,
    organizationId: membership.organization_id,
    role: membership.role as OrganizationRole,
    teamId: membership.team_id as string | null,
    plan: normalizePlan(subscription?.plan),
    subscriptionStatus: subscription?.status || "INACTIVE",
  };
}

async function requireActiveContext() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");

  if (context.subscriptionStatus !== "ACTIVE" || context.membershipStatus !== "ACTIVE") {
    redirect("/protected");
  }

  return context;
}

export async function requireEnterpriseRole(allowedRoles: OrganizationRole[]) {
  const context = await requireActiveContext();

  if (context.plan === "ENTERPRISE" && !allowedRoles.includes(context.role)) {
    redirect("/protected");
  }

  return context;
}

export async function requirePeopleManager() {
  const context = await requireActiveContext();

  if (context.role === "OWNER") return context;
  if (context.plan === "ENTERPRISE" && context.role === "MANAGER") return context;

  redirect("/protected");
}

export async function requireManagementFeature(feature: PlanFeature) {
  const context = await requireActiveContext();

  if (!planHasFeature(context.plan, feature)) {
    redirect("/protected/billing");
  }

  if (context.plan === "ENTERPRISE" && !["OWNER", "MANAGER"].includes(context.role)) {
    redirect("/protected");
  }

  return context;
}

export async function requireCompanyAdmin() {
  const context = await requireActiveContext();

  if (context.plan === "ENTERPRISE" && context.role !== "OWNER") {
    redirect("/protected");
  }

  return context;
}

export async function requireCompanyAdminFeature(feature: PlanFeature) {
  const context = await requireCompanyAdmin();

  if (!planHasFeature(context.plan, feature)) {
    redirect("/protected/billing");
  }

  return context;
}

export function isEnterpriseAgent(plan: string, role: OrganizationRole) {
  return normalizePlan(plan) === "ENTERPRISE" && role === "AGENT";
}
