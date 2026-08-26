import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") || "";
const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") || "v23.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
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
  if (!conversationId || !body) return json({ error: "conversation_id and body are required" }, 400);
  if (body.length > 3500) return json({ error: "Message too long" }, 400);

  const { data: conversation } = await db.from("whatsapp_conversations").select("id,organization_id,lead_id,connection_id,wa_contact_id,status,automation_paused").eq("id", conversationId).maybeSingle();
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

  const metaResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(connection.phone_number_id)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: conversation.wa_contact_id, type: "text", text: { preview_url: false, body } }),
  });
  const metaPayload = await metaResponse.json().catch(() => ({}));
  if (!metaResponse.ok) return json({ error: "Meta rejected the message", provider_error: metaPayload?.error?.message || null }, 502);

  const externalMessageId = String(metaPayload?.messages?.[0]?.id || "") || null;
  const now = new Date().toISOString();
  const role = String(membership.role || "AGENT").toUpperCase();
  const actor = ["OWNER","MANAGER","AGENT"].includes(role) ? role : "AGENT";

  const messageInsert = await db.from("whatsapp_messages").insert({
    organization_id: conversation.organization_id,
    conversation_id: conversation.id,
    lead_id: conversation.lead_id,
    direction: "OUTBOUND",
    sender_type: "AGENT",
    sender_user_id: user.id,
    external_message_id: externalMessageId,
    body,
    message_type: "TEXT",
    status: "SENT",
    sent_at: now,
  }).select("id").single();
  if (messageInsert.error) return json({ error: "Message sent but could not be persisted" }, 500);

  await db.from("interactions").insert({
    organization_id: conversation.organization_id,
    lead_id: conversation.lead_id,
    channel: "WHATSAPP",
    direction: "OUTBOUND",
    actor,
    message: body,
    lead_score_after: lead.lead_score,
    requires_human: false,
    created_at: now,
  });

  await Promise.all([
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
    db.from("leads").update({ requires_human: false, next_action: "Continuar seguimiento por WhatsApp", updated_at: now }).eq("id", conversation.lead_id).eq("organization_id", conversation.organization_id),
  ]);

  return json({ ok: true, message_id: messageInsert.data.id, external_message_id: externalMessageId, lead_id: conversation.lead_id });
});
