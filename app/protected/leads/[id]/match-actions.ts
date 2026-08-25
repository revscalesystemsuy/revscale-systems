"use server";

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

export async function generatePropertyWhatsApp(leadId: string, propertyId: string) {
  const allowed = await currentPlanHasFeature("matching");
  if (!allowed) throw new Error("El Matching IA está disponible desde el plan Professional.");

  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) throw new Error("Sin organización");

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("full_name").eq("id", leadId).eq("organization_id", subscription.organizationId).maybeSingle();
  const { data: property } = await supabase.from("properties").select("title,zone,price,currency,bedrooms").eq("id", propertyId).eq("organization_id", subscription.organizationId).maybeSingle();

  if (!lead || !property) throw new Error("Datos no encontrados");

  return `Hola ${lead.full_name || "cliente"} 👋\n\nEncontré una propiedad que puede interesarte:\n\n🏠 ${property.title}\n\n📍 ${property.zone}\n\n💰 ${property.currency} ${Number(property.price).toLocaleString()}\n\n🛏 ${property.bedrooms} dormitorios\n\n¿Coordinamos una visita?`;
}
