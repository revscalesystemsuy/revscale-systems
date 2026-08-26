import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const verifyToken = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") || "";
const appSecret = Deno.env.get("META_APP_SECRET") || "";
const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") || "";
const openAiKey = Deno.env.get("OPENAI_API_KEY") || "";
const openAiModel = Deno.env.get("OPENAI_WHATSAPP_MODEL") || "gpt-5-mini";
const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") || "v23.0";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

type AnyRow = Record<string, any>;

function admin() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase backend credentials unavailable");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyMetaSignature(rawBody: string, signature: string | null) {
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${hex(digest)}`;
  if (expected.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return difference === 0;
}

function normalizePhone(value: unknown) {
  const normalized = String(value || "").replace(/\D/g, "");
  return normalized || null;
}

function safeMessageType(type: unknown) {
  const value = String(type || "UNKNOWN").toUpperCase();
  return new Set(["TEXT","IMAGE","VIDEO","AUDIO","DOCUMENT","STICKER","LOCATION","CONTACTS","INTERACTIVE","REACTION"]).has(value) ? value : "UNKNOWN";
}

function messageBody(message: AnyRow) {
  if (message?.type === "text") return String(message.text?.body || "").trim();
  if (message?.type === "button") return String(message.button?.text || "").trim();
  if (message?.type === "interactive") return String(message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "").trim();
  if (message?.type === "location") return `Ubicación compartida${message.location?.name ? `: ${message.location.name}` : ""}`;
  return `[${String(message?.type || "mensaje").toUpperCase()}]`;
}

function isBusinessHoursMontevideo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Montevideo", weekday: "short", hour: "2-digit", hour12: false }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  return !["Sat", "Sun"].includes(weekday) && hour >= 9 && hour < 18;
}

function hardHandoff(text: string, configuredKeywords: unknown) {
  const value = text.toLowerCase();
  const defaults = ["quiero hablar con", "hablar con una persona", "humano", "asesor", "agente", "reclamo", "queja", "abogado", "contrato", "escribano", "seña", "reserva", "negociar", "negociación", "oferta formal", "comisión", "demanda", "problema legal", "garantía contractual"];
  const custom = Array.isArray(configuredKeywords) ? configuredKeywords.map((item) => String(item).toLowerCase().trim()).filter(Boolean) : [];
  return [...new Set([...defaults, ...custom])].some((pattern) => value.includes(pattern));
}

function normalizedQualification(raw: AnyRow | null, allowedPropertyIds: Set<string>) {
  if (!raw) return null;
  const operation = ["COMPRA", "ALQUILER"].includes(String(raw.operation || "").toUpperCase()) ? String(raw.operation).toUpperCase() : null;
  const currency = ["USD", "UYU"].includes(String(raw.currency || "").toUpperCase()) ? String(raw.currency).toUpperCase() : null;
  const budget = Number(raw.budget_max);
  const bedrooms = Number(raw.bedrooms_min);
  const confidence = Number(raw.confidence);
  const propertyId = String(raw.context_property_id || "");
  return {
    reply: String(raw.reply || "").trim().slice(0, 3500),
    intent: String(raw.intent || "").trim().slice(0, 100) || null,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : null,
    requires_human: raw.requires_human === true,
    handoff_reason: raw.handoff_reason ? String(raw.handoff_reason).trim().slice(0, 300) : null,
    operation,
    primary_zone: raw.primary_zone ? String(raw.primary_zone).trim().slice(0, 120) : null,
    budget_max: Number.isFinite(budget) && budget > 0 ? budget : null,
    currency,
    property_type: raw.property_type ? String(raw.property_type).trim().toUpperCase().slice(0, 80) : null,
    bedrooms_min: Number.isInteger(bedrooms) && bedrooms >= 0 && bedrooms <= 20 ? bedrooms : null,
    purchase_timeline: raw.purchase_timeline ? String(raw.purchase_timeline).trim().slice(0, 120) : null,
    financing_needed: typeof raw.financing_needed === "boolean" ? raw.financing_needed : null,
    visit_intent: typeof raw.visit_intent === "boolean" ? raw.visit_intent : null,
    next_action: raw.next_action ? String(raw.next_action).trim().slice(0, 240) : null,
    context_property_id: allowedPropertyIds.has(propertyId) ? propertyId : null,
  };
}

function scoreLead(fields: AnyRow, requiresHuman: boolean) {
  let score = 20;
  for (const key of ["operation","primary_zone","budget_max","currency","property_type","bedrooms_min","purchase_timeline"]) {
    const value = fields[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") score += 8;
  }
  if (fields.visit_intent === true) score += 14;
  if (requiresHuman) score += 5;
  return Math.max(0, Math.min(100, score));
}

function temperature(score: number) {
  return score >= 75 ? "HOT" : score >= 45 ? "WARM" : "COLD";
}

async function sendText(phoneNumberId: string, to: string, body: string) {
  if (!accessToken) throw new Error("META_WHATSAPP_ACCESS_TOKEN not configured");
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Meta send failed (${response.status}): ${payload?.error?.message || "unknown error"}`) as Error & { providerCode?: string; providerMessage?: string };
    error.providerCode = String(payload?.error?.code || response.status);
    error.providerMessage = String(payload?.error?.message || "Meta rejected the message").slice(0, 500);
    throw error;
  }
  const messageId = String(payload?.messages?.[0]?.id || "") || null;
  if (!messageId) throw new Error("Meta returned success without a message id");
  return messageId;
}

async function qualifyLead(input: { text: string; lead: AnyRow; properties: AnyRow[]; settings: AnyRow }) {
  if (!openAiKey) return null;
  const propertyContext = input.properties.map((p) => ({ id: p.id, title: p.title, operation: p.operation, property_type: p.property_type, zone: p.zone, price: p.price, currency: p.currency, bedrooms: p.bedrooms, status: p.status }));
  const prompt = `Sos el agente de calificación comercial de RevScale para una inmobiliaria. Obtené progresivamente datos útiles y acercá el lead a una visita o próxima acción. No inventes propiedades ni datos. Solo podés mencionar propiedades incluidas en PROPERTY_CONTEXT. Nunca prometas precio final, financiación aprobada, disponibilidad contractual, reserva, condiciones legales ni documentación. Si hay negociación, pregunta legal, reclamo, pedido de humano, baja confianza o situación sensible, requires_human=true y no intentes resolverla.\n\nDatos actuales: ${JSON.stringify(input.lead)}\nPROPERTY_CONTEXT: ${JSON.stringify(propertyContext)}\nMensaje nuevo: ${JSON.stringify(input.text)}\nEstilo: asistente=${input.settings.assistant_name || "RevScale"}, tono=${input.settings.tone || "PROFESSIONAL_FRIENDLY"}, trato=${input.settings.address_style || "VOS"}, longitud=${input.settings.response_length || "SHORT"}.\n\nRespondé SOLO JSON válido con: reply, intent, confidence, requires_human, handoff_reason, operation (COMPRA|ALQUILER|null), primary_zone, budget_max, currency (USD|UYU|null), property_type, bedrooms_min, purchase_timeline, financing_needed, visit_intent, next_action, context_property_id. Usá null cuando el dato no fue confirmado.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: openAiModel, input: prompt, max_output_tokens: 900 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI qualification failed (${response.status})`);
  let output = String(data?.output_text || "").trim();
  if (!output && Array.isArray(data?.output)) {
    output = data.output.flatMap((item: AnyRow) => Array.isArray(item?.content) ? item.content : []).map((item: AnyRow) => String(item?.text || "")).join("").trim();
  }
  return JSON.parse(output.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
}

async function claimWebhookEvent(db: ReturnType<typeof admin>, row: AnyRow) {
  const inserted = await db.from("whatsapp_webhook_events").insert(row).select("id,processing_status").maybeSingle();
  if (!inserted.error && inserted.data) return inserted.data;
  if (inserted.error?.code !== "23505") throw inserted.error;

  const existing = await db.from("whatsapp_webhook_events")
    .select("id,processing_status")
    .eq("event_key", row.event_key)
    .maybeSingle();
  if (existing.error || !existing.data) throw existing.error || new Error("Webhook event could not be recovered");
  if (existing.data.processing_status !== "ERROR") return null;

  const retried = await db.from("whatsapp_webhook_events").update({
    processing_status: "RECEIVED",
    error_message: null,
    processed_at: null,
    payload: row.payload,
    received_at: new Date().toISOString(),
  }).eq("id", existing.data.id).eq("processing_status", "ERROR").select("id,processing_status").maybeSingle();
  if (retried.error) throw retried.error;
  return retried.data || null;
}

async function notifyHandoff(db: ReturnType<typeof admin>, connection: AnyRow, lead: AnyRow, conversationId: string, reason: string) {
  const recipients = new Set<string>();
  if (lead.assigned_to) recipients.add(lead.assigned_to);
  const { data: leaders } = await db.from("organization_members").select("user_id,role,team_id").eq("organization_id", connection.organization_id).eq("status", "ACTIVE").in("role", ["OWNER","MANAGER"]);
  for (const member of leaders || []) if (member.role === "OWNER" || !lead.team_id || member.team_id === lead.team_id) recipients.add(member.user_id);
  for (const userId of recipients) {
    const dedupe = `whatsapp-handoff:${conversationId}:${userId}`;
    const { data: existing } = await db.from("notifications").select("id").eq("dedupe_key", dedupe).maybeSingle();
    const row = { organization_id: connection.organization_id, user_id: userId, team_id: lead.team_id || null, lead_id: lead.id, type: "WHATSAPP_HANDOFF", priority: "HIGH", title: "WhatsApp requiere atención humana", body: `${lead.full_name || "Un lead"}: ${reason}`, action_url: `/protected/inbox?conversation=${conversationId}`, dedupe_key: dedupe, read_at: null };
    if (existing) await db.from("notifications").update({ ...row, created_at: new Date().toISOString() }).eq("id", existing.id);
    else await db.from("notifications").insert(row);
  }
}

async function markHumanRequired(db: ReturnType<typeof admin>, connection: AnyRow, lead: AnyRow, conversation: AnyRow, reason: string, requestedBy: "CUSTOMER" | "AI" | "SYSTEM", score: number, nextAction?: string | null) {
  const now = new Date().toISOString();
  await db.from("whatsapp_conversations").update({ status: "HUMAN_REQUIRED", automation_paused: true, handoff_reason: reason.slice(0, 300), handoff_requested_at: now, handoff_requested_by: requestedBy, next_action: nextAction || "Atender conversación manualmente", priority: Math.max(score, 80), updated_at: now }).eq("id", conversation.id);
  await db.from("leads").update({ requires_human: true, next_action: nextAction || "Atender conversación de WhatsApp", updated_at: now }).eq("id", lead.id).eq("organization_id", connection.organization_id);
  await notifyHandoff(db, connection, lead, conversation.id, reason);
}

async function processStatus(db: ReturnType<typeof admin>, connection: AnyRow, status: AnyRow) {
  const externalId = String(status?.id || "");
  const state = String(status?.status || "").toUpperCase();
  if (!externalId || !state) return;
  const event = await claimWebhookEvent(db, { event_key: `status:${externalId}:${state}:${status?.timestamp || ""}`, organization_id: connection.organization_id, connection_id: connection.id, phone_number_id: connection.phone_number_id, external_message_id: externalId, event_type: `STATUS_${state}`, payload: status });
  if (!event) return;

  try {
    const timestamp = status?.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString();
    const patch: AnyRow = { status: ["SENT","DELIVERED","READ","FAILED"].includes(state) ? state : "SENT" };
    if (state === "SENT") patch.sent_at = timestamp;
    if (state === "DELIVERED") patch.delivered_at = timestamp;
    if (state === "READ") patch.read_at = timestamp;
    if (state === "FAILED") { patch.failed_at = timestamp; patch.error_code = String(status?.errors?.[0]?.code || "META_FAILED"); patch.error_message = String(status?.errors?.[0]?.message || status?.errors?.[0]?.title || "Delivery failed").slice(0, 500); }
    const updated = await db.from("whatsapp_messages").update(patch).eq("external_message_id", externalId);
    if (updated.error) throw updated.error;
    await db.from("whatsapp_webhook_events").update({ processing_status: "PROCESSED", error_message: null, processed_at: new Date().toISOString() }).eq("id", event.id);
  } catch (error) {
    await db.from("whatsapp_webhook_events").update({ processing_status: "ERROR", error_message: String(error).slice(0, 1000), processed_at: new Date().toISOString() }).eq("id", event.id);
    throw error;
  }
}

async function ensureAiInteraction(db: ReturnType<typeof admin>, message: AnyRow, lead: AnyRow, qualification: AnyRow, score: number) {
  if (message.interaction_id) return message.interaction_id;
  const interactionTime = message.sent_at || message.created_at || new Date().toISOString();
  const existing = await db.from("interactions").select("id").eq("organization_id", lead.organization_id).eq("lead_id", lead.id).eq("channel", "WHATSAPP").eq("direction", "OUTBOUND").eq("actor", "AI").eq("message", message.body).eq("created_at", interactionTime).limit(1).maybeSingle();
  if (existing.error) throw existing.error;

  let interactionId = existing.data?.id || null;
  if (!interactionId) {
    const inserted = await db.from("interactions").insert({ organization_id: lead.organization_id, lead_id: lead.id, channel: "WHATSAPP", direction: "OUTBOUND", actor: "AI", message: message.body, ai_response: message.body, detected_intent: qualification.intent, lead_score_after: score, requires_human: false, created_at: interactionTime }).select("id").single();
    if (inserted.error) throw inserted.error;
    interactionId = inserted.data.id;
  }
  const linked = await db.from("whatsapp_messages").update({ interaction_id: interactionId }).eq("id", message.id).is("interaction_id", null);
  if (linked.error) throw linked.error;
  return interactionId;
}

async function sendAiReply(db: ReturnType<typeof admin>, connection: AnyRow, conversation: AnyRow, lead: AnyRow, inboundExternalId: string, waContactId: string, qualification: AnyRow, score: number) {
  const idempotencyKey = `ai:${inboundExternalId}`;
  const reservation = await db.from("whatsapp_messages").insert({ organization_id: connection.organization_id, conversation_id: conversation.id, lead_id: lead.id, direction: "OUTBOUND", sender_type: "AI", body: qualification.reply, message_type: "TEXT", status: "QUEUED", detected_intent: qualification.intent, confidence: qualification.confidence, requires_human: false, model_provider: "OPENAI", model_name: openAiModel, idempotency_key: idempotencyKey }).select("id,body,status,interaction_id,external_message_id,sent_at,created_at,error_code,error_message").maybeSingle();

  let outbound = reservation.data;
  if (reservation.error?.code === "23505") {
    const existing = await db.from("whatsapp_messages").select("id,body,status,interaction_id,external_message_id,sent_at,created_at,error_code,error_message").eq("organization_id", connection.organization_id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing.error || !existing.data) throw existing.error || new Error("AI outbound reservation could not be recovered");
    outbound = existing.data;
  } else if (reservation.error) {
    throw reservation.error;
  }
  if (!outbound) throw new Error("AI outbound reservation failed");

  if (["SENT","DELIVERED","READ"].includes(outbound.status)) {
    await ensureAiInteraction(db, outbound, lead, qualification, score);
    return outbound;
  }
  if (outbound.status === "QUEUED" && reservation.error?.code === "23505") return outbound;
  if (outbound.status === "FAILED") {
    const reset = await db.from("whatsapp_messages").update({ status: "QUEUED", failed_at: null, error_code: null, error_message: null }).eq("id", outbound.id).eq("status", "FAILED").select("id,body,status,interaction_id,external_message_id,sent_at,created_at,error_code,error_message").maybeSingle();
    if (reset.error || !reset.data) return outbound;
    outbound = reset.data;
  }

  let sentId: string;
  try {
    sentId = await sendText(connection.phone_number_id, waContactId, outbound.body);
  } catch (error) {
    const providerCode = String((error as Error & { providerCode?: string }).providerCode || "PROVIDER_SEND_FAILED");
    const providerMessage = String((error as Error & { providerMessage?: string }).providerMessage || error).slice(0, 500);
    const explicitProviderFailure = providerCode !== "PROVIDER_SEND_FAILED";
    await db.from("whatsapp_messages").update(explicitProviderFailure ? { status: "FAILED", failed_at: new Date().toISOString(), error_code: providerCode, error_message: providerMessage } : { error_code: "PROVIDER_STATE_UNKNOWN", error_message: providerMessage }).eq("id", outbound.id);
    if (!explicitProviderFailure) return { ...outbound, error_code: "PROVIDER_STATE_UNKNOWN", error_message: providerMessage };
    throw error;
  }

  const sentAt = new Date().toISOString();
  const sent = await db.from("whatsapp_messages").update({ external_message_id: sentId, status: "SENT", sent_at: sentAt, failed_at: null, error_code: null, error_message: null }).eq("id", outbound.id).select("id,body,status,interaction_id,external_message_id,sent_at,created_at,error_code,error_message").single();
  if (sent.error) throw sent.error;
  outbound = sent.data;
  await ensureAiInteraction(db, outbound, lead, qualification, score);
  return outbound;
}

async function processInbound(db: ReturnType<typeof admin>, connection: AnyRow, message: AnyRow, contact: AnyRow | null) {
  const externalId = String(message?.id || "");
  const waContactId = normalizePhone(message?.from);
  if (!externalId || !waContactId) return;
  const event = await claimWebhookEvent(db, { event_key: `message:${externalId}`, organization_id: connection.organization_id, connection_id: connection.id, phone_number_id: connection.phone_number_id, external_message_id: externalId, event_type: "MESSAGE_INBOUND", payload: message });
  if (!event) return;

  try {
    const now = new Date().toISOString();
    let { data: lead } = await db.from("leads").select("*").eq("organization_id", connection.organization_id).eq("phone_normalized", waContactId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (!lead) {
      const inserted = await db.from("leads").insert({ organization_id: connection.organization_id, phone: waContactId, phone_normalized: waContactId, full_name: String(contact?.profile?.name || `WhatsApp ${waContactId.slice(-4)}`).slice(0, 120), source_channel: "WHATSAPP", source_provider: "META_WHATSAPP", received_at: now, pipeline_stage: "NEW", next_action: "Calificar consulta de WhatsApp", lead_score: 20, lead_temperature: "COLD" }).select("*").single();
      if (inserted.error) throw inserted.error;
      lead = inserted.data;
    }

    let { data: conversation } = await db.from("whatsapp_conversations").select("*").eq("organization_id", connection.organization_id).eq("wa_contact_id", waContactId).maybeSingle();
    if (!conversation) {
      const created = await db.from("whatsapp_conversations").insert({ organization_id: connection.organization_id, lead_id: lead.id, connection_id: connection.id, wa_contact_id: waContactId, status: "OPEN", automation_paused: false, last_message_at: now, last_inbound_at: now, unread_count: 1, priority: lead.lead_score || 20, next_action: lead.next_action }).select("*").single();
      if (created.error) throw created.error;
      conversation = created.data;
    } else {
      const updated = await db.from("whatsapp_conversations").update({ lead_id: lead.id, connection_id: connection.id, last_message_at: now, last_inbound_at: now, unread_count: Number(conversation.unread_count || 0) + 1, updated_at: now }).eq("id", conversation.id).select("*").single();
      if (!updated.error) conversation = updated.data;
    }

    const body = messageBody(message);
    const providerTimestamp = message?.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : now;
    const inbound = await db.from("whatsapp_messages").insert({ organization_id: connection.organization_id, conversation_id: conversation.id, lead_id: lead.id, direction: "INBOUND", sender_type: "CUSTOMER", external_message_id: externalId, body, message_type: safeMessageType(message?.type), status: "RECEIVED", provider_timestamp: providerTimestamp, reply_to_external_message_id: message?.context?.id || null }).select("id").maybeSingle();
    if (inbound.error && inbound.error.code !== "23505") throw inbound.error;

    const existingInboundInteraction = await db.from("interactions").select("id").eq("organization_id", connection.organization_id).eq("lead_id", lead.id).eq("channel", "WHATSAPP").eq("direction", "INBOUND").eq("actor", "LEAD").eq("message", body).eq("created_at", providerTimestamp).limit(1).maybeSingle();
    if (existingInboundInteraction.error) throw existingInboundInteraction.error;
    if (!existingInboundInteraction.data) {
      const interaction = await db.from("interactions").insert({ organization_id: connection.organization_id, lead_id: lead.id, channel: "WHATSAPP", direction: "INBOUND", actor: "LEAD", message: body, created_at: providerTimestamp });
      if (interaction.error) throw interaction.error;
    }
    await db.from("whatsapp_connections").update({ last_webhook_at: now, webhook_status: "VERIFIED", updated_at: now, last_error: null }).eq("id", connection.id);

    const { data: settings } = await db.from("whatsapp_ai_settings").select("*").eq("organization_id", connection.organization_id).maybeSingle();
    const forceHandoff = hardHandoff(body, settings?.handoff_keywords);
    const withinHours = settings?.business_hours_only !== true || isBusinessHoursMontevideo();
    const automationAllowed = settings?.mode === "LIVE" && settings?.auto_reply_enabled === true && conversation.automation_paused !== true && conversation.status !== "HUMAN_REQUIRED" && withinHours;

    if (forceHandoff) {
      await markHumanRequired(db, connection, lead, conversation, "Consulta sensible o pedido explícito de atención humana", "CUSTOMER", Number(lead.lead_score || 20));
      await db.from("whatsapp_webhook_events").update({ processing_status: "PROCESSED", error_message: null, processed_at: new Date().toISOString() }).eq("id", event.id);
      return;
    }

    if (!automationAllowed || !openAiKey) {
      await db.from("whatsapp_conversations").update({ next_action: !withinHours ? "Responder al iniciar el horario comercial" : "Responder conversación de WhatsApp", updated_at: now }).eq("id", conversation.id);
      await db.from("whatsapp_webhook_events").update({ processing_status: "PROCESSED", error_message: null, processed_at: new Date().toISOString() }).eq("id", event.id);
      return;
    }

    const { data: matches } = await db.from("property_lead_matches").select("property_id,compatibility").eq("lead_id", lead.id).order("compatibility", { ascending: false }).limit(5);
    const propertyIds = (matches || []).map((item: AnyRow) => item.property_id);
    let properties: AnyRow[] = [];
    if (propertyIds.length) {
      const result = await db.from("properties").select("id,title,operation,property_type,zone,price,currency,bedrooms,status").in("id", propertyIds).eq("status", "AVAILABLE");
      properties = result.data || [];
    }

    let qualification: ReturnType<typeof normalizedQualification> = null;
    try {
      const raw = await qualifyLead({ text: body, lead: { operation: lead.operation, primary_zone: lead.primary_zone, budget_max: lead.budget_max, currency: lead.currency, property_type: lead.property_type, bedrooms_min: lead.bedrooms_min, purchase_timeline: lead.purchase_timeline, financing_needed: lead.financing_needed, visit_intent: lead.visit_intent }, properties, settings });
      qualification = normalizedQualification(raw, new Set(properties.map((p) => String(p.id))));
    } catch (error) {
      console.error("WhatsApp qualification failed safely", error);
      await markHumanRequired(db, connection, lead, conversation, "No se pudo clasificar la consulta con suficiente seguridad", "SYSTEM", Math.max(Number(lead.lead_score || 20), 70));
      await db.from("whatsapp_webhook_events").update({ processing_status: "PROCESSED", error_message: null, processed_at: new Date().toISOString() }).eq("id", event.id);
      return;
    }

    if (!qualification || qualification.confidence === null || qualification.confidence < 0.55 || qualification.requires_human) {
      await markHumanRequired(db, connection, lead, conversation, qualification?.handoff_reason || "Baja confianza en la clasificación automática", "AI", Math.max(Number(lead.lead_score || 20), 70), qualification?.next_action);
      await db.from("whatsapp_webhook_events").update({ processing_status: "PROCESSED", error_message: null, processed_at: new Date().toISOString() }).eq("id", event.id);
      return;
    }

    const fields: AnyRow = {};
    for (const key of ["operation","primary_zone","budget_max","currency","property_type","bedrooms_min","purchase_timeline","financing_needed","visit_intent","next_action"]) {
      const value = qualification[key as keyof typeof qualification];
      if (value !== null && value !== undefined && value !== "") fields[key] = value;
    }
    const score = scoreLead({ ...lead, ...fields }, false);
    fields.lead_score = score;
    fields.lead_temperature = temperature(score);
    fields.updated_at = now;
    const leadUpdate = await db.from("leads").update(fields).eq("id", lead.id).eq("organization_id", connection.organization_id);
    if (leadUpdate.error) throw leadUpdate.error;

    if (qualification.reply && accessToken) {
      const outbound = await sendAiReply(db, connection, conversation, lead, externalId, waContactId, qualification, score);
      if (outbound.status === "QUEUED" && outbound.error_code === "PROVIDER_STATE_UNKNOWN") {
        await markHumanRequired(db, connection, lead, conversation, "El estado de una respuesta automática quedó incierto; se pausó la IA para evitar duplicados", "SYSTEM", Math.max(score, 75));
      } else if (["SENT","DELIVERED","READ"].includes(outbound.status)) {
        await db.from("whatsapp_conversations").update({ last_message_at: outbound.sent_at || now, last_outbound_at: outbound.sent_at || now, priority: score, next_action: qualification.next_action || lead.next_action, context_property_id: qualification.context_property_id || conversation.context_property_id, updated_at: now }).eq("id", conversation.id);
      }
    } else {
      await db.from("whatsapp_conversations").update({ next_action: "Responder conversación de WhatsApp", priority: score, updated_at: now }).eq("id", conversation.id);
    }

    await db.from("whatsapp_webhook_events").update({ processing_status: "PROCESSED", error_message: null, processed_at: new Date().toISOString() }).eq("id", event.id);
  } catch (error) {
    await db.from("whatsapp_webhook_events").update({ processing_status: "ERROR", error_message: String(error).slice(0, 1000), processed_at: new Date().toISOString() }).eq("id", event.id);
    await db.from("whatsapp_connections").update({ last_error: String(error).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", connection.id);
    console.error("WhatsApp inbound processing error", error);
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (!verifyToken) return new Response("WhatsApp integration not activated", { status: 503 });
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === verifyToken && challenge) return new Response(challenge, { status: 200 });
    return new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!appSecret) return new Response("WhatsApp integration not activated", { status: 503 });
  const rawBody = await req.text();
  if (!(await verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256")))) return new Response("Invalid signature", { status: 401 });
  const payload = JSON.parse(rawBody);
  const db = admin();
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      const phoneNumberId = String(value?.metadata?.phone_number_id || "");
      if (!phoneNumberId) continue;
      const { data: connection } = await db.from("whatsapp_connections").select("*").eq("phone_number_id", phoneNumberId).eq("status", "CONNECTED").maybeSingle();
      if (!connection) continue;
      for (const status of value?.statuses || []) {
        try { await processStatus(db, connection, status); } catch (error) { console.error("WhatsApp status processing error", error); }
      }
      for (const message of value?.messages || []) {
        const contact = (value?.contacts || []).find((item: AnyRow) => normalizePhone(item?.wa_id) === normalizePhone(message?.from)) || value?.contacts?.[0] || null;
        await processInbound(db, connection, message, contact);
      }
    }
  }
  return Response.json({ ok: true });
});
