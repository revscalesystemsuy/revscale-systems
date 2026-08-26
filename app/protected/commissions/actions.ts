"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

const OPERATIONS = new Set(["ALL", "COMPRA", "ALQUILER"]);
const PAYMENT_STATUSES = new Set(["PENDING", "PARTIAL", "PAID", "CANCELLED"]);

async function requireCommissionDirector() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.role !== "OWNER") throw new Error("Solo Dirección puede administrar comisiones.");
  if (!planHasFeature(context.plan, "commissions")) throw new Error("Comisiones requiere Professional o Enterprise.");
  return context;
}

function readPercent(value: FormDataEntryValue | null, label: string) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) throw new Error(`${label} debe estar entre 0 y 100.`);
  return parsed;
}

function readMoney(value: FormDataEntryValue | null, label: string) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} debe ser un importe válido.`);
  return parsed;
}

export async function upsertCommissionRule(formData: FormData) {
  const context = await requireCommissionDirector();
  const operation = String(formData.get("operation") || "ALL").toUpperCase();
  const agentId = String(formData.get("agent_id") || "").trim() || null;
  const brokerageRate = readPercent(formData.get("brokerage_rate"), "Honorarios");
  const agentSplitRate = readPercent(formData.get("agent_split_rate"), "Split del agente");
  if (!OPERATIONS.has(operation)) throw new Error("Operación inválida.");

  let existingQuery = context.supabase
    .from("commission_rules")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("operation", operation);
  existingQuery = agentId ? existingQuery.eq("agent_id", agentId) : existingQuery.is("agent_id", null);
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const payload = {
    organization_id: context.organizationId,
    agent_id: agentId,
    operation,
    brokerage_rate: brokerageRate,
    agent_split_rate: agentSplitRate,
    is_active: true,
    created_by: context.userId,
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await context.supabase.from("commission_rules").update(payload).eq("id", existing.id).eq("organization_id", context.organizationId)
    : await context.supabase.from("commission_rules").insert(payload);
  if (result.error) throw new Error(result.error.message);

  revalidatePath("/protected/commissions");
}

export async function updateCommission(formData: FormData) {
  const context = await requireCommissionDirector();
  const commissionId = String(formData.get("commission_id") || "").trim();
  if (!commissionId) throw new Error("Comisión inválida.");

  const paymentStatus = String(formData.get("payment_status") || "PENDING").toUpperCase();
  if (!PAYMENT_STATUSES.has(paymentStatus)) throw new Error("Estado de pago inválido.");

  const dealAmount = readMoney(formData.get("deal_amount"), "Valor de operación");
  const collectedAmount = readMoney(formData.get("collected_amount"), "Importe cobrado") ?? 0;
  const brokerageRate = readPercent(formData.get("brokerage_rate"), "Honorarios");
  const agentSplitRate = readPercent(formData.get("agent_split_rate"), "Split del agente");
  const currency = String(formData.get("currency") || "USD").toUpperCase().trim();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Moneda inválida.");

  const dueDateRaw = String(formData.get("due_date") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  const { error } = await context.supabase
    .from("commissions")
    .update({
      deal_amount: dealAmount,
      deal_amount_source: "ACTUAL",
      currency,
      brokerage_rate: brokerageRate,
      agent_split_rate: agentSplitRate,
      collected_amount: collectedAmount,
      payment_status: paymentStatus,
      due_date: dueDateRaw || null,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commissionId)
    .eq("organization_id", context.organizationId);
  if (error) throw new Error(error.message);

  revalidatePath("/protected/commissions");
}
