import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const appId = Deno.env.get("META_APP_ID") || "1550241886783400";
const appSecret = Deno.env.get("META_APP_SECRET") || "";
const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") || "v23.0";
const redirectUri = Deno.env.get("META_EMBEDDED_SIGNUP_REDIRECT_URI") || "https://revscale-systems-eta.vercel.app/protected/settings/whatsapp";

type AnyRow = Record<string, any>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function graph(path: string, token?: string, init?: RequestInit) {
  const response = await fetch(`https://graph.facebook.com/${graphVersion}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const message = String(data?.error?.message || `Meta request failed (${response.status})`).slice(0, 400);
    const error = new Error(message) as Error & { code?: string };
    error.code = String(data?.error?.code || response.status);
    throw error;
  }
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!supabaseUrl || !serviceRoleKey || !appId || !appSecret) return json({ error: "Meta onboarding is not configured on RevScale" }, 503);

  const authorization = req.headers.get("authorization") || "";
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await db.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const payload = await req.json().catch(() => ({}));
  const code = String(payload?.code || "").trim();
  const wabaId = String(payload?.waba_id || "").trim();
  const requestedPhoneId = String(payload?.phone_number_id || "").trim();
  if (!code || !wabaId) return json({ error: "Embedded Signup did not return the required Meta assets" }, 400);
  if (code.length > 2000 || !/^\d+$/.test(wabaId) || (requestedPhoneId && !/^\d+$/.test(requestedPhoneId))) return json({ error: "Invalid Meta onboarding payload" }, 400);

  const { data: memberships, error: membershipError } = await db
    .from("organization_members")
    .select("organization_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .eq("role", "OWNER");
  if (membershipError || !memberships?.length) return json({ error: "Owner access required" }, 403);

  const requestedOrganizationId = String(payload?.organization_id || "").trim();
  const membership = requestedOrganizationId
    ? memberships.find((item: AnyRow) => item.organization_id === requestedOrganizationId)
    : memberships.length === 1 ? memberships[0] : null;
  if (!membership) return json({ error: "Could not resolve the RevScale organization" }, 403);
  const organizationId = membership.organization_id;

  const { data: subscription } = await db.from("subscriptions").select("plan,status").eq("organization_id", organizationId).maybeSingle();
  const plan = String(subscription?.plan || "").toUpperCase();
  if (String(subscription?.status || "").toUpperCase() !== "ACTIVE" || !["PRO","PROFESSIONAL","ENTERPRISE"].includes(plan)) {
    return json({ error: "WhatsApp is not available on this plan" }, 403);
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      client_secret: appSecret,
      code,
    });
    const tokenPayload = await graph(`/oauth/access_token?${tokenParams.toString()}`);
    const accessToken = String(tokenPayload?.access_token || "");
    if (!accessToken) throw new Error("Meta did not return an access token");

    const waba = await graph(`/${encodeURIComponent(wabaId)}?fields=id,name,phone_numbers`, accessToken);
    const phones = Array.isArray(waba?.phone_numbers?.data) ? waba.phone_numbers.data : [];
    let phoneId = requestedPhoneId;
    if (phoneId && !phones.some((phone: AnyRow) => String(phone.id) === phoneId)) {
      return json({ error: "The selected phone number does not belong to the authorized WhatsApp Business Account" }, 400);
    }
    if (!phoneId && phones.length === 1) phoneId = String(phones[0].id || "");
    if (!phoneId) return json({ error: "Meta did not return a unique WhatsApp phone number. Select a phone number and connect again." }, 409);

    const phone = await graph(`/${encodeURIComponent(phoneId)}?fields=id,display_phone_number,verified_name,quality_rating`, accessToken);
    await graph(`/${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, { method: "POST" });

    const now = new Date().toISOString();
    const connection = await db.from("whatsapp_connections").upsert({
      organization_id: organizationId,
      status: "CONNECTED",
      waba_id: wabaId,
      phone_number_id: phoneId,
      display_phone_number: String(phone?.display_phone_number || "") || null,
      verified_name: String(phone?.verified_name || waba?.name || "WhatsApp Business").slice(0, 160),
      webhook_status: "PENDING",
      graph_api_version: graphVersion,
      quality_rating: String(phone?.quality_rating || "") || null,
      last_error: null,
      connected_at: now,
      updated_at: now,
    }, { onConflict: "organization_id" }).select("id").single();
    if (connection.error) throw connection.error;

    const stored = await db.rpc("store_whatsapp_provider_token", {
      p_organization_id: organizationId,
      p_access_token: accessToken,
      p_credential_source: "EMBEDDED_SIGNUP",
    });
    if (stored.error) throw stored.error;

    await db.from("whatsapp_ai_settings").upsert({
      organization_id: organizationId,
      mode: "PREPARATION",
      auto_reply_enabled: false,
      human_handoff_enabled: true,
      updated_by: user.id,
      updated_at: now,
    }, { onConflict: "organization_id" });

    return json({
      ok: true,
      organization_id: organizationId,
      connection_id: connection.data.id,
      waba_id: wabaId,
      phone_number_id: phoneId,
      display_phone_number: phone?.display_phone_number || null,
      verified_name: phone?.verified_name || waba?.name || null,
      webhook_status: "PENDING",
    });
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).slice(0, 400);
    await db.from("whatsapp_connections").upsert({
      organization_id: organizationId,
      status: "ERROR",
      waba_id: wabaId || null,
      phone_number_id: requestedPhoneId || null,
      webhook_status: "ERROR",
      last_error: `Meta onboarding: ${message}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    console.error("WhatsApp Embedded Signup failed", message);
    return json({ error: "No se pudo completar la conexión con Meta", provider_error: message }, 502);
  }
});
