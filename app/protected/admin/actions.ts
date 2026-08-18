"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_LIMITS = {
  STARTER: {
    max_agents: 3,
    max_leads: 500,
    max_properties: 100,
  },
  PROFESSIONAL: {
    max_agents: 15,
    max_leads: 1000000,
    max_properties: 1000000,
  },
  ENTERPRISE: {
    max_agents: 1000000,
    max_leads: 1000000,
    max_properties: 1000000,
  },
} as const;

function normalizeRequestedPlan(plan: string) {
  const value = plan.toUpperCase();
  if (value === "PRO") return "PROFESSIONAL";
  if (value === "STARTER" || value === "PROFESSIONAL" || value === "ENTERPRISE") {
    return value;
  }
  throw new Error("Plan inválido");
}

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) throw new Error("Sesión inválida");

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!platformAdmin) throw new Error("Acceso no autorizado");

  return createAdminClient();
}

export async function activatePlan(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  if (!requestId) throw new Error("Solicitud inválida");

  const admin = await requirePlatformAdmin();

  const { data: request, error: requestFetchError } = await admin
    .from("plan_requests")
    .select("id,organization_id,plan,status")
    .eq("id", requestId)
    .single();

  if (requestFetchError || !request) throw new Error("Solicitud no encontrada");
  if (request.status !== "PENDING") throw new Error("La solicitud ya fue procesada");
  if (!request.organization_id) {
    throw new Error("La solicitud todavía no está vinculada a una organización.");
  }

  const plan = normalizeRequestedPlan(String(request.plan));
  const limits = PLAN_LIMITS[plan];

  const { data: updatedSubscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .update({
      plan,
      status: "ACTIVE",
      ...limits,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", request.organization_id)
    .select("id")
    .maybeSingle();

  if (subscriptionError) throw new Error(subscriptionError.message);
  if (!updatedSubscription) throw new Error("No se encontró la suscripción de la organización.");

  const { error: requestError } = await admin
    .from("plan_requests")
    .update({ status: "ACTIVE" })
    .eq("id", requestId);

  if (requestError) throw new Error(requestError.message);

  revalidatePath("/protected/admin");
  revalidatePath("/protected/billing");
}

export async function rejectPlan(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  if (!requestId) throw new Error("Solicitud inválida");

  const admin = await requirePlatformAdmin();

  const { error } = await admin
    .from("plan_requests")
    .update({ status: "REJECTED" })
    .eq("id", requestId)
    .eq("status", "PENDING");

  if (error) throw new Error(error.message);

  revalidatePath("/protected/admin");
}
