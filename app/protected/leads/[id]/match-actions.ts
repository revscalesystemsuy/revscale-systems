"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSubscription, currentPlanHasFeature } from "@/lib/plan-access";

export async function findMatchingProperties(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "");
  if (!leadId) throw new Error("Lead inválido");
  return getMatchingProperties(leadId);
}

export async function getMatchingProperties(leadId: string) {
  const allowed = await currentPlanHasFeature("matching");
  if (!allowed) return [];

  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) return [];

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("property_type,operation,primary_zone,budget_max,currency,bedrooms_min")
    .eq("id", leadId)
    .eq("organization_id", subscription.organizationId)
    .maybeSingle();

  if (!lead) return [];

  let query = supabase
    .from("properties")
    .select("id,title,property_type,operation,zone,price,currency,bedrooms,address,status")
    .eq("organization_id", subscription.organizationId)
    .eq("status", "AVAILABLE");

  if (lead.property_type) query = query.eq("property_type", lead.property_type);
  if (lead.operation) query = query.eq("operation", lead.operation);
  if (lead.currency) query = query.eq("currency", lead.currency);
  if (lead.budget_max) query = query.lte("price", Number(lead.budget_max) * 1.1);
  if (lead.bedrooms_min) query = query.gte("bedrooms", lead.bedrooms_min);

  const { data: properties } = await query.order("updated_at", { ascending: false }).limit(100);

  const matches = (properties || [])
    .map((property) => {
      let score = 35;
      const reasons: string[] = ["✓ Tipo y operación compatibles"];

      if (property.currency === lead.currency) {
        score += 10;
        reasons.push("✓ Misma moneda");
      }

      if (property.zone && lead.primary_zone && property.zone.trim().toLowerCase() === lead.primary_zone.trim().toLowerCase()) {
        score += 25;
        reasons.push("✓ Zona coincide exactamente");
      }

      if (property.price && lead.budget_max) {
        const ratio = Number(property.price) / Number(lead.budget_max);
        if (ratio <= 1 && ratio >= 0.75) {
          score += 20;
          reasons.push("✓ Precio ideal para presupuesto");
        } else if (ratio <= 1) {
          score += 12;
          reasons.push("✓ Precio dentro del presupuesto");
        } else if (ratio <= 1.1) {
          score += 4;
          reasons.push("• Apenas por encima del presupuesto");
        }
      }

      if (property.bedrooms && lead.bedrooms_min && property.bedrooms >= lead.bedrooms_min) {
        score += 10;
        reasons.push("✓ Dormitorios compatibles");
      }

      return { ...property, compatibility: Math.min(score, 100), reasons };
    })
    .filter((item) => item.compatibility >= 50)
    .sort((a, b) => b.compatibility - a.compatibility)
    .slice(0, 5);

  return matches;
}

async function getPropertyWhatsAppContext(leadId: string, propertyId: string) {
  const allowed = await currentPlanHasFeature("matching");
  if (!allowed) throw new Error("El Matching IA está disponible desde el plan Professional.");

  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) throw new Error("Sin organización activa");

  const supabase = await createClient();
  const [{ data: lead }, { data: property }] = await Promise.all([
    supabase
      .from("leads")
      .select("id,full_name,pipeline_stage")
      .eq("id", leadId)
      .eq("organization_id", subscription.organizationId)
      .maybeSingle(),
    supabase
      .from("properties")
      .select("id,title,zone,price,currency,bedrooms")
      .eq("id", propertyId)
      .eq("organization_id", subscription.organizationId)
      .maybeSingle(),
  ]);

  if (!lead || !property) throw new Error("Lead o propiedad no encontrados o sin acceso");

  return {
    supabase,
    organizationId: subscription.organizationId,
    lead,
    property,
  };
}

function revalidatePropertyWhatsApp(leadId: string) {
  revalidatePath(`/protected/leads/${leadId}`);
  revalidatePath("/protected/leads");
  revalidatePath("/protected/interactions");
  revalidatePath("/protected/pipeline");
  revalidatePath("/protected/today");
  revalidatePath("/protected/executive");
  revalidatePath("/protected/notifications");
}

export async function generatePropertyWhatsApp(leadId: string, propertyId: string) {
  const { lead, property } = await getPropertyWhatsAppContext(leadId, propertyId);

  const price = property.price == null
    ? "Precio a consultar"
    : `${property.currency || ""} ${Number(property.price).toLocaleString("es-UY")}`.trim();
  const bedrooms = property.bedrooms == null
    ? ""
    : `\nDormitorios: ${property.bedrooms}`;
  const zone = property.zone ? `\nZona: ${property.zone}` : "";

  return `Hola ${lead.full_name || "cliente"}, encontré una propiedad que puede interesarte.\n\n${property.title}${zone}\nPrecio: ${price}${bedrooms}\n\n¿Querés que coordinemos una visita?`;
}

export async function confirmPropertyWhatsAppSent(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "").trim();
  const propertyId = String(formData.get("property_id") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!leadId || !propertyId || !message) throw new Error("Datos incompletos");
  if (message.length > 5000) throw new Error("El mensaje es demasiado largo");

  const { supabase, organizationId, lead } = await getPropertyWhatsAppContext(leadId, propertyId);
  const recentThreshold = new Date(Date.now() - 90_000).toISOString();

  const { data: recent, error: recentError } = await supabase
    .from("interactions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .eq("property_id", propertyId)
    .eq("channel", "WHATSAPP")
    .eq("direction", "OUTBOUND")
    .eq("message", message)
    .gte("created_at", recentThreshold)
    .limit(1);
  if (recentError) throw new Error(recentError.message);

  if (!recent?.length) {
    const { error: interactionError } = await supabase.from("interactions").insert({
      organization_id: organizationId,
      lead_id: leadId,
      property_id: propertyId,
      channel: "WHATSAPP",
      direction: "OUTBOUND",
      actor: "AGENT",
      message,
      ai_response: null,
      detected_intent: "ENVIAR_PROPIEDAD",
    });
    if (interactionError) throw new Error(interactionError.message);
  }

  if ((lead.pipeline_stage || "NEW") === "NEW") {
    const { data: updatedLead, error: stageError } = await supabase
      .from("leads")
      .update({ pipeline_stage: "CONTACTED", updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();
    if (stageError) throw new Error(stageError.message);
    if (!updatedLead) throw new Error("No tenés acceso para actualizar este lead");
  }

  revalidatePropertyWhatsApp(leadId);
  return { recorded: true };
}
