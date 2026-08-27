import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const mercadoLibreClientId = Deno.env.get("MERCADOLIBRE_CLIENT_ID") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Base64Url(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return base64Url(hash);
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
  const action = String(payload?.action || "start").toLowerCase();
  const provider = String(payload?.provider || "MERCADOLIBRE").toUpperCase();
  if (provider !== "MERCADOLIBRE") return json({ error: "Provider not available for live connection" }, 400);

  const { data: membership } = await db
    .from("organization_members")
    .select("organization_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!membership || membership.role !== "OWNER") return json({ error: "Only Dirección can manage portal credentials" }, 403);

  const { data: subscription } = await db
    .from("subscriptions")
    .select("plan,status")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (String(subscription?.status || "").toUpperCase() !== "ACTIVE" || String(subscription?.plan || "").toUpperCase() !== "ENTERPRISE") {
    return json({ error: "Live portal connections require Enterprise" }, 403);
  }

  if (action === "disconnect") {
    const { data: connection } = await db
      .from("portal_connections")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("provider", provider)
      .maybeSingle();

    if (connection?.id) {
      const secretResult = await db.rpc("delete_portal_connection_secret", { p_connection_id: connection.id });
      if (secretResult.error) return json({ error: "Could not remove provider credentials" }, 500);
      const update = await db.from("portal_connections").update({
        status: "DISCONNECTED",
        external_account_id: null,
        external_account_name: null,
        scopes: [],
        token_expires_at: null,
        connected_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", connection.id);
      if (update.error) return json({ error: "Could not disconnect provider" }, 500);

      await db.from("portal_sync_events").insert({
        organization_id: membership.organization_id,
        connection_id: connection.id,
        provider,
        action: "DISCONNECT",
        status: "SUCCESS",
        message: "Provider disconnected by organization owner",
      });
    }
    return json({ ok: true, status: "DISCONNECTED" });
  }

  if (action !== "start") return json({ error: "Unsupported action" }, 400);
  if (!mercadoLibreClientId) return json({ error: "Mercado Libre application credentials are not configured" }, 503);

  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifierBytes = crypto.getRandomValues(new Uint8Array(48));
  const state = base64Url(stateBytes);
  const codeVerifier = base64Url(verifierBytes);
  const stateHash = await sha256Hex(state);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const callbackUrl = `${supabaseUrl}/functions/v1/portal-auth-callback`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  await db.from("portal_oauth_states").delete().eq("user_id", user.id).eq("provider", provider);
  const stateInsert = await db.from("portal_oauth_states").insert({
    state_hash: stateHash,
    provider,
    organization_id: membership.organization_id,
    user_id: user.id,
    code_verifier: codeVerifier,
    expires_at: expiresAt,
  });
  if (stateInsert.error) return json({ error: "Could not initialize OAuth state" }, 500);

  const connectionUpsert = await db.from("portal_connections").upsert({
    organization_id: membership.organization_id,
    provider,
    status: "PENDING",
    connected_by: user.id,
    last_error: null,
    updated_at: now.toISOString(),
  }, { onConflict: "organization_id,provider" });
  if (connectionUpsert.error) return json({ error: "Could not initialize portal connection" }, 500);

  const authorizationUrl = new URL("https://auth.mercadolibre.com.uy/authorization");
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", mercadoLibreClientId);
  authorizationUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return json({ ok: true, authorization_url: authorizationUrl.toString(), redirect_uri: callbackUrl });
});
