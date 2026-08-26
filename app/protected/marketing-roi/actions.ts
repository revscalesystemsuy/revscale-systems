"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

function text(value: FormDataEntryValue | null) {
  const result = String(value || "").trim();
  return result || null;
}

async function requireMarketingManager() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "analytics")) redirect("/protected/billing");
  if (!["OWNER", "MANAGER"].includes(context.role)) redirect("/protected");
  return context;
}

export async function createMarketingSpend(formData: FormData) {
  const context = await requireMarketingManager();
  const periodStart = text(formData.get("period_start"));
  const periodEnd = text(formData.get("period_end"));
  const amount = Number(formData.get("amount") || 0);
  const currency = String(formData.get("currency") || "USD").trim().toUpperCase();

  if (!periodStart || !periodEnd || !Number.isFinite(amount) || amount <= 0 || currency.length !== 3) return;

  const { error } = await context.supabase.from("marketing_spend_entries").insert({
    organization_id: context.organizationId,
    period_start: periodStart,
    period_end: periodEnd,
    channel: text(formData.get("channel")),
    provider: text(formData.get("provider")),
    campaign: text(formData.get("campaign")),
    ad: text(formData.get("ad")),
    amount,
    currency,
    source: "MANUAL",
    notes: text(formData.get("notes")),
    created_by: context.userId,
  });

  if (error) throw new Error(`No se pudo guardar la inversión: ${error.message}`);
  revalidatePath("/protected/marketing-roi");
}

export async function deleteMarketingSpend(formData: FormData) {
  const context = await requireMarketingManager();
  const id = String(formData.get("id") || "");
  if (!id) return;

  const { error } = await context.supabase
    .from("marketing_spend_entries")
    .delete()
    .eq("id", id)
    .eq("organization_id", context.organizationId);

  if (error) throw new Error(`No se pudo eliminar la inversión: ${error.message}`);
  revalidatePath("/protected/marketing-roi");
}
