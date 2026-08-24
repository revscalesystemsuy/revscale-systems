"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompanyAdminFeature } from "@/lib/organization-role";

const TONES = new Set(["PROFESSIONAL_FRIENDLY", "FORMAL", "CLOSE"]);
const ADDRESS_STYLES = new Set(["VOS", "TU", "USTED"]);
const EMOJI_LEVELS = new Set(["NONE", "LOW", "MEDIUM"]);
const RESPONSE_LENGTHS = new Set(["SHORT", "MEDIUM"]);

function pick(value: FormDataEntryValue | null, allowed: Set<string>, fallback: string) {
  const normalized = String(value || "").toUpperCase();
  return allowed.has(normalized) ? normalized : fallback;
}

export async function saveWhatsAppAiPreparation(formData: FormData) {
  const context = await requireCompanyAdminFeature("whatsapp_ai");
  if (context.role !== "OWNER") redirect("/protected");

  const assistantName = String(formData.get("assistant_name") || "RevScale").trim().slice(0, 80) || "RevScale";
  const tone = pick(formData.get("tone"), TONES, "PROFESSIONAL_FRIENDLY");
  const addressStyle = pick(formData.get("address_style"), ADDRESS_STYLES, "VOS");
  const emojiLevel = pick(formData.get("emoji_level"), EMOJI_LEVELS, "LOW");
  const responseLength = pick(formData.get("response_length"), RESPONSE_LENGTHS, "SHORT");
  const humanHandoffEnabled = formData.get("human_handoff_enabled") === "on";
  const businessHoursOnly = formData.get("business_hours_only") === "on";

  const { error } = await context.supabase.from("whatsapp_ai_settings").upsert(
    {
      organization_id: context.organizationId,
      mode: "PREPARATION",
      auto_reply_enabled: false,
      assistant_name: assistantName,
      tone,
      address_style: addressStyle,
      emoji_level: emojiLevel,
      response_length: responseLength,
      human_handoff_enabled: humanHandoffEnabled,
      business_hours_only: businessHoursOnly,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  );

  if (error) throw new Error(`No se pudo guardar la configuración de WhatsApp IA: ${error.message}`);

  revalidatePath("/protected/settings/whatsapp");
}
