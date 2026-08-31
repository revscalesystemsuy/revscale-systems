"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

const clean = (v: FormDataEntryValue | null) => String(v || "").trim();

export async function savePartner(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const id = clean(formData.get("id"));
  const incentiveModel = clean(formData.get("incentive_model")) || "NONE";
  const rawIncentive = clean(formData.get("incentive_value"));
  const payload = {
    partner_name: clean(formData.get("partner_name")),
    category: clean(formData.get("category")),
    priority: clean(formData.get("priority")) || "P2",
    status: clean(formData.get("status")) || "RESEARCH",
    website: clean(formData.get("website")) || null,
    source_url: clean(formData.get("source_url")) || null,
    contact_name: clean(formData.get("contact_name")) || null,
    contact_role: clean(formData.get("contact_role")) || null,
    contact_email: clean(formData.get("contact_email")).toLowerCase() || null,
    contact_phone: clean(formData.get("contact_phone")) || null,
    linkedin_url: clean(formData.get("linkedin_url")) || null,
    why_fit: clean(formData.get("why_fit")),
    audience_reach: clean(formData.get("audience_reach")),
    offer_angle: clean(formData.get("offer_angle")) || "Operación Comercial 360",
    incentive_model: incentiveModel,
    incentive_value: incentiveModel === "NONE" || !rawIncentive ? null : Number(rawIncentive),
    next_step: clean(formData.get("next_step")) || null,
    notes: clean(formData.get("notes")) || null,
    updated_at: new Date().toISOString(),
  };
  if (!payload.partner_name || !payload.category) throw new Error("Partner y categoría son obligatorios.");
  if (payload.incentive_model === "PERCENT_FIRST_YEAR" && (payload.incentive_value == null || payload.incentive_value < 15 || payload.incentive_value > 20)) throw new Error("El porcentaje debe estar entre 15% y 20%.");

  if (id) {
    const { error } = await supabase.from("b2b_partners").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("b2b_partners").insert({ ...payload, created_by: userId });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/protected/admin/marketing/partnerships");
}

export async function logPartnerActivity(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const partnerId = clean(formData.get("partner_id"));
  const activityType = clean(formData.get("activity_type"));
  const summary = clean(formData.get("summary"));
  if (!partnerId || !activityType || !summary) throw new Error("Faltan datos de actividad.");
  const { error } = await supabase.from("b2b_partner_activities").insert({ partner_id: partnerId, created_by: userId, activity_type: activityType, summary });
  if (error) throw new Error(error.message);
  if (["EMAIL","LINKEDIN","WHATSAPP","CALL"].includes(activityType)) {
    await supabase.from("b2b_partners").update({ status: "CONTACTED", last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", partnerId);
  }
  revalidatePath("/protected/admin/marketing/partnerships");
}
