"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

const LEGAL_TRIGGERS = new Set([
  "LEGAL_REVIEW_PENDING",
  "LEGAL_SIGNATURE_PENDING",
  "LEGAL_DOCUMENT_EXPIRING",
  "LEGAL_RESERVATION_DOCUMENT_MISSING",
]);

async function requireLegalAutomationOwner() {
  const context = await getCurrentOrganizationContext();
  if (!context || context.subscriptionStatus !== "ACTIVE") throw new Error("Sesión no válida");
  if (context.role !== "OWNER") throw new Error("Solo Dirección puede configurar el control legal");
  if (!planHasFeature(context.plan, "legal_automations")) throw new Error("Control legal requiere Enterprise");
  return context;
}

export async function toggleLegalAutomationRule(formData: FormData) {
  const context = await requireLegalAutomationOwner();
  const id = String(formData.get("id") || "").trim();
  const triggerType = String(formData.get("trigger_type") || "").trim();
  const enabled = String(formData.get("enabled") || "") === "true";
  if (!id || !LEGAL_TRIGGERS.has(triggerType)) throw new Error("Regla legal inválida");
  const { data, error } = await context.supabase.from("automation_rules").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", context.organizationId).eq("trigger_type", triggerType).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Regla no encontrada");
  revalidatePath("/protected/legal-automations");
}

export async function updateLegalAutomationTiming(formData: FormData) {
  const context = await requireLegalAutomationOwner();
  const id = String(formData.get("id") || "").trim();
  const triggerType = String(formData.get("trigger_type") || "").trim();
  const value = Number(formData.get("value"));
  if (!id || !LEGAL_TRIGGERS.has(triggerType) || !Number.isInteger(value)) throw new Error("Configuración inválida");

  let conditionJson: Record<string, number>;
  if (triggerType === "LEGAL_REVIEW_PENDING" && [12, 24, 48].includes(value)) conditionJson = { hours: value };
  else if (triggerType === "LEGAL_SIGNATURE_PENDING" && [24, 48, 72].includes(value)) conditionJson = { hours: value };
  else if (triggerType === "LEGAL_DOCUMENT_EXPIRING" && [1, 2, 3, 7].includes(value)) conditionJson = { days: value };
  else if (triggerType === "LEGAL_RESERVATION_DOCUMENT_MISSING" && [1, 2, 4, 8].includes(value)) conditionJson = { hours: value };
  else throw new Error("Plazo fuera de rango");

  const { data, error } = await context.supabase.from("automation_rules").update({ condition_json: conditionJson, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", context.organizationId).eq("trigger_type", triggerType).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Regla no encontrada");
  revalidatePath("/protected/legal-automations");
}
