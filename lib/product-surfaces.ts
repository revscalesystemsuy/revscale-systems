import rawSurfaces from "@/lib/product-surfaces.json"
import type { PlanFeature, PlanName } from "@/lib/plan-access"
import type { DemoPlan } from "@/lib/demo-plan"

export type ProductSurfaceIcon =
  | "House"
  | "ListChecks"
  | "Target"
  | "ClipboardList"
  | "Bell"
  | "Users"
  | "Workflow"
  | "Zap"
  | "Building2"
  | "MessagesSquare"
  | "Database"
  | "UsersRound"
  | "BarChart3"
  | "ChartNoAxesCombined"
  | "MessageCircle"
  | "SlidersHorizontal"
  | "CreditCard"
  | "Settings"

export type ProductSurfaceAccess = "all" | "owner" | "owner_or_manager" | "owner_or_enterprise_manager"

export type ProductSurface = {
  id: string
  label: string
  icon: ProductSurfaceIcon
  realHref: string
  demoHref: string
  realAccess: ProductSurfaceAccess
  realPlans: PlanName[]
  demoPlans: DemoPlan[]
  condition?: "onboarding_incomplete"
  badge?: "notifications"
  feature?: PlanFeature
}

export const PRODUCT_SURFACES = rawSurfaces as ProductSurface[]

export function canAccessRealSurface(
  surface: ProductSurface,
  options: { plan: PlanName; role: "OWNER" | "MANAGER" | "AGENT"; onboardingIncomplete: boolean },
) {
  if (!surface.realPlans.includes(options.plan)) return false
  if (surface.condition === "onboarding_incomplete" && !options.onboardingIncomplete) return false
  if (surface.realAccess === "owner") return options.role === "OWNER"
  if (surface.realAccess === "owner_or_manager") return options.role === "OWNER" || options.role === "MANAGER"
  if (surface.realAccess === "owner_or_enterprise_manager") {
    return options.role === "OWNER" || (options.plan === "ENTERPRISE" && options.role === "MANAGER")
  }
  return true
}

export function demoSurfacesForPlan(plan: DemoPlan) {
  return PRODUCT_SURFACES.filter((surface) => surface.demoPlans.includes(plan))
}
