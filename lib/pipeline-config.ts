export type PipelineOperation = "COMPRA" | "ALQUILER";

export type PipelineStageDefinition = {
  key: string;
  label: string;
  hint: string;
  probability: number;
  staleDays: number;
  closed?: boolean;
};

export const SALE_PIPELINE_STAGES: PipelineStageDefinition[] = [
  { key: "NEW", label: "Nuevo lead", hint: "Pendiente de contacto", probability: 0.1, staleDays: 3 },
  { key: "CONTACTED", label: "Contactado", hint: "Conversación iniciada", probability: 0.2, staleDays: 3 },
  { key: "QUALIFIED", label: "Calificado", hint: "Necesidad y presupuesto validados", probability: 0.4, staleDays: 7 },
  { key: "VISIT", label: "Visita", hint: "Propiedad visitada", probability: 0.6, staleDays: 7 },
  { key: "NEGOTIATION", label: "Negociación", hint: "Condiciones en curso", probability: 0.75, staleDays: 10 },
  { key: "RESERVED", label: "Reserva", hint: "Reserva o seña en curso", probability: 0.9, staleDays: 7 },
  { key: "WON", label: "Cierre", hint: "Operación concretada", probability: 1, staleDays: 0, closed: true },
  { key: "LOST", label: "Perdido", hint: "Oportunidad cerrada", probability: 0, staleDays: 0, closed: true },
];

export const RENTAL_PIPELINE_STAGES: PipelineStageDefinition[] = [
  { key: "NEW", label: "Nuevo lead", hint: "Pendiente de contacto", probability: 0.1, staleDays: 3 },
  { key: "CONTACTED", label: "Contactado", hint: "Conversación iniciada", probability: 0.2, staleDays: 3 },
  { key: "QUALIFIED", label: "Calificado", hint: "Necesidad y requisitos validados", probability: 0.35, staleDays: 5 },
  { key: "VISIT", label: "Visita", hint: "Propiedad visitada", probability: 0.5, staleDays: 5 },
  { key: "DOCUMENTATION", label: "Documentación", hint: "Garantías y documentación en revisión", probability: 0.65, staleDays: 5 },
  { key: "CONTRACT", label: "Contrato", hint: "Contrato en preparación o firma", probability: 0.82, staleDays: 5 },
  { key: "HANDOVER", label: "Entrega", hint: "Entrega de llaves coordinada", probability: 0.95, staleDays: 3 },
  { key: "WON", label: "Cierre", hint: "Alquiler concretado", probability: 1, staleDays: 0, closed: true },
  { key: "LOST", label: "Perdido", hint: "Oportunidad cerrada", probability: 0, staleDays: 0, closed: true },
];

export function normalizePipelineOperation(operation?: string | null): PipelineOperation {
  return String(operation || "COMPRA").toUpperCase() === "ALQUILER" ? "ALQUILER" : "COMPRA";
}

export function getPipelineStages(operation?: string | null) {
  return normalizePipelineOperation(operation) === "ALQUILER" ? RENTAL_PIPELINE_STAGES : SALE_PIPELINE_STAGES;
}

export function getPipelineStageKeys(operation?: string | null) {
  return new Set(getPipelineStages(operation).map((stage) => stage.key));
}

export function getPipelineStageDefinition(operation: string | null | undefined, stageKey: string) {
  return getPipelineStages(operation).find((stage) => stage.key === stageKey);
}

export function getPipelineStageProbability(operation: string | null | undefined, stageKey: string) {
  return getPipelineStageDefinition(operation, stageKey)?.probability ?? 0.1;
}

export const ALL_PIPELINE_STAGES = Array.from(
  new Map([...SALE_PIPELINE_STAGES, ...RENTAL_PIPELINE_STAGES].map((stage) => [stage.key, stage])).values(),
);

export const PIPELINE_STAGE_LABELS = Object.fromEntries(
  ALL_PIPELINE_STAGES.map((stage) => [stage.key, stage.label]),
) as Record<string, string>;

export const PIPELINE_STAGE_PROBABILITY = Object.fromEntries(
  ALL_PIPELINE_STAGES.map((stage) => [stage.key, stage.probability]),
) as Record<string, number>;

export const PIPELINE_STAGE_STALE_DAYS = Object.fromEntries(
  ALL_PIPELINE_STAGES.filter((stage) => !stage.closed).map((stage) => [stage.key, stage.staleDays]),
) as Record<string, number>;

export const OPEN_PIPELINE_STAGE_SET = new Set(
  ALL_PIPELINE_STAGES.filter((stage) => !stage.closed).map((stage) => stage.key),
);
