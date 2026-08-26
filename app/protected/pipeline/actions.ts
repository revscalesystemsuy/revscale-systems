"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { getPipelineStageKeys } from "@/lib/pipeline-config";

const LOSS_REASONS = new Set(["NO_RESPONSE", "BUDGET", "NO_MATCH", "COMPETITOR", "POSTPONED", "FINANCING", "INVALID_CONTACT", "OTHER"]);

export async function updatePipelineStage(formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context || context.subscriptionStatus !== "ACTIVE" || context.membershipStatus !== "ACTIVE") {
    throw new Error("Sesión inválida.");
  }

  const leadId = String(formData.get("lead_id") || "").trim();
  const stage = String(formData.get("pipeline_stage") || "").trim().toUpperCase();
  const lostReason = String(formData.get("lost_reason") || "").trim().toUpperCase();

  if (!leadId) throw new Error("Lead inválido.");

  const { data: lead, error: leadError } = await context.supabase
    .from("leads")
    .select("id,operation")
    .eq("id", leadId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("No tenés acceso a este lead.");

  if (!getPipelineStageKeys(lead.operation).has(stage)) {
    throw new Error("Esa etapa no corresponde al flujo de esta operación.");
  }

  if (stage === "LOST" && !LOSS_REASONS.has(lostReason)) {
    throw new Error("Seleccioná un motivo de pérdida.");
  }

  const isClosed = stage === "WON" || stage === "LOST";
  const { data, error } = await context.supabase
    .from("leads")
    .update({
      pipeline_stage: stage,
      lost_reason: stage === "LOST" ? lostReason : null,
      expected_close_date: isClosed ? null : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("organization_id", context.organizationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No tenés acceso a este lead.");

  revalidatePath("/protected/pipeline");
  revalidatePath("/protected/leads");
  revalidatePath("/protected/analytics");
  revalidatePath("/protected/reports");
  revalidatePath("/protected/today");
  revalidatePath("/protected/calendar");
  revalidatePath("/protected/executive");
  revalidatePath(`/protected/leads/${leadId}`);
}
