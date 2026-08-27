import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const mercadoLibreClientId = Deno.env.get("MERCADOLIBRE_CLIENT_ID") || "";
const mercadoLibreClientSecret = Deno.env.get("MERCADOLIBRE_CLIENT_SECRET") || "";
const appUrl = (Deno.env.get("REVSCALE_APP_URL") || "https://revscale-systems-eta.vercel.app").replace(/\/$/, "");

function redirectResult(code: string) {
  const url = new URL("/protected/settings/integrations", appUrl);
  url.searchParams.set("portal", "mercadolibre");
  url.searchParams.set("result", code);
  return Response.redirect(url.toString(), 302);
}

async function sha256Hex(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  if (!supabaseUrl || !serviceRoleKey || !mercadoLibreClientId || !mercadoLibreClientSecret) return redirectResult("provider_not_configured");

  const requestUrl = new URL(req.url);
  const code = String(requestUrl.searchParams.get("code") || "").trim();
  const state = String(requestUrl.searchParams.get("state") || "").trim();
  const providerError = String(requestUrl.searchParams.get("error") || "").trim();
  if (providerError) return redirectResult("authorization_denied");
  if (!code || !state) return redirectResult("invalid_callback");

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const stateHash = await sha256Hex(state);
  const { data: oauthState } = await db
    .from("portal_oauth_states")
    .select("id,organization_id,user_id,code_verifier,expires_at,consumed_at")
    .eq("state_hash", stateHash)
    .eq("provider", "MERCADOLIBRE")
    .maybeSingle();

  if (!oauthState || oauthState.consumed_at || new Date(oauthState.expires_at).getTime() <= Date.now()) return redirectResult("invalid_state");

  const consumedAt = new Date().toISOString();
  const consume = await db.from("portal_oauth_states")
    .update({ consumed_at: consumedAt })
    .eq("id", oauthState.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (consume.error || !consume.data) return redirectResult("invalid_state");

  const callbackUrl = `${supabaseUrl}/functions/v1/portal-auth-callback`;
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: mercadoLibreClientId,
    client_secret: mercadoLibreClientSecret,
    code,
    redirect_uri: callbackUrl,
    code_verifier: oauthState.code_verifier,
  });

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: form,
    });
  } catch {
    await db.from("portal_connections").update({ status: "ERROR", last_error: "No se pudo contactar al proveedor OAuth.", updated_at: consumedAt })
      .eq("organization_id", oauthState.organization_id).eq("provider", "MERCADOLIBRE");
    return redirectResult("token_exchange_failed");
  }

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload?.access_token || !tokenPayload?.refresh_token) {
    await db.from("portal_connections").update({ status: "ERROR", last_error: "Mercado Libre rechazó el intercambio de autorización.", updated_at: consumedAt })
      .eq("organization_id", oauthState.organization_id).eq("provider", "MERCADOLIBRE");
    return redirectResult("token_exchange_failed");
  }

  const accessToken = String(tokenPayload.access_token);
  let account: Record<string, unknown> = {};
  try {
    const meResponse = await fetch("https://api.mercadolibre.com/users/me", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!meResponse.ok) return redirectResult("account_validation_failed");
    account = await meResponse.json().catch(() => ({}));
  } catch {
    return redirectResult("account_validation_failed");
  }

  const externalAccountId = String(account.id || tokenPayload.user_id || "").trim();
  if (!externalAccountId) return redirectResult("account_validation_failed");
  const externalAccountName = String(account.nickname || account.first_name || `Cuenta ${externalAccountId}`).slice(0, 200);
  const expiresIn = Math.max(60, Number(tokenPayload.expires_in || 21600));
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const scopes = String(tokenPayload.scope || "").split(/\s+/).filter(Boolean);

  const connectionResult = await db.from("portal_connections").upsert({
    organization_id: oauthState.organization_id,
    provider: "MERCADOLIBRE",
    status: "CONNECTED",
    external_account_id: externalAccountId,
    external_account_name: externalAccountName,
    scopes,
    token_expires_at: tokenExpiresAt,
    connected_at: consumedAt,
    last_error: null,
    connected_by: oauthState.user_id,
    updated_at: consumedAt,
  }, { onConflict: "organization_id,provider" }).select("id").single();

  if (connectionResult.error || !connectionResult.data?.id) return redirectResult("connection_save_failed");

  const secret = {
    access_token: accessToken,
    refresh_token: String(tokenPayload.refresh_token),
    token_type: String(tokenPayload.token_type || "bearer"),
    expires_at: tokenExpiresAt,
    scope: String(tokenPayload.scope || ""),
    user_id: externalAccountId,
  };
  const secretResult = await db.rpc("set_portal_connection_secret", {
    p_connection_id: connectionResult.data.id,
    p_secret: secret,
  });
  if (secretResult.error) {
    await db.from("portal_connections").update({ status: "ERROR", last_error: "No se pudieron guardar las credenciales cifradas.", updated_at: new Date().toISOString() }).eq("id", connectionResult.data.id);
    return redirectResult("credential_save_failed");
  }

  return redirectResult("connected");
});
