export type PaidPlanName = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type BillingCycle = "MONTHLY" | "ANNUAL";

export type ComparisonValue = boolean | string;

export type PaidPlanCatalogItem = {
  name: PaidPlanName;
  title: string;
  stage: string;
  audience: string;
  description: string;
  monthly: number;
  annual: number;
  popular: boolean;
  limits: {
    agents: number;
    leads: number;
    properties: number;
  };
  features: string[];
  lockedFeatures: Array<{ label: string; requiredPlan: "Professional" | "Enterprise" }>;
  demo: {
    title: string;
    description: string;
    experiences: string[];
    footer: string;
  };
};

export const PAID_PLAN_ORDER: PaidPlanName[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

export const PLAN_CATALOG: Record<PaidPlanName, PaidPlanCatalogItem> = {
  STARTER: {
    name: "STARTER",
    title: "Starter",
    stage: "Ordenar",
    audience: "Inmobiliarias chicas y equipos de hasta 3 agentes",
    description: "Ordená leads, seguimientos y pipeline para que cada oportunidad tenga responsable y próximo paso.",
    monthly: 99,
    annual: 990,
    popular: false,
    limits: { agents: 3, leads: 500, properties: 100 },
    features: [
      "CRM de leads y pipeline separado para Venta y Alquiler",
      "Gestión de propiedades, interacciones y seguimientos",
      "Qué hacer hoy, calendario de cierres y notificaciones",
      "Resumen comercial y vistas de dirección",
      "Importación de leads y propiedades",
      "Hasta 3 agentes, 500 leads y 100 propiedades",
      "Experiencia móvil instalable como app",
    ],
    lockedFeatures: [
      { label: "Matching automático, WhatsApp IA y automatizaciones", requiredPlan: "Professional" },
      { label: "Web inmobiliaria, distribución y documentos", requiredPlan: "Professional" },
      { label: "Territorios, proyectos, firma avanzada y control legal", requiredPlan: "Enterprise" },
    ],
    demo: {
      title: "Ordená la operación comercial esencial.",
      description: "Recorré cómo un equipo chico organiza leads, propiedades y seguimientos para que las oportunidades no dependan de memoria o planillas paralelas.",
      experiences: [
        "Gestionar leads y mover oportunidades por pipelines de Venta y Alquiler.",
        "Trabajar con hasta 3 agentes, 500 leads y 100 propiedades.",
        "Organizar seguimientos, tareas, calendario e interacciones comerciales.",
        "Ver cómo se bloquean las capacidades de crecimiento reservadas para Professional y Enterprise.",
      ],
      footer: "Ideal para equipos chicos que necesitan orden comercial y disciplina de seguimiento.",
    },
  },
  PROFESSIONAL: {
    name: "PROFESSIONAL",
    title: "Professional",
    stage: "Automatizar y convertir",
    audience: "Equipos inmobiliarios con volumen que necesitan vender con más velocidad",
    description: "Para equipos con volumen que necesitan priorizar, automatizar y convertir sin sumar trabajo manual.",
    monthly: 249,
    annual: 2490,
    popular: true,
    limits: { agents: 15, leads: 1_000_000, properties: 1_000_000 },
    features: [
      "Todo Starter",
      "Hasta 15 agentes, leads y propiedades ilimitados",
      "Matching automático entre demanda e inventario",
      "WhatsApp IA, inbox y derivación humana",
      "Automatizaciones inmobiliarias y comisiones por cierre",
      "Web inmobiliaria propia con catálogo y consultas al CRM",
      "Distribución multicanal preparada para portales",
      "Documentos y contratos con plantillas, hash y trazabilidad",
      "Analítica avanzada y reportes comerciales",
    ],
    lockedFeatures: [
      { label: "Multi-equipo, territorios y asignación automática", requiredPlan: "Enterprise" },
      { label: "Proyectos en pozo, firma avanzada y control legal", requiredPlan: "Enterprise" },
      { label: "Dominio propio, white-label e integraciones avanzadas", requiredPlan: "Enterprise" },
    ],
    demo: {
      title: "Sabé qué oportunidad mover ahora y qué hacer después.",
      description: "Professional prioriza la cola diaria, conecta demanda con inventario, mantiene el contexto en WhatsApp y vuelve a poner en movimiento oportunidades cuando aparece un motivo comercial real.",
      experiences: [
        "Priorizar oportunidades por intención, SLA, seguimiento y riesgo.",
        "Cruzar compradores con propiedades compatibles y entender por qué encajan.",
        "Mantener conversaciones y derivación humana sin perder contexto comercial.",
        "Detectar oportunidades para reactivar y darle a dirección visibilidad del proceso.",
      ],
      footer: "Es el plan recomendado para inmobiliarias que ya tienen flujo de leads y necesitan convertir con más criterio y menos dependencia de memoria.",
    },
  },
  ENTERPRISE: {
    name: "ENTERPRISE",
    title: "Enterprise",
    stage: "Escalar y controlar",
    audience: "Inmobiliarias con varios equipos, captación territorial o desarrollos",
    description: "Escalá equipos, captación y operaciones complejas sin perder ownership, trazabilidad ni control comercial.",
    monthly: 499,
    annual: 4990,
    popular: false,
    limits: { agents: 30, leads: 1_000_000, properties: 1_000_000 },
    features: [
      "Todo Professional",
      "Hasta 30 agentes con equipos, roles y asignación automática",
      "Territorios de captación con responsables, metas y pipeline de propietarios",
      "Proyectos en pozo con torres, tipologías, unidades y stock sincronizado",
      "Firma electrónica avanzada preparada por proveedor",
      "Control legal automático de expedientes, firmas y vencimientos",
      "Dominio propio y opción white-label para la web inmobiliaria",
      "Integraciones avanzadas y operación de WhatsApp IA por equipos",
      "Soporte prioritario",
    ],
    lockedFeatures: [],
    demo: {
      title: "Escalá equipos sin multiplicar el desorden.",
      description: "Enterprise agrega gobierno operativo para varios equipos, territorios y desarrollos, manteniendo reglas comunes, responsables y visibilidad de dirección.",
      experiences: [
        "Coordinar hasta 30 agentes con equipos, roles y asignación automática.",
        "Gestionar territorios de captación, objetivos y prospectos propietarios.",
        "Explorar proyectos en pozo y stock de unidades sincronizado con Propiedades.",
        "Revisar firma avanzada, control legal, dominio propio, white-label e integraciones.",
      ],
      footer: "Las conexiones externas reales y proveedores de firma permanecen desactivados dentro de la demo.",
    },
  },
};

export const TRIAL_FEATURES = [
  "Dashboard comercial de evaluación",
  "Gestión básica de leads",
];

export const PLAN_COMPARISON_ROWS: Array<{
  label: string;
  starter: ComparisonValue;
  professional: ComparisonValue;
  enterprise: ComparisonValue;
}> = [
  { label: "CRM, leads y pipelines Venta/Alquiler", starter: true, professional: true, enterprise: true },
  { label: "Agentes incluidos", starter: "3", professional: "15", enterprise: "30" },
  { label: "Leads / propiedades", starter: "500 / 100", professional: "Ilimitados", enterprise: "Ilimitados" },
  { label: "Matching automático + WhatsApp IA", starter: false, professional: true, enterprise: true },
  { label: "Automatizaciones + comisiones", starter: false, professional: true, enterprise: true },
  { label: "Web inmobiliaria + distribución", starter: false, professional: true, enterprise: true },
  { label: "Documentos y contratos", starter: false, professional: true, enterprise: true },
  { label: "Analítica y reportes avanzados", starter: false, professional: true, enterprise: true },
  { label: "Multi-equipo + asignación automática", starter: false, professional: false, enterprise: true },
  { label: "Territorios y captación", starter: false, professional: false, enterprise: true },
  { label: "Proyectos en pozo", starter: false, professional: false, enterprise: true },
  { label: "Firma avanzada + control legal", starter: false, professional: false, enterprise: true },
  { label: "Dominio propio + white-label", starter: false, professional: false, enterprise: true },
  { label: "Integraciones avanzadas", starter: false, professional: false, enterprise: true },
];

export function normalizePaidPlan(value?: string | null): PaidPlanName {
  const plan = String(value || "STARTER").toUpperCase();
  if (plan === "PRO" || plan === "PROFESSIONAL") return "PROFESSIONAL";
  if (plan === "ENTERPRISE") return "ENTERPRISE";
  return "STARTER";
}

export function getPlanPrice(plan: PaidPlanName, cycle: BillingCycle) {
  return cycle === "ANNUAL" ? PLAN_CATALOG[plan].annual : PLAN_CATALOG[plan].monthly;
}

export function formatLimit(value: number) {
  return value >= 1_000_000 ? "Ilimitado" : value.toLocaleString("es-UY");
}
