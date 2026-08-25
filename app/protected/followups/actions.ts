"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeFollowup(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("followups")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("lead_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Seguimiento no encontrado o sin acceso");

  revalidatePath("/protected/followups");
  revalidatePath("/protected/today");
  revalidatePath("/protected/pipeline");
  revalidatePath("/protected/executive");
  revalidatePath("/protected/notifications");
  if (data.lead_id) revalidatePath(`/protected/leads/${data.lead_id}`);
}
