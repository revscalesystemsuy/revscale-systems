"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

const ALLOWED = new Set(["CONTACTED", "DISMISSED", "CONVERTED"]);

export async function updateReactivationOpportunity(formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "matching")) redirect("/protected");

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "").toUpperCase();
  if (!id || !ALLOWED.has(status)) return;

  const now = new Date().toISOString();
  const patch = {
    status,
    contacted_at: status === "CONTACTED" ? now : null,
    resolved_at: status === "DISMISSED" || status === "CONVERTED" ? now : null,
    updated_at: now,
  };

  const { error } = await context.supabase
    .from("reactivation_opportunities")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", context.organizationId);

  if (error) throw new Error(`No se pudo actualizar la oportunidad: ${error.message}`);
  revalidatePath("/protected/reactivation");
}
