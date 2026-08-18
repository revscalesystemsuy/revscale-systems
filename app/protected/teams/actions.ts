"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentPlanHasFeature } from "@/lib/plan-access";

async function getEnterpriseManagerContext() {
  const allowed = await currentPlanHasFeature("enterprise_operations");
  if (!allowed) throw new Error("Esta función requiere Enterprise.");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Sesión inválida.");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    throw new Error("No tenés permisos para administrar equipos.");
  }

  return {
    organizationId: membership.organization_id,
    role: membership.role,
    admin: createAdminClient(),
  };
}

export async function createTeam(formData: FormData) {
  const { organizationId, admin } = await getEnterpriseManagerContext();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const zones = String(formData.get("zones") || "")
    .split(",")
    .map((zone) => zone.trim())
    .filter(Boolean);

  if (!name) throw new Error("Ingresá un nombre para el equipo.");

  const { error } = await admin.from("teams").insert({
    organization_id: organizationId,
    name,
    description: description || null,
    zones,
    auto_assign: true,
    is_active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/protected/teams");
}

export async function updateMemberTeam(formData: FormData) {
  const { organizationId, admin } = await getEnterpriseManagerContext();
  const memberId = String(formData.get("member_id") || "");
  const teamId = String(formData.get("team_id") || "");

  const { error } = await admin
    .from("organization_members")
    .update({ team_id: teamId || null })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/protected/teams");
}

export async function updateMemberRole(formData: FormData) {
  const { organizationId, role, admin } = await getEnterpriseManagerContext();
  if (role !== "OWNER") throw new Error("Solo el Director puede cambiar roles.");

  const memberId = String(formData.get("member_id") || "");
  const nextRole = String(formData.get("role") || "").toUpperCase();

  if (!["OWNER", "MANAGER", "AGENT"].includes(nextRole)) {
    throw new Error("Rol inválido.");
  }

  const { error } = await admin
    .from("organization_members")
    .update({ role: nextRole })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/protected/teams");
}
