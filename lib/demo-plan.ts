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
  paddlePlan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE"
  maxAgents: number
  leadLimit: string
  propertyLimit: string
  positioning: string
  capabilities: readonly string[]
  modules: Readonly<Record<DemoModule, boolean>>
}

export const DEMO_PLAN_CONFIG: Record<DemoPlan, DemoPlanConfig> = {
  starter: {
    label: "Starter",
    paddlePlan: "STARTER",
    maxAgents: 3,
    leadLimit: "500 leads",
    propertyLimit: "100 propiedades",
    positioning: "Operación comercial esencial para equipos pequeños.",
    capabilities: [
      "Gestión comercial de leads",
      "Pipeline de ventas",
      "Propiedades e interacciones",
      "Seguimientos y tareas",
    ],
    modules: {
      matching: false,
      whatsapp: false,
      reports: false,
      analytics: false,
      teams: false,
      integrations: false,
    },
  },
  professional: {
    label: "Professional",
    paddlePlan: "PROFESSIONAL",
    maxAgents: 15,
    leadLimit: "Leads ilimitados",
    propertyLimit: "Inventario ampliado",
    positioning: "Priorización, automatización y lectura comercial avanzada.",
    capabilities: [
      "Matching inteligente",
      "WhatsApp IA con derivación humana",
      "Reportes comerciales",
      "Analítica avanzada",
    ],
    modules: {
      matching: true,
      whatsapp: true,
      reports: true,
      analytics: true,
      teams: false,
      integrations: false,
    },
  },
  enterprise: {
    label: "Enterprise",
    paddlePlan: "ENTERPRISE",
    maxAgents: 30,
    leadLimit: "Leads ilimitados",
    propertyLimit: "Inventario ampliado",
    positioning: "Control de equipos, automatización e integraciones a escala.",
    capabilities: [
      "Multi-equipo y roles",
      "Asignación automática",
      "Integraciones avanzadas",
      "WhatsApp IA por equipos",
    ],
    modules: {
      matching: true,
      whatsapp: true,
      reports: true,
      analytics: true,
      teams: true,
      integrations: true,
    },
  },
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
