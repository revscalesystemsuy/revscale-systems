export type SlaLead = {
  assigned_at?: string | null;
  first_human_response_at?: string | null;
  sla_deadline?: string | null;
  sla_breached_at?: string | null;
};

export type SlaStatus = "UNASSIGNED" | "WAITING" | "WARNING" | "WITHIN" | "BREACHED";

export function getSlaStatus(lead: SlaLead, now = new Date(), warningMinutes = 5): SlaStatus {
  if (!lead.assigned_at || !lead.sla_deadline) return "UNASSIGNED";
  const deadline = new Date(lead.sla_deadline).getTime();
  const human = lead.first_human_response_at ? new Date(lead.first_human_response_at).getTime() : null;
  if (human !== null) return human <= deadline ? "WITHIN" : "BREACHED";
  if (lead.sla_breached_at || now.getTime() >= deadline) return "BREACHED";
  if (now.getTime() >= deadline - warningMinutes * 60_000) return "WARNING";
  return "WAITING";
}

export function responseMinutes(lead: Pick<SlaLead, "assigned_at" | "first_human_response_at">) {
  if (!lead.assigned_at || !lead.first_human_response_at) return null;
  const duration = new Date(lead.first_human_response_at).getTime() - new Date(lead.assigned_at).getTime();
  return Number.isFinite(duration) && duration >= 0 ? duration / 60_000 : null;
}

export function formatResponseMinutes(value: number | null) {
  if (value === null) return "Sin respuesta";
  if (value < 1) return "< 1 min";
  if (value < 60) return `${Math.round(value)} min`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildSlaMetrics<T extends SlaLead>(leads: T[]) {
  const assigned = leads.filter((lead) => lead.assigned_at && lead.sla_deadline);
  const responseTimes = assigned.map(responseMinutes).filter((value): value is number => value !== null);
  const within = assigned.filter((lead) => getSlaStatus(lead) === "WITHIN").length;
  const breached = assigned.filter((lead) => getSlaStatus(lead) === "BREACHED").length;
  const unanswered = assigned.filter((lead) => !lead.first_human_response_at).length;
  const resolved = within + breached;
  return {
    assigned: assigned.length,
    meanMinutes: responseTimes.length ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length : null,
    medianMinutes: median(responseTimes),
    within,
    breached,
    unanswered,
    withinPct: resolved ? Math.round((within / resolved) * 100) : 0,
    breachedPct: resolved ? Math.round((breached / resolved) * 100) : 0,
  };
}
