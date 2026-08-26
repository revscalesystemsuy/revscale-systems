import { PLAN_CATALOG, formatLimit, type PaidPlanName } from "@/lib/plan-catalog"
import { entitlementPlanHasFeature } from "@/lib/plan-entitlements"

export type DemoPlan = "starter" | "professional" | "enterprise"
export type DemoModule =
  | "matching"
  | "whatsapp"
  | "reports"
  | "analytics"
  | "teams"
  | "integrations"

export type DemoPlanConfig = {
  label: string
  paddlePlan: PaidPlanName
  maxAgents: number
  leadLimit: string
  propertyLimit: string
  positioning: string
  capabilities: readonly string[]
  modules: Readonly<Record<DemoModule, boolean>>
}

const DEMO_TO_PAID_PLAN: Record<DemoPlan, PaidPlanName> = {
  starter: "STARTER",
  professional: "PROFESSIONAL",
  enterprise: "ENTERPRISE",
}

const MODULE_FEATURE = {
  matching: "matching",
  whatsapp: "whatsapp_ai",
  reports: "reports",
  analytics: "analytics",
  teams: "enterprise_operations",
  integrations: "integrations",
} as const

const CAPABILITIES: Record<DemoPlan, readonly string[]> = {
  starter: [
    "Gestión comercial de leads",
    "Pipelines separados de Venta y Alquiler",
    "Propiedades e interacciones",
    "Seguimientos, agenda y tareas",
  ],
  professional: [
    "Matching inteligente",
    "WhatsApp IA con derivación humana",
    "Automatizaciones, comisiones y documentos",
    "Web inmobiliaria, reportes y analítica avanzada",
  ],
  enterprise: [
    "Multi-equipo, roles y asignación automática",
    "Territorios de captación y proyectos en pozo",
    "Firma avanzada y control legal",
    "Dominio propio, white-label e integraciones",
  ],
}

function createDemoPlanConfig(plan: DemoPlan): DemoPlanConfig {
  const paidPlan = DEMO_TO_PAID_PLAN[plan]
  const catalog = PLAN_CATALOG[paidPlan]
  const modules = Object.fromEntries(
    Object.entries(MODULE_FEATURE).map(([module, feature]) => [module, entitlementPlanHasFeature(paidPlan, feature)]),
  ) as Record<DemoModule, boolean>

  return {
    label: catalog.title,
    paddlePlan: paidPlan,
    maxAgents: catalog.limits.agents,
    leadLimit: catalog.limits.leads >= 1_000_000 ? "Leads ilimitados" : `${formatLimit(catalog.limits.leads)} leads`,
    propertyLimit: catalog.limits.properties >= 1_000_000 ? "Propiedades ilimitadas" : `${formatLimit(catalog.limits.properties)} propiedades`,
    positioning: `${catalog.stage}. ${catalog.description}`,
    capabilities: CAPABILITIES[plan],
    modules,
  }
}

export const DEMO_PLAN_CONFIG: Record<DemoPlan, DemoPlanConfig> = {
  starter: createDemoPlanConfig("starter"),
  professional: createDemoPlanConfig("professional"),
  enterprise: createDemoPlanConfig("enterprise"),
}

export function normalizeDemoPlan(value?: string | null): DemoPlan {
  if (value === "starter" || value === "enterprise") return value
  return "professional"
}

export function demoHref(path: string, plan: DemoPlan) {
  return `${path}${path.includes("?") ? "&" : "?"}plan=${plan}`
}

export function demoModuleEnabled(plan: DemoPlan, module: DemoModule) {
  return DEMO_PLAN_CONFIG[plan].modules[module]
}
