import rawEntitlements from "@/lib/plan-entitlements.json"

export type EntitlementPlanName = "STARTER" | "PROFESSIONAL" | "ENTERPRISE"
export type PlanFeature = keyof typeof rawEntitlements

export const PLAN_FEATURE_ENTITLEMENTS = rawEntitlements as Record<PlanFeature, readonly EntitlementPlanName[]>

export function entitlementPlanHasFeature(plan: string | null | undefined, feature: PlanFeature) {
  const normalized = String(plan || "").toUpperCase()
  if (normalized === "PRO") return PLAN_FEATURE_ENTITLEMENTS[feature].includes("PROFESSIONAL")
  return PLAN_FEATURE_ENTITLEMENTS[feature].includes(normalized as EntitlementPlanName)
}

export function plansForFeature(feature: PlanFeature) {
  return PLAN_FEATURE_ENTITLEMENTS[feature]
}
