"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganizationContext } from "@/lib/organization-role";

const STAGES = new Set(["NEW", "CONTACTED", "QUALIFIED", "VISIT", "NEGOTIATION", "WON", "LOST"]);
const LOSS_REASONS = new Set(["NO_RESPONSE", "BUDGET", "NO_MATCH", "COMPETITOR", "POSTPONED", "FINANCING", "INVALID_CONTACT", "OTHER"]);

export async function updatePipelineStage(formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context || context.subscriptionStatus !== "ACTIVE" || context.membershipStatus !== "ACTIVE") {
    throw new Error("Sesión inválida.");
  }

  const leadId = String(formData.get("lead_id") || "").trim();
  const stage = String(formData.get("pipeline_stage") || "").trim().toUpperCase();
  const lostReason = String(formData.get("lost_reason") || "").trim().toUpperCase();

  if (!leadId || !STAGES.has(stage)) {
    throw new Error("Etapa comercial inválida.");
  }

  if (stage === "LOST" && !LOSS_REASONS.has(lostReason)) {
    throw new Error("Seleccioná un motivo de pérdida.");
  }

  const { data, error } = await context.supabase
    .from("leads")
    .update({
      pipeline_stage: stage,
      lost_reason: stage === "LOST" ? lostReason : null,
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
  revalidatePath(`/protected/leads/${leadId}`);
}
