import { ALL_PIPELINE_STAGES, PIPELINE_STAGE_PROBABILITY } from "@/lib/pipeline-config";

export const PIPELINE_STAGES = ALL_PIPELINE_STAGES.map((stage) => [stage.key, stage.label] as const);

export const LOSS_REASON_LABELS: Record<string, string> = {
  NO_RESPONSE: "Sin respuesta",
  BUDGET: "Presupuesto insuficiente",
  NO_MATCH: "No encontró propiedad adecuada",
  COMPETITOR: "Eligió otra inmobiliaria",
  POSTPONED: "Postergó la decisión",
  FINANCING: "Problema de financiación",
  INVALID_CONTACT: "Contacto inválido",
  OTHER: "Otro motivo",
};

export const STAGE_PROBABILITY: Record<string, number> = PIPELINE_STAGE_PROBABILITY;

type PipelineValueLead = {
  pipeline_stage: string | null;
  budget_max: number | string | null;
  currency: string | null;
};

export type CurrencyForecast = {
  currency: string;
  pipeline: number;
  weighted: number;
  opportunities: number;
};

export function buildForecastByCurrency(leads: PipelineValueLead[]): CurrencyForecast[] {
  const grouped = new Map<string, CurrencyForecast>();

  for (const lead of leads) {
    const stage = lead.pipeline_stage || "NEW";
    if (stage === "WON" || stage === "LOST") continue;

    const value = Number(lead.budget_max || 0);
    if (!Number.isFinite(value) || value <= 0) continue;

    const currency = (lead.currency || "Sin moneda").toUpperCase();
    const current = grouped.get(currency) || { currency, pipeline: 0, weighted: 0, opportunities: 0 };
    current.pipeline += value;
    current.weighted += value * (STAGE_PROBABILITY[stage] ?? 0.1);
    current.opportunities += 1;
    grouped.set(currency, current);
  }

  return [...grouped.values()].sort((a, b) => b.pipeline - a.pipeline);
}

export function formatCommercialAmount(currency: string, value: number) {
  const rounded = Math.round(value);
  return `${currency} ${rounded.toLocaleString("es-UY")}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return "—";
  const total = Math.max(0, Number(seconds));
  const days = total / 86400;
  if (days >= 1) return `${days.toFixed(days >= 10 ? 0 : 1)} d`;
  const hours = total / 3600;
  if (hours >= 1) return `${hours.toFixed(hours >= 10 ? 0 : 1)} h`;
  const minutes = total / 60;
  return `${Math.max(1, Math.round(minutes))} min`;
}
