"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

async function requireAutomationOwner() {
  const context = await getCurrentOrganizationContext();
  if (!context || context.subscriptionStatus !== "ACTIVE") throw new Error("Sesión no válida");
  if (context.role !== "OWNER") throw new Error("Solo Dirección puede configurar automatizaciones");
  if (!planHasFeature(context.plan, "automations")) throw new Error("Automatizaciones requiere Professional o Enterprise");
  return context;
}

export async function toggleAutomationRule(formData: FormData) {
  const context = await requireAutomationOwner();
  const id = String(formData.get("id") || "").trim();
  const enabled = String(formData.get("enabled") || "") === "true";
  if (!id) throw new Error("Regla inválida");

  const { data, error } = await context.supabase
    .from("automation_rules")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Regla no encontrada");
  revalidatePath("/protected/automations");
}

export async function updateAutomationTiming(formData: FormData) {
  const context = await requireAutomationOwner();
  const id = String(formData.get("id") || "").trim();
  const triggerType = String(formData.get("trigger_type") || "").trim();
  const value = Number(formData.get("value"));
  if (!id || !Number.isInteger(value)) throw new Error("Configuración inválida");

  let conditionJson: Record<string, number> = {};
  let actionConfig: Record<string, number> | undefined;

  if (triggerType === "LEAD_UNCONTACTED") {
    if (![24, 48].includes(value)) throw new Error("El plazo debe ser 24 o 48 horas");
    conditionJson = { hours: value };
  } else if (triggerType === "CLOSING_SOON") {
    if (![1, 2, 3, 7].includes(value)) throw new Error("El aviso de cierre debe ser de 1, 2, 3 o 7 días");
    conditionJson = { days: value };
  } else if (triggerType === "VISIT_RECORDED") {
    if (![24, 48].includes(value)) throw new Error("El seguimiento debe crearse a 24 o 48 horas");
    actionConfig = { hours_after: value };
  } else {
    throw new Error("Esta automatización no requiere un plazo configurable");
  }

  const payload = actionConfig
    ? { action_config: actionConfig, updated_at: new Date().toISOString() }
    : { condition_json: conditionJson, updated_at: new Date().toISOString() };

  const { data, error } = await context.supabase
    .from("automation_rules")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .eq("trigger_type", triggerType)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Regla no encontrada");
  revalidatePath("/protected/automations");
}
