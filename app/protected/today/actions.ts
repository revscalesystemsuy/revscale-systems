"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { getBusinessDateKey } from "@/lib/commercial-ops";

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

function getNextBusinessMorning(now = new Date()) {
  const [year, month, day] = getBusinessDateKey(now).split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  do {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  } while (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6);

  const nextYear = candidate.getUTCFullYear();
  const nextMonth = String(candidate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(candidate.getUTCDate()).padStart(2, "0");

  // America/Montevideo is UTC-03:00. 12:00 UTC = 09:00 local business time.
  return new Date(`${nextYear}-${nextMonth}-${nextDay}T12:00:00.000Z`);
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

  const dueAt = getNextBusinessMorning();
  const dueAtIso = dueAt.toISOString();
  const dueWindowEnd = new Date(dueAt.getTime() + 60_000).toISOString();

  const { data: existingFollowup, error: existingError } = await context.supabase
    .from("followups")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("lead_id", leadId)
    .eq("title", title)
    .eq("status", "PENDING")
    .gte("due_at", dueAtIso)
    .lt("due_at", dueWindowEnd)
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (!existingFollowup) {
    const { error } = await context.supabase.from("followups").insert({
      organization_id: context.organizationId,
      lead_id: leadId,
      assigned_to: lead.assigned_to || context.userId,
      title,
      notes: "Seguimiento creado desde Qué hacer hoy para el próximo día laborable a las 09:00 (Uruguay)",
      due_at: dueAtIso,
      priority: "HIGH",
      status: "PENDING",
    });
    if (error) throw new Error(error.message);
  }

  revalidateCommercialViews(leadId);
}
