"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getLeadContext(leadId: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Usuario no autenticado");

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!member) throw new Error("Sin organización activa");

  const { data: lead } = await supabase
    .from("leads")
    .select("id,pipeline_stage,full_name,property_type,primary_zone,budget_max,currency,bedrooms_min")
    .eq("id", leadId)
    .eq("organization_id", member.organization_id)
    .maybeSingle();
  if (!lead) throw new Error("Lead no encontrado o sin acceso");

  return { supabase, userId: String(userId), organizationId: member.organization_id, lead };
}

export async function createLeadFollowup(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "").trim();
  if (!leadId) throw new Error("Lead inválido");

  const { supabase, userId, organizationId } = await getLeadContext(leadId);

  const { data: existingFollowup } = await supabase
    .from("followups")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .eq("title", "Agendar visita")
    .eq("status", "PENDING")
    .maybeSingle();

  if (!existingFollowup) {
    const { error } = await supabase.from("followups").insert({
      organization_id: organizationId,
      lead_id: leadId,
      assigned_to: userId,
      title: "Agendar visita",
      notes: "Seguimiento comercial generado desde RevScale",
      due_at: new Date(Date.now() + 86400000).toISOString(),
      priority: "HIGH",
      status: "PENDING",
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/protected/leads/${leadId}`);
  revalidatePath("/protected/followups");
  revalidatePath("/protected/pipeline");
}

export async function generateWhatsAppMessage(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "").trim();
  if (!leadId) throw new Error("Lead inválido");

  const { lead } = await getLeadContext(leadId);

  return `Hola ${lead.full_name || "cliente"}, vi que estás buscando ${lead.property_type || "una propiedad"}${lead.bedrooms_min ? ` de ${lead.bedrooms_min} dormitorios` : ""} en ${lead.primary_zone || "la zona que te interesa"}.\n\nTengo opciones que pueden ajustarse a lo que buscás.\n\n¿Coordinamos una visita?`;
}

export async function saveWhatsAppInteraction(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!leadId || !message) throw new Error("Datos incompletos");

  const { supabase, organizationId, lead } = await getLeadContext(leadId);

  const { error } = await supabase.from("interactions").insert({
    organization_id: organizationId,
    lead_id: leadId,
    channel: "WHATSAPP",
    direction: "OUTBOUND",
    actor: "AGENT",
    message,
    ai_response: null,
    detected_intent: "CONTACTAR_LEAD",
  });
  if (error) throw new Error(error.message);

  if ((lead.pipeline_stage || "NEW") === "NEW") {
    const { error: stageError } = await supabase
      .from("leads")
      .update({ pipeline_stage: "CONTACTED", updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
    if (stageError) throw new Error(stageError.message);
  }

  revalidatePath(`/protected/leads/${leadId}`);
  revalidatePath("/protected/interactions");
  revalidatePath("/protected/pipeline");
}
