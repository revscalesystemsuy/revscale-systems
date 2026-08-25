import { PIPELINE_STAGES } from "@/lib/pipeline-metrics";

export const OPEN_PIPELINE_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "VISIT", "NEGOTIATION"] as const;
export const OPEN_PIPELINE_STAGE_SET = new Set<string>(OPEN_PIPELINE_STAGES);

export const STALE_STAGE_DAYS: Record<string, number> = {
  NEW: 3,
  CONTACTED: 3,
  QUALIFIED: 7,
  VISIT: 7,
  NEGOTIATION: 10,
};

export const PIPELINE_STAGE_LABELS = Object.fromEntries(PIPELINE_STAGES) as Record<string, string>;

export type CommercialRiskLead = {
  pipeline_stage: string | null;
  stage_entered_at: string | null;
  expected_close_date: string | null;
  lead_temperature?: string | null;
  requires_human?: boolean | null;
  next_action?: string | null;
  created_at?: string | null;
};

export type OpportunityRisk = {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  stageAgeDays: number;
  staleThresholdDays: number;
  isStalled: boolean;
  isExpectedCloseOverdue: boolean;
};

export type TodayAction = {
  action: string;
  reason: string;
  priority: number;
};

function dateKeyInTimezone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

export function getBusinessDateKey(now = new Date()) {
  return dateKeyInTimezone(now, "America/Montevideo");
}

export function daysSince(value: string | null | undefined, now = new Date()) {
  if (!value) return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 86_400_000));
}

export function calculateOpportunityRisk(
  lead: CommercialRiskLead,
  options: {
    now?: Date;
    lastInteractionAt?: string | null;
    hasPendingFollowup?: boolean;
    hasOverdueFollowup?: boolean;
  } = {},
): OpportunityRisk {
  const now = options.now || new Date();
  const stage = lead.pipeline_stage || "NEW";
  const threshold = STALE_STAGE_DAYS[stage] || 7;
  const stageAgeDays = daysSince(lead.stage_entered_at || lead.created_at, now);
  const isStalled = OPEN_PIPELINE_STAGE_SET.has(stage) && stageAgeDays >= threshold;
  const today = getBusinessDateKey(now);
  const isExpectedCloseOverdue = Boolean(
    OPEN_PIPELINE_STAGE_SET.has(stage) && lead.expected_close_date && lead.expected_close_date < today,
  );

  if (!OPEN_PIPELINE_STAGE_SET.has(stage)) {
    return {
      score: 0,
      level: "LOW",
      reasons: [],
      stageAgeDays,
      staleThresholdDays: threshold,
      isStalled: false,
      isExpectedCloseOverdue: false,
    };
  }

  let score = 0;
  const reasons: string[] = [];

  if (isExpectedCloseOverdue) {
    score += 35;
    reasons.push("fecha estimada de cierre vencida");
  }

  if (stageAgeDays >= threshold * 2) {
    score += 35;
    reasons.push(`lleva ${stageAgeDays} días en ${PIPELINE_STAGE_LABELS[stage] || stage}`);
  } else if (isStalled) {
    score += 20;
    reasons.push(`superó el tiempo recomendado en ${PIPELINE_STAGE_LABELS[stage] || stage}`);
  }

  const lastInteractionAt = options.lastInteractionAt || null;
  const interactionAgeDays = lastInteractionAt ? daysSince(lastInteractionAt, now) : daysSince(lead.created_at, now);
  if (!lastInteractionAt && interactionAgeDays >= 3) {
    score += 20;
    reasons.push("sin interacción registrada reciente");
  } else if (lastInteractionAt && interactionAgeDays >= 7) {
    score += 25;
    reasons.push(`${interactionAgeDays} días desde la última interacción`);
  } else if (lastInteractionAt && interactionAgeDays >= 3) {
    score += 10;
    reasons.push(`${interactionAgeDays} días desde la última interacción`);
  }

  if (options.hasOverdueFollowup) {
    score += 20;
    reasons.push("seguimiento vencido");
  } else if (
    options.hasPendingFollowup === false &&
    ["QUALIFIED", "VISIT", "NEGOTIATION"].includes(stage)
  ) {
    score += 10;
    reasons.push("sin seguimiento pendiente definido");
  }

  if (lead.requires_human) {
    score += 10;
    reasons.push("requiere atención humana");
  }

  score = Math.min(100, score);
  const level: OpportunityRisk["level"] = score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";

  return {
    score,
    level,
    reasons,
    stageAgeDays,
    staleThresholdDays: threshold,
    isStalled,
    isExpectedCloseOverdue,
  };
}

export function buildTodayAction(
  lead: CommercialRiskLead,
  risk: OpportunityRisk,
  options: {
    hasOverdueFollowup?: boolean;
    overdueFollowupTitle?: string | null;
    today?: string;
  } = {},
): TodayAction {
  const stage = lead.pipeline_stage || "NEW";
  const today = options.today || getBusinessDateKey();

  if (options.hasOverdueFollowup) {
    return {
      action: options.overdueFollowupTitle || "Resolver seguimiento vencido",
      reason: "Hay un follow-up fuera de fecha.",
      priority: 100,
    };
  }

  if (risk.isExpectedCloseOverdue) {
    return {
      action: "Revisar cierre previsto y destrabar operación",
      reason: `La fecha estimada de cierre (${lead.expected_close_date}) ya venció.`,
      priority: 95,
    };
  }

  if (lead.expected_close_date === today) {
    return {
      action: "Confirmar cierre previsto para hoy",
      reason: "La oportunidad tiene fecha estimada de cierre hoy.",
      priority: 90,
    };
  }

  if (risk.level === "HIGH") {
    return {
      action: "Recuperar oportunidad en riesgo",
      reason: risk.reasons.slice(0, 2).join(" · ") || "Se acumularon señales de riesgo comercial.",
      priority: 85,
    };
  }

  if (risk.isStalled) {
    return {
      action: "Reactivar conversación",
      reason: `Lleva ${risk.stageAgeDays} días en ${PIPELINE_STAGE_LABELS[stage] || stage}.`,
      priority: 75,
    };
  }

  if ((lead.lead_temperature || "").toUpperCase() === "HOT") {
    return {
      action: lead.next_action || "Priorizar contacto",
      reason: "Oportunidad de alta intención comercial.",
      priority: 65,
    };
  }

  return {
    action: lead.next_action || "Contactar oportunidad",
    reason: lead.next_action ? "Próxima acción comercial definida." : "No hay próxima acción registrada.",
    priority: lead.next_action ? 45 : 35,
  };
}
