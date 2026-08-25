import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const paddleApiKey = Deno.env.get("PADDLE_API_KEY") || "";
const paddleEnvironment = (Deno.env.get("PADDLE_ENV") || "production").toLowerCase();
const paddleApiBase = paddleEnvironment === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !paddleApiKey) {
    return json({ error: "Subscription changes are not activated" }, 503);
  }

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  let requestId = "";
  try {
    const body = await req.json();
    requestId = String(body?.request_id || "");
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "Invalid request" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: change, error: changeError } = await admin
    .from("subscription_change_requests")
    .select("id,organization_id,requested_by,to_plan,to_billing_cycle,provider_subscription_id,status")
    .eq("id", requestId)
    .eq("requested_by", user.id)
    .maybeSingle();
  if (changeError || !change) return json({ error: "Change request not found" }, 404);
  if (change.status !== "PENDING") return json({ error: "Change request is not pending" }, 409);

  const { data: ownerMembership } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", change.organization_id)
    .eq("user_id", user.id)
    .eq("role", "OWNER")
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!ownerMembership) return json({ error: "Only the Director can change the subscription" }, 403);

  const { data: targetPrice } = await admin
    .from("billing_price_catalog")
    .select("paddle_price_id")
    .eq("plan", change.to_plan)
    .eq("billing_cycle", change.to_billing_cycle)
    .eq("active", true)
    .maybeSingle();
  if (!targetPrice?.paddle_price_id) return json({ error: "Target price is not configured" }, 503);

  const { data: catalog } = await admin
    .from("billing_price_catalog")
    .select("paddle_price_id")
    .eq("active", true)
    .not("paddle_price_id", "is", null);
  const basePriceIds = new Set((catalog || []).map((row) => row.paddle_price_id).filter(Boolean));

  const subscriptionResponse = await fetch(`${paddleApiBase}/subscriptions/${encodeURIComponent(change.provider_subscription_id)}`, {
    headers: { Authorization: `Bearer ${paddleApiKey}`, Accept: "application/json" },
  });
  if (!subscriptionResponse.ok) {
    return json({ error: "Could not read the current Paddle subscription" }, 502);
  }

  const subscriptionPayload = await subscriptionResponse.json();
  const currentItems = Array.isArray(subscriptionPayload?.data?.items) ? subscriptionPayload.data.items : [];
  const items: Array<{ price_id: string; quantity?: number }> = [];
  let replacedBasePlan = false;

  for (const item of currentItems) {
    const priceId = String(item?.price?.id || "");
    if (!priceId) continue;
    if (basePriceIds.has(priceId)) {
      if (!replacedBasePlan) {
        items.push({ price_id: targetPrice.paddle_price_id, quantity: Number(item?.quantity || 1) });
        replacedBasePlan = true;
      }
      continue;
    }
    items.push({ price_id: priceId, quantity: Number(item?.quantity || 1) });
  }

  if (!replacedBasePlan) {
    return json({ error: "The current RevScale plan item could not be identified" }, 409);
  }

  const { error: processingError } = await admin
    .from("subscription_change_requests")
    .update({ status: "PROCESSING", error_text: null })
    .eq("id", change.id)
    .eq("status", "PENDING");
  if (processingError) return json({ error: "Could not start the subscription change" }, 500);

  const updateResponse = await fetch(`${paddleApiBase}/subscriptions/${encodeURIComponent(change.provider_subscription_id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${paddleApiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      items,
      proration_billing_mode: "prorated_immediately",
      on_payment_failure: "prevent_change",
    }),
  });

  if (!updateResponse.ok) {
    const text = (await updateResponse.text()).slice(0, 400);
    await admin
      .from("subscription_change_requests")
      .update({ status: "FAILED", processed_at: new Date().toISOString(), error_text: `Paddle ${updateResponse.status}: ${text}` })
      .eq("id", change.id);
    return json({ error: "Paddle rejected the subscription change" }, 502);
  }

  return json({ ok: true, status: "PROCESSING", request_id: change.id }, 202);
});
