"use server";

import { createClient } from "@/lib/supabase/server";
import { currentPlanHasFeature, getCurrentSubscription } from "@/lib/plan-access";

async function requireMatchingContext() {
  const allowed = await currentPlanHasFeature("matching");
  if (!allowed) {
    throw new Error("El Matching IA está disponible desde el plan Professional.");
  }

  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) throw new Error("Sin organización");
  return subscription.organizationId;
}

export async function generatePropertyMessage(propertyId: string, leadId: string) {
  const organizationId = await requireMatchingContext();
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("title,zone,price,currency,bedrooms")
    .eq("id", propertyId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const { data: lead } = await supabase
    .from("leads")
    .select("full_name")
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!property || !lead) throw new Error("Datos faltantes");

  return `Hola ${lead.full_name || "cliente"} 👋\n\nEncontré una propiedad que puede interesarte:\n\n🏠 ${property.title}\n\n📍 ${property.zone}\n\n💰 ${property.currency} ${Number(property.price).toLocaleString()}\n\n🛏 ${property.bedrooms} dormitorios\n\n¿Coordinamos una visita?`;
}

export async function savePropertyInteraction(leadId: string, propertyId: string, message: string) {
  const organizationId = await requireMatchingContext();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) throw new Error("Usuario no autenticado");

  const [{ data: lead }, { data: property }] = await Promise.all([
    supabase.from("leads").select("id").eq("id", leadId).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("properties").select("id").eq("id", propertyId).eq("organization_id", organizationId).maybeSingle(),
  ]);

  if (!lead || !property) throw new Error("Datos faltantes");

  const { error } = await supabase.from("interactions").insert({
    organization_id: organizationId,
    lead_id: leadId,
    property_id: propertyId,
    channel: "WHATSAPP",
    direction: "OUTBOUND",
    actor: "AGENT",
    message,
    ai_response: "Mensaje de propiedad preparado por RevScale",
    detected_intent: "ENVIAR_PROPIEDAD",
  });

  if (error) throw new Error(error.message);
}
