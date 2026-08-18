"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export async function activatePlan(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");

  if (!requestId) {
    throw new Error("Solicitud inválida");
  }

  const supabase = await createClient();

  const { data: request } = await supabase
    .from("plan_requests")
    .select("id,organization_id,plan")
    .eq("id", requestId)
    .single();

  if (!request) {
    throw new Error("Solicitud no encontrada");
  }

  const plan = normalizeRequestedPlan(String(request.plan));
  const limits = PLAN_LIMITS[plan];

  const { error: subscriptionError } = await supabase
    .from("subscriptions")
    .update({
      plan,
      status: "ACTIVE",
      ...limits,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", request.organization_id);

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  const { error: requestError } = await supabase
    .from("plan_requests")
    .update({ status: "ACTIVE" })
    .eq("id", requestId);

  if (requestError) {
    throw new Error(requestError.message);
  }

  revalidatePath("/protected/admin");
  revalidatePath("/protected/billing");
}

export async function rejectPlan(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");

  if (!requestId) {
    throw new Error("Solicitud inválida");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("plan_requests")
    .update({ status: "REJECTED" })
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/admin");
}
