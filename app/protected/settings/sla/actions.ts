"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSlaSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Usuario no autenticado");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    throw new Error("No tenés permisos para modificar el SLA.");
  }

  const firstHumanResponseMinutes = Number(formData.get("first_human_response_minutes"));
  const warningMinutesBefore = Number(formData.get("warning_minutes_before"));
  const escalationMinutesAfter = Number(formData.get("escalation_minutes_after"));
  const isEnabled = formData.get("is_enabled") === "on";

  if (!Number.isInteger(firstHumanResponseMinutes) || firstHumanResponseMinutes < 1 || firstHumanResponseMinutes > 1440) throw new Error("Tiempo objetivo inválido.");
  if (!Number.isInteger(warningMinutesBefore) || warningMinutesBefore < 0 || warningMinutesBefore > 120) throw new Error("Alerta preventiva inválida.");
  if (!Number.isInteger(escalationMinutesAfter) || escalationMinutesAfter < 0 || escalationMinutesAfter > 1440) throw new Error("Escalamiento inválido.");
  if (warningMinutesBefore >= firstHumanResponseMinutes) throw new Error("La alerta preventiva debe ocurrir antes del vencimiento.");

  const { error } = await supabase
    .from("organization_sla_settings")
    .upsert({
      organization_id: membership.organization_id,
      is_enabled: isEnabled,
      first_human_response_minutes: firstHumanResponseMinutes,
      warning_minutes_before: warningMinutesBefore,
      escalation_minutes_after: escalationMinutesAfter,
      auto_reassign_on_breach: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });

  if (error) throw new Error(error.message);
  revalidatePath("/protected/settings/sla");
  revalidatePath("/protected/settings");
}
