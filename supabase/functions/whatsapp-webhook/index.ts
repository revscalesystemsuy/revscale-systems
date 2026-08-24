import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const verifyToken = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") || "";
const appSecret = Deno.env.get("META_APP_SECRET") || "";

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyMetaSignature(rawBody: string, signature: string | null) {
  if (!appSecret || !signature?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${hex(digest)}`;

  if (expected.length !== signature.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (!verifyToken) return new Response("WhatsApp integration not activated", { status: 503 });

    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!appSecret) return new Response("WhatsApp integration not activated", { status: 503 });

  const rawBody = await req.text();
  const validSignature = await verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"));
  if (!validSignature) return new Response("Invalid signature", { status: 401 });

  // Intentionally dormant. Once the first customer is activated, this verified payload
  // will be handed to the message processor that resolves the organization, lead,
  // conversation, property context, AI response and human-handoff decision.
  return Response.json({ ok: true, mode: "PREPARATION" }, { status: 200 });
});
