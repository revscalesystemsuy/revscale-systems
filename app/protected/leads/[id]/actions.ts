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
    .select("id,pipeline_stage,full_name,property_type,primary_zone,budget_max,currency,bedrooms_min,assigned_to,expected_close_date")
    .eq("id", leadId)
    .eq("organization_id", member.organization_id)
    .maybeSingle();
  if (!lead) throw new Error("Lead no encontrado o sin acceso");

  return { supabase, userId: String(userId), organizationId: member.organization_id, lead };
}

function revalidateCommercialLead(leadId: string) {
  revalidatePath(`/protected/leads/${leadId}`);
  revalidatePath("/protected/leads");
  revalidatePath("/protected/followups");
  revalidatePath("/protected/pipeline");
  revalidatePath("/protected/today");
  revalidatePath("/protected/calendar");
  revalidatePath("/protected/executive");
}

export async function createLeadFollowup(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "").trim();
  if (!leadId) throw new Error("Lead inválido");

  const { supabase, userId, organizationId, lead } = await getLeadContext(leadId);

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
      assigned_to: lead.assigned_to || userId,
      title: "Agendar visita",
      notes: "Seguimiento comercial generado desde RevScale",
      due_at: new Date(Date.now() + 86_400_000).toISOString(),
      priority: "HIGH",
      status: "PENDING",
    });
    if (error) throw new Error(error.message);
  }

  revalidateCommercialLead(leadId);
}

export async function createQuickFollowup(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "").trim();
  const title = String(formData.get("title") || "Seguimiento comercial").trim() || "Seguimiento comercial";
  const dueAtRaw = String(formData.get("due_at") || "").trim();
  if (!leadId) throw new Error("Lead inválido");

  const { supabase, userId, organizationId, lead } = await getLeadContext(leadId);
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : new Date(Date.now() + 86_400_000);
  if (Number.isNaN(dueAt.getTime())) throw new Error("Fecha de seguimiento inválida");

  const { data: existingFollowup } = await supabase
    .from("followups")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .eq("title", title)
    .eq("status", "PENDING")
    .maybeSingle();

  if (!existingFollowup) {
    const { error } = await supabase.from("followups").insert({
      organization_id: organizationId,
      lead_id: leadId,
      assigned_to: lead.assigned_to || userId,
      title,
      notes: "Seguimiento rápido generado desde la ficha comercial",
      due_at: dueAt.toISOString(),
      priority: "HIGH",
      status: "PENDING",
    });
    if (error) throw new Error(error.message);
  }

  revalidateCommercialLead(leadId);
}

export async function updateExpectedCloseDate(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "").trim();
  const expectedCloseDate = String(formData.get("expected_close_date") || "").trim() || null;
  if (!leadId) throw new Error("Lead inválido");
  if (expectedCloseDate && !/^\d{4}-\d{2}-\d{2}$/.test(expectedCloseDate)) {
    throw new Error("Fecha estimada inválida");
  }

  const { supabase, organizationId, lead } = await getLeadContext(leadId);
  if (["WON", "LOST"].includes(lead.pipeline_stage || "NEW") && expectedCloseDate) {
    throw new Error("Una oportunidad cerrada no puede tener fecha estimada de cierre");
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ expected_close_date: expectedCloseDate, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No tenés acceso a este lead");

  revalidateCommercialLead(leadId);
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

  revalidateCommercialLead(leadId);
  revalidatePath("/protected/interactions");
}
