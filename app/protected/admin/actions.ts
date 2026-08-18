"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  return supabase;
}

export async function activatePlan(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  if (!requestId) throw new Error("Solicitud inválida");

  const supabase = await requirePlatformAdmin();

  const { error } = await supabase.rpc("platform_admin_activate_plan_request", {
    p_request_id: requestId,
  });

  if (error) {
    const message = error.message || "No se pudo activar la solicitud.";
    redirect(`/protected/admin?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/protected/admin");
  revalidatePath("/protected/billing");
  redirect("/protected/admin?success=Plan activado correctamente");
}

export async function rejectPlan(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  if (!requestId) throw new Error("Solicitud inválida");

  const supabase = await requirePlatformAdmin();

  const { error } = await supabase
    .from("plan_requests")
    .update({ status: "REJECTED" })
    .eq("id", requestId)
    .eq("status", "PENDING");

  if (error) {
    redirect(`/protected/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/protected/admin");
  redirect("/protected/admin?success=Solicitud rechazada");
}
