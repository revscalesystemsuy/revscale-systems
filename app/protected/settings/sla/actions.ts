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

  if (!membership || membership.role !== "OWNER") {
    throw new Error("Solo Dirección puede modificar el SLA de la organización.");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("organization_id", membership.organization_id)
    .single();

  const isEnterprise = upper(subscription?.plan) === "ENTERPRISE" && upper(subscription?.status) === "ACTIVE";
  const firstHumanResponseMinutes = Number(formData.get("first_human_response_minutes"));
  const warningMinutesBefore = Number(formData.get("warning_minutes_before"));
  const escalationMinutesAfter = Number(formData.get("escalation_minutes_after"));
  const reassignmentMinutesAfter = Number(formData.get("reassignment_minutes_after"));
  const isEnabled = formData.get("is_enabled") === "on";
  const autoReassignOnBreach = formData.get("auto_reassign_on_breach") === "on";

  if (!Number.isInteger(firstHumanResponseMinutes) || firstHumanResponseMinutes < 1 || firstHumanResponseMinutes > 1440) throw new Error("Tiempo objetivo inválido.");
  if (!Number.isInteger(warningMinutesBefore) || warningMinutesBefore < 0 || warningMinutesBefore > 120) throw new Error("Alerta preventiva inválida.");
  if (!Number.isInteger(escalationMinutesAfter) || escalationMinutesAfter < 0 || escalationMinutesAfter > 1440) throw new Error("Escalamiento inválido.");
  if (!Number.isInteger(reassignmentMinutesAfter) || reassignmentMinutesAfter < 0 || reassignmentMinutesAfter > 1440) throw new Error("Tiempo de reasignación inválido.");
  if (warningMinutesBefore >= firstHumanResponseMinutes) throw new Error("La alerta preventiva debe ocurrir antes del vencimiento.");
  if (reassignmentMinutesAfter < escalationMinutesAfter) throw new Error("La reasignación debe ocurrir después del escalamiento.");
  if (autoReassignOnBreach && !isEnterprise) throw new Error("La reasignación automática por SLA está disponible en Enterprise.");

  const { error } = await supabase
    .from("organization_sla_settings")
    .upsert({
      organization_id: membership.organization_id,
      is_enabled: isEnabled,
      first_human_response_minutes: firstHumanResponseMinutes,
      warning_minutes_before: warningMinutesBefore,
      escalation_minutes_after: escalationMinutesAfter,
      reassignment_minutes_after: reassignmentMinutesAfter,
      auto_reassign_on_breach: isEnterprise ? autoReassignOnBreach : false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });

  if (error) throw new Error(error.message);
  revalidatePath("/protected/settings/sla");
  revalidatePath("/protected/settings");
  revalidatePath("/protected/leads");
}

function upper(value?: string | null) {
  return String(value || "").toUpperCase();
}
