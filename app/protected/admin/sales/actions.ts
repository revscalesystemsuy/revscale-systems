'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_BOOKED",
  "DEMO_COMPLETED",
  "PILOT_PROPOSED",
  "PILOT_ACTIVE",
  "PAID",
  "LOST",
] as const;

type Stage = (typeof STAGES)[number];

export async function updateB2BStage(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") || "").trim();
  const stage = String(formData.get("stage") || "").trim().toUpperCase() as Stage;

  if (!opportunityId || !STAGES.includes(stage)) {
    redirect("/protected/admin/sales?error=Etapa+oportunidad+inválida");
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!platformAdmin) redirect("/protected");

  const { error } = await supabase
    .from("b2b_opportunities")
    .update({ stage })
    .eq("id", opportunityId);

  if (error) {
    redirect(`/protected/admin/sales?error=${encodeURIComponent("No se pudo cambiar la etapa")}`);
  }

  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales?success=${encodeURIComponent("Etapa actualizada")}`);
}
