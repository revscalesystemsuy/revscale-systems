import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET") || "";
const MAX_SIGNATURE_AGE_SECONDS = 60;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, signatureHeader: string | null) {
  if (!webhookSecret || !signatureHeader) return false;
  const parts = signatureHeader.split(";");
  const timestamp = parts.find((part) => part.startsWith("ts="))?.slice(3) || "";
  const signatures = parts.filter((part) => part.startsWith("h1=")).map((part) => part.slice(3));
  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isFinite(timestampNumber) || signatures.length === 0) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber);
  if (age > MAX_SIGNATURE_AGE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}:${rawBody}`));
  const expected = toHex(digest);
  return signatures.some((candidate) => constantTimeEqual(candidate, expected));
}

type PaddleEvent = {
  event_id?: string;
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    customer_id?: string;
    subscription_id?: string;
    custom_data?: Record<string, unknown> | null;
    items?: Array<{ price?: { id?: string } }>;
    current_billing_period?: { ends_at?: string } | null;
    scheduled_change?: { action?: string } | null;
  };
};

function requestIdFrom(event: PaddleEvent) {
  const value = event.data?.custom_data?.revscale_plan_request_id;
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Billing webhook not activated" }, { status: 503 });
  }

  const rawBody = await req.text();
  const validSignature = await verifySignature(rawBody, req.headers.get("Paddle-Signature"));
  if (!validSignature) return Response.json({ error: "Invalid signature" }, { status: 401 });

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = String(event.event_id || "");
  const eventType = String(event.event_type || "");
  if (!eventId || !eventType) return Response.json({ error: "Invalid event" }, { status: 400 });

  const data = event.data || {};
  const subscriptionId = eventType.startsWith("subscription.") ? data.id : data.subscription_id;
  const transactionId = eventType.startsWith("transaction.") ? data.id : null;
  const priceId = data.items?.[0]?.price?.id || null;
  const periodEnd = data.current_billing_period?.ends_at || null;
  const cancelAtPeriodEnd = data.scheduled_change?.action === "cancel";

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: result, error } = await admin.rpc("process_paddle_billing_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_plan_request_id: requestIdFrom(event),
    p_subscription_id: subscriptionId || null,
    p_transaction_id: transactionId || null,
    p_customer_id: data.customer_id || null,
    p_status: data.status || null,
    p_period_end: periodEnd,
    p_cancel_at_period_end: cancelAtPeriodEnd,
    p_price_id: priceId,
  });

  if (error) {
    console.error("PADDLE BILLING EVENT ERROR", error.message);
    return Response.json({ error: "Billing event processing failed" }, { status: 500 });
  }

  return Response.json(result || { ok: true }, { status: 200 });
});
