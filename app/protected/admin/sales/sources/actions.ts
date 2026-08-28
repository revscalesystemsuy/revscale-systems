'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SOURCES = ["UNKNOWN","WEBSITE","WHATSAPP","EMAIL","LINKEDIN","REFERRAL","PARTNER","OUTBOUND","EVENT","OTHER"] as const;

export async function updateB2BAcquisitionSource(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "").trim();
  const source = String(formData.get("acquisition_source") || "").trim().toUpperCase();
  const detail = String(formData.get("acquisition_detail") || "").trim();
  const campaign = String(formData.get("acquisition_campaign") || "").trim();

  if (!opportunityId || !SOURCES.includes(source as (typeof SOURCES)[number])) {
    redirect(`/protected/admin/sales/sources?error=${encodeURIComponent("Origen comercial inválido")}`);
  }
  if (detail.length > 240 || campaign.length > 160) {
    redirect(`/protected/admin/sales/sources?error=${encodeURIComponent("Detalle o campaña demasiado largos")}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { error } = await supabase.from("b2b_opportunities").update({
    acquisition_source: source,
    acquisition_detail: detail || null,
    acquisition_campaign: campaign || null,
    updated_at: new Date().toISOString(),
  }).eq("id", opportunityId);

  if (error) redirect(`/protected/admin/sales/sources?error=${encodeURIComponent("No se pudo guardar el origen")}`);

  revalidatePath("/protected/admin/sales/sources");
  revalidatePath("/protected/admin/sales/metrics");
  revalidatePath("/protected/admin/sales");
  revalidatePath(`/protected/admin/sales/${opportunityId}`);
  redirect(`/protected/admin/sales/sources?success=${encodeURIComponent("Origen comercial actualizado")}`);
}
