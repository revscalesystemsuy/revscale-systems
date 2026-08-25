"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganizationContext } from "@/lib/organization-role";

async function requireActiveContext() {
  const context = await getCurrentOrganizationContext();
  if (!context || context.subscriptionStatus !== "ACTIVE" || context.membershipStatus !== "ACTIVE") {
    throw new Error("Sesión inválida.");
  }
  return context;
}

function revalidateCommercialViews(leadId: string) {
  revalidatePath("/protected/today");
  revalidatePath("/protected/followups");
  revalidatePath("/protected/pipeline");
  revalidatePath("/protected/calendar");
  revalidatePath(`/protected/leads/${leadId}`);
}

export async function completeTodayFollowup(formData: FormData) {
  const followupId = String(formData.get("followup_id") || "").trim();
  const leadId = String(formData.get("lead_id") || "").trim();
  if (!followupId || !leadId) throw new Error("Seguimiento inválido.");

  const context = await requireActiveContext();
  const { data: followup } = await context.supabase
    .from("followups")
    .select("id,lead_id,status")
    .eq("id", followupId)
    .eq("organization_id", context.organizationId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!followup) throw new Error("Seguimiento no encontrado o sin acceso.");
  if (followup.status === "COMPLETED") return;

  const { data, error } = await context.supabase
    .from("followups")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", followupId)
    .eq("organization_id", context.organizationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No tenés permiso para completar este seguimiento.");
  revalidateCommercialViews(leadId);
}

export async function createNextDayFollowup(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "").trim();
  const title = String(formData.get("title") || "Retomar contacto").trim() || "Retomar contacto";
  if (!leadId) throw new Error("Lead inválido.");

  const context = await requireActiveContext();
  const { data: lead } = await context.supabase
    .from("leads")
    .select("id,assigned_to")
    .eq("id", leadId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (!lead) throw new Error("Lead no encontrado o sin acceso.");

  const dueAt = new Date(Date.now() + 86_400_000).toISOString();
  const { error } = await context.supabase.from("followups").insert({
    organization_id: context.organizationId,
    lead_id: leadId,
    assigned_to: lead.assigned_to || context.userId,
    title,
    notes: "Seguimiento creado desde Qué hacer hoy",
    due_at: dueAt,
    priority: "HIGH",
    status: "PENDING",
  });
  if (error) throw new Error(error.message);

  revalidateCommercialViews(leadId);
}
