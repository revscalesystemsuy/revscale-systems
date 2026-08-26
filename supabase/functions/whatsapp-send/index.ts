import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") || "";
const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") || "v23.0";

type AnyRow = Record<string, any>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function ensureHumanInteraction(
  db: ReturnType<typeof createClient>,
  message: AnyRow,
  conversation: AnyRow,
  lead: AnyRow,
  actor: string,
) {
  if (message.interaction_id) return message.interaction_id;
  const interactionTime = message.sent_at || message.created_at || new Date().toISOString();

  const { data: existing, error: existingError } = await db
    .from("interactions")
    .select("id")
    .eq("organization_id", conversation.organization_id)
    .eq("lead_id", conversation.lead_id)
    .eq("channel", "WHATSAPP")
    .eq("direction", "OUTBOUND")
    .eq("actor", actor)
    .eq("message", message.body)
    .eq("created_at", interactionTime)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  let interactionId = existing?.id || null;
  if (!interactionId) {
    const inserted = await db.from("interactions").insert({
      organization_id: conversation.organization_id,
      lead_id: conversation.lead_id,
      channel: "WHATSAPP",
      direction: "OUTBOUND",
      actor,
      message: message.body,
      lead_score_after: lead.lead_score,
      requires_human: false,
      created_at: interactionTime,
    }).select("id").single();
    if (inserted.error) throw inserted.error;
    interactionId = inserted.data.id;
  }

  const linked = await db.from("whatsapp_messages")
    .update({ interaction_id: interactionId })
    .eq("id", message.id)
    .is("interaction_id", null);
  if (linked.error) throw linked.error;
  return interactionId;
}

async function finishHumanWorkflow(
  db: ReturnType<typeof createClient>,
  conversation: AnyRow,
  lead: AnyRow,
  message: AnyRow,
  actor: string,
) {
  await ensureHumanInteraction(db, message, conversation, lead, actor);
  const now = message.sent_at || new Date().toISOString();
  const [conversationUpdate, leadUpdate] = await Promise.all([
    db.from("whatsapp_conversations").update({
      status: "OPEN",
      automation_paused: true,
      handoff_resolved_at: now,
      unread_count: 0,
      last_message_at: now,
      last_outbound_at: now,
      next_action: "Continuar seguimiento humano o reactivar IA",
      updated_at: now,
    }).eq("id", conversation.id),
    db.from("leads").update({
      requires_human: false,
      next_action: "Continuar seguimiento por WhatsApp",
      updated_at: now,
    }).eq("id", conversation.lead_id).eq("organization_id", conversation.organization_id),
  ]);
  if (conversationUpdate.error) throw conversationUpdate.error;
  if (leadUpdate.error) throw leadUpdate.error;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend unavailable" }, 503);

  const authorization = req.headers.get("authorization") || "";
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await db.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const payload = await req.json().catch(() => ({}));
  const conversationId = String(payload?.conversation_id || "").trim();
  const body = String(payload?.body || "").trim();
  const requestId = String(payload?.request_id || "").trim();
  if (!conversationId || !body || !requestId) return json({ error: "conversation_id, body and request_id are required" }, 400);
  if (body.length > 3500) return json({ error: "Message too long" }, 400);
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(requestId)) return json({ error: "Invalid request_id" }, 400);

  const { data: conversation } = await db.from("whatsapp_conversations")
    .select("id,organization_id,lead_id,connection_id,wa_contact_id,status,automation_paused")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return json({ error: "Conversation not found" }, 404);

  const [{ data: membership }, { data: subscription }, { data: lead }, { data: connection }] = await Promise.all([
    db.from("organization_members").select("role,team_id,status").eq("organization_id", conversation.organization_id).eq("user_id", user.id).eq("status", "ACTIVE").maybeSingle(),
    db.from("subscriptions").select("plan,status").eq("organization_id", conversation.organization_id).maybeSingle(),
    db.from("leads").select("id,organization_id,team_id,assigned_to,lead_score,lead_temperature").eq("id", conversation.lead_id).eq("organization_id", conversation.organization_id).maybeSingle(),
    db.from("whatsapp_connections").select("id,status,phone_number_id").eq("id", conversation.connection_id).eq("organization_id", conversation.organization_id).maybeSingle(),
  ]);

  if (!membership || !lead) return json({ error: "Forbidden" }, 403);
  const plan = String(subscription?.plan || "TRIAL").toUpperCase();
  if (String(subscription?.status || "").toUpperCase() !== "ACTIVE" || !["PRO","PROFESSIONAL","ENTERPRISE"].includes(plan)) return json({ error: "WhatsApp is not available on this plan" }, 403);

  if (plan === "ENTERPRISE") {
    const role = String(membership.role || "").toUpperCase();
    const allowed = role === "OWNER" || (role === "MANAGER" && membership.team_id && membership.team_id === lead.team_id) || (role === "AGENT" && lead.assigned_to === user.id);
    if (!allowed) return json({ error: "Forbidden" }, 403);
  }

  if (!connection || connection.status !== "CONNECTED" || !connection.phone_number_id || !conversation.wa_contact_id) return json({ error: "WhatsApp connection is not active" }, 409);
  if (!accessToken) return json({ error: "WhatsApp provider credentials are not configured" }, 503);

  const role = String(membership.role || "AGENT").toUpperCase();
  const actor = ["OWNER","MANAGER","AGENT"].includes(role) ? role : "AGENT";
  const idempotencyKey = `human:${conversation.id}:${user.id}:${requestId}`;
  const now = new Date().toISOString();

  let message: AnyRow | null = null;
  const reservation = await db.from("whatsapp_messages").insert({
    organization_id: conversation.organization_id,
    conversation_id: conversation.id,
    lead_id: conversation.lead_id,
    direction: "OUTBOUND",
    sender_type: "AGENT",
    sender_user_id: user.id,
    body,
    message_type: "TEXT",
    status: "QUEUED",
    idempotency_key: idempotencyKey,
  }).select("id,organization_id,conversation_id,lead_id,body,status,idempotency_key,interaction_id,external_message_id,sent_at,created_at,error_code,error_message").maybeSingle();

  const recoveredExisting = reservation.error?.code === "23505";
  if (recoveredExisting) {
    const existing = await db.from("whatsapp_messages")
      .select("id,organization_id,conversation_id,lead_id,body,status,idempotency_key,interaction_id,external_message_id,sent_at,created_at,error_code,error_message")
      .eq("organization_id", conversation.organization_id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing.error || !existing.data) return json({ error: "Could not recover the previous send attempt" }, 500);
    message = existing.data;
  } else if (reservation.error) {
    return json({ error: "Could not reserve the outbound message" }, 500);
  } else {
    message = reservation.data;
  }

  if (!message) return json({ error: "Could not reserve the outbound message" }, 500);

  if (["SENT","DELIVERED","READ"].includes(message.status)) {
    try {
      await finishHumanWorkflow(db, conversation, lead, message, actor);
    } catch (error) {
      return json({ error: `Message was already sent but local reconciliation failed: ${String(error).slice(0, 180)}` }, 500);
    }
    return json({ ok: true, duplicate: true, status: message.status, message_id: message.id, external_message_id: message.external_message_id, lead_id: conversation.lead_id });
  }

  if (message.status === "QUEUED" && recoveredExisting) {
    if (message.error_code === "PROVIDER_STATE_UNKNOWN") {
      return json({ error: "El estado del envío anterior sigue incierto. No lo reenviamos automáticamente para evitar duplicados." }, 409);
    }
    return json({ ok: true, duplicate: true, pending: true, status: "QUEUED", message_id: message.id, lead_id: conversation.lead_id });
  }

  if (message.status === "FAILED") {
    const reset = await db.from("whatsapp_messages").update({
      status: "QUEUED",
      failed_at: null,
      error_code: null,
      error_message: null,
    }).eq("id", message.id).eq("status", "FAILED")
      .select("id,organization_id,conversation_id,lead_id,body,status,idempotency_key,interaction_id,external_message_id,sent_at,created_at,error_code,error_message")
      .maybeSingle();
    if (reset.error) return json({ error: "Could not reserve the failed message for retry" }, 500);
    if (!reset.data) {
      const current = await db.from("whatsapp_messages")
        .select("id,status,error_code,external_message_id,interaction_id,sent_at,created_at,body")
        .eq("id", message.id)
        .maybeSingle();
      if (current.error || !current.data) return json({ error: "Could not recover the retry state" }, 500);
      if (["SENT","DELIVERED","READ"].includes(current.data.status)) {
        await finishHumanWorkflow(db, conversation, lead, current.data, actor);
        return json({ ok: true, duplicate: true, status: current.data.status, message_id: current.data.id, external_message_id: current.data.external_message_id, lead_id: conversation.lead_id });
      }
      return json({ ok: true, duplicate: true, pending: true, status: current.data.status, message_id: current.data.id, lead_id: conversation.lead_id });
    }
    message = reset.data;
  }

  const pause = await db.from("whatsapp_conversations").update({
    automation_paused: true,
    next_action: "Envío humano en curso",
    updated_at: now,
  }).eq("id", conversation.id);
  if (pause.error) return json({ error: "Could not pause automation before sending" }, 500);

  let metaResponse: Response;
  try {
    metaResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(connection.phone_number_id)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: conversation.wa_contact_id, type: "text", text: { preview_url: false, body: message.body } }),
    });
  } catch (error) {
    await db.from("whatsapp_messages").update({
      error_code: "PROVIDER_STATE_UNKNOWN",
      error_message: String(error).slice(0, 500),
    }).eq("id", message.id);
    return json({ error: "No se pudo confirmar el estado del envío. No se reintentará automáticamente para evitar duplicados." }, 502);
  }

  const metaPayload = await metaResponse.json().catch(() => ({}));
  if (!metaResponse.ok) {
    const providerError = String(metaPayload?.error?.message || "Meta rejected the message").slice(0, 500);
    await db.from("whatsapp_messages").update({
      status: "FAILED",
      failed_at: new Date().toISOString(),
      error_code: String(metaPayload?.error?.code || metaResponse.status),
      error_message: providerError,
    }).eq("id", message.id);
    return json({ error: "Meta rejected the message", provider_error: providerError }, 502);
  }

  const externalMessageId = String(metaPayload?.messages?.[0]?.id || "") || null;
  if (!externalMessageId) {
    await db.from("whatsapp_messages").update({
      error_code: "PROVIDER_STATE_UNKNOWN",
      error_message: "Meta returned success without a message id",
    }).eq("id", message.id);
    return json({ error: "Meta aceptó la solicitud pero no devolvió un identificador. No se reintentará automáticamente." }, 502);
  }

  const sentAt = new Date().toISOString();
  const sentUpdate = await db.from("whatsapp_messages").update({
    external_message_id: externalMessageId,
    status: "SENT",
    sent_at: sentAt,
    failed_at: null,
    error_code: null,
    error_message: null,
  }).eq("id", message.id)
    .select("id,organization_id,conversation_id,lead_id,body,status,idempotency_key,interaction_id,external_message_id,sent_at,created_at,error_code,error_message")
    .single();

  if (sentUpdate.error) {
    return json({ error: "Message was accepted by Meta but local delivery state could not be persisted. The same request will not be sent twice." }, 500);
  }
  message = sentUpdate.data;

  try {
    await finishHumanWorkflow(db, conversation, lead, message, actor);
  } catch (error) {
    return json({ error: `Message was sent but local workflow reconciliation failed: ${String(error).slice(0, 180)}` }, 500);
  }

  return json({ ok: true, status: "SENT", message_id: message.id, external_message_id: externalMessageId, lead_id: conversation.lead_id });
});
