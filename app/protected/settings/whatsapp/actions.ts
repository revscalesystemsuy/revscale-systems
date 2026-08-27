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

export async function completeWhatsAppEmbeddedSignup(input: { code: string; wabaId: string; phoneNumberId?: string | null }) {
  const context = await requireCompanyAdminFeature("whatsapp_ai");
  if (context.role !== "OWNER") return { ok: false, error: "Solo el propietario puede conectar WhatsApp." };

  const code = String(input?.code || "").trim();
  const wabaId = String(input?.wabaId || "").trim();
  const phoneNumberId = String(input?.phoneNumberId || "").trim() || null;
  if (!code || !wabaId) return { ok: false, error: "Meta no devolvió todos los datos necesarios. Volvé a intentar la conexión." };

  const { data, error } = await context.supabase.functions.invoke("whatsapp-connect", {
    body: {
      organization_id: context.organizationId,
      code,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
    },
  });

  if (error || data?.error) {
    return { ok: false, error: String(data?.provider_error || data?.error || error?.message || "No se pudo conectar WhatsApp con Meta.").slice(0, 220) };
  }

  revalidatePath("/protected/settings/whatsapp");
  revalidatePath("/protected/inbox");
  return { ok: true, phone: data?.display_phone_number || null, webhookStatus: data?.webhook_status || "PENDING" };
}

export async function saveWhatsAppAiPreparation(formData: FormData) {
  const context = await requireCompanyAdminFeature("whatsapp_ai");
  if (context.role !== "OWNER") redirect("/protected");

  const assistantName = String(formData.get("assistant_name") || "RevScale").trim().slice(0, 80) || "RevScale";
  const tone = pick(formData.get("tone"), TONES, "PROFESSIONAL_FRIENDLY");
  const addressStyle = pick(formData.get("address_style"), ADDRESS_STYLES, "VOS");
  const emojiLevel = pick(formData.get("emoji_level"), EMOJI_LEVELS, "LOW");
  const responseLength = pick(formData.get("response_length"), RESPONSE_LENGTHS, "SHORT");
  const businessHoursOnly = formData.get("business_hours_only") === "on";

  const { data: existing } = await context.supabase
    .from("whatsapp_ai_settings")
    .select("mode,auto_reply_enabled")
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  const { error } = await context.supabase.from("whatsapp_ai_settings").upsert(
    {
      organization_id: context.organizationId,
      mode: existing?.mode || "PREPARATION",
      auto_reply_enabled: existing?.auto_reply_enabled ?? false,
      assistant_name: assistantName,
      tone,
      address_style: addressStyle,
      emoji_level: emojiLevel,
      response_length: responseLength,
      human_handoff_enabled: true,
      business_hours_only: businessHoursOnly,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  );

  if (error) throw new Error(`No se pudo guardar la configuración de WhatsApp IA: ${error.message}`);
  revalidatePath("/protected/settings/whatsapp");
  revalidatePath("/protected/inbox");
}

export async function activateWhatsAppLive() {
  const context = await requireCompanyAdminFeature("whatsapp_ai");
  if (context.role !== "OWNER") redirect("/protected");

  const { data: connection } = await context.supabase
    .from("whatsapp_connections")
    .select("status,webhook_status,phone_number_id")
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (connection?.status !== "CONNECTED" || connection?.webhook_status !== "VERIFIED" || !connection?.phone_number_id) {
    redirect("/protected/settings/whatsapp?error=La+cuenta+Meta+y+el+webhook+deben+estar+conectados+y+verificados+antes+de+activar+LIVE.");
  }

  const { error } = await context.supabase.from("whatsapp_ai_settings").upsert(
    {
      organization_id: context.organizationId,
      mode: "LIVE",
      auto_reply_enabled: true,
      human_handoff_enabled: true,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  );

  if (error) redirect(`/protected/settings/whatsapp?error=${encodeURIComponent("No se pudo activar WhatsApp LIVE.")}`);
  revalidatePath("/protected/settings/whatsapp");
  revalidatePath("/protected/inbox");
  redirect("/protected/settings/whatsapp?success=WhatsApp+LIVE+activado.");
}

export async function pauseWhatsAppLive() {
  const context = await requireCompanyAdminFeature("whatsapp_ai");
  if (context.role !== "OWNER") redirect("/protected");

  const { error } = await context.supabase
    .from("whatsapp_ai_settings")
    .update({ mode: "PAUSED", auto_reply_enabled: false, updated_by: context.userId, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organizationId);

  if (error) redirect(`/protected/settings/whatsapp?error=${encodeURIComponent("No se pudo pausar WhatsApp.")}`);
  revalidatePath("/protected/settings/whatsapp");
  revalidatePath("/protected/inbox");
  redirect("/protected/settings/whatsapp?success=Automatizacion+de+WhatsApp+pausada.");
}
