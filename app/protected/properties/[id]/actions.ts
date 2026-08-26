"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentPlanHasFeature, getCurrentSubscription } from "@/lib/plan-access";

async function requireMatchingContext() {
  const allowed = await currentPlanHasFeature("matching");
  if (!allowed) {
    throw new Error("El Matching inteligente está disponible desde el plan Professional.");
  }

  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) throw new Error("Sin organización");
  return subscription.organizationId;
}

export async function recalculatePropertyMatches(formData: FormData) {
  const propertyId = String(formData.get("property_id") || "").trim();
  if (!propertyId) throw new Error("Propiedad inválida");

  const organizationId = await requireMatchingContext();
  const supabase = await createClient();

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id,status")
    .eq("id", propertyId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (propertyError) throw new Error(propertyError.message);
  if (!property) throw new Error("No tenés acceso a esta propiedad");

  // Re-escribir el estado actual dispara el mismo motor seguro que corre
  // automáticamente al crear o editar una propiedad.
  const { data: updated, error } = await supabase
    .from("properties")
    .update({ status: property.status })
    .eq("id", propertyId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) throw new Error("No se pudo recalcular el matching");

  revalidatePath(`/protected/properties/${propertyId}`);
  revalidatePath("/protected/properties");
  revalidatePath("/protected/notifications");
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

  const price = property.price == null
    ? "Precio a consultar"
    : `${property.currency || ""} ${Number(property.price).toLocaleString("es-UY")}`.trim();
  const zone = property.zone ? `\nZona: ${property.zone}` : "";
  const bedrooms = property.bedrooms == null ? "" : `\nDormitorios: ${property.bedrooms}`;

  return `Hola ${lead.full_name || "cliente"}, encontré una propiedad que puede interesarte.\n\n${property.title}${zone}\nPrecio: ${price}${bedrooms}\n\n¿Querés que coordinemos una visita?`;
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