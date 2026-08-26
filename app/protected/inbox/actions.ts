"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { planHasFeature } from "@/lib/plan-access";
import { getCurrentOrganizationContext } from "@/lib/organization-role";

function inboxUrl(conversationId?: string | null, error?: string | null) {
  const params = new URLSearchParams();
  if (conversationId) params.set("conversation", conversationId);
  if (error) params.set("error", error);
  const query = params.toString();
  return `/protected/inbox${query ? `?${query}` : ""}`;
}

export async function sendWhatsAppMessage(formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context || context.subscriptionStatus !== "ACTIVE" || !planHasFeature(context.plan, "whatsapp_ai")) redirect("/protected");

  const conversationId = String(formData.get("conversation_id") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!conversationId || !body) redirect(inboxUrl(conversationId, "Escribí un mensaje antes de enviar."));

  const { data, error } = await context.supabase.functions.invoke("whatsapp-send", {
    body: { conversation_id: conversationId, body },
  });

  if (error || data?.error) {
    const message = data?.provider_error || data?.error || error?.message || "No se pudo enviar el mensaje.";
    redirect(inboxUrl(conversationId, String(message).slice(0, 180)));
  }

  revalidatePath("/protected/inbox");
  revalidatePath(`/protected/leads/${data?.lead_id || ""}`);
  redirect(inboxUrl(conversationId));
}

export async function pauseWhatsAppAutomation(formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context || context.subscriptionStatus !== "ACTIVE" || !planHasFeature(context.plan, "whatsapp_ai")) redirect("/protected");
  const conversationId = String(formData.get("conversation_id") || "").trim();
  if (!conversationId) redirect("/protected/inbox");

  const { error } = await context.supabase
    .from("whatsapp_conversations")
    .update({ automation_paused: true, next_action: "Gestión humana en curso", updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) redirect(inboxUrl(conversationId, "No pudimos pausar la automatización."));
  revalidatePath("/protected/inbox");
  redirect(inboxUrl(conversationId));
}

export async function resumeWhatsAppAutomation(formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context || context.subscriptionStatus !== "ACTIVE" || !planHasFeature(context.plan, "whatsapp_ai")) redirect("/protected");
  const conversationId = String(formData.get("conversation_id") || "").trim();
  if (!conversationId) redirect("/protected/inbox");

  const { data: settings } = await context.supabase
    .from("whatsapp_ai_settings")
    .select("mode,auto_reply_enabled")
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (settings?.mode !== "LIVE" || settings?.auto_reply_enabled !== true) {
    redirect(inboxUrl(conversationId, "La IA de WhatsApp no está en modo LIVE para esta organización."));
  }

  const { error } = await context.supabase
    .from("whatsapp_conversations")
    .update({
      status: "OPEN",
      automation_paused: false,
      handoff_reason: null,
      handoff_resolved_at: new Date().toISOString(),
      next_action: "IA retomó la calificación",
      unread_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (error) redirect(inboxUrl(conversationId, "No pudimos reactivar la IA."));
  revalidatePath("/protected/inbox");
  redirect(inboxUrl(conversationId));
}

export async function markWhatsAppConversationRead(formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context || !planHasFeature(context.plan, "whatsapp_ai")) redirect("/protected");
  const conversationId = String(formData.get("conversation_id") || "").trim();
  if (conversationId) {
    await context.supabase.from("whatsapp_conversations").update({ unread_count: 0, updated_at: new Date().toISOString() }).eq("id", conversationId);
    revalidatePath("/protected/inbox");
  }
  redirect(inboxUrl(conversationId));
}
