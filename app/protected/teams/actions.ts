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
    .select("organization_id,role,team_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    throw new Error("No tenés permisos para administrar equipos.");
  }

  return {
    userId,
    organizationId: membership.organization_id,
    role: membership.role,
    teamId: membership.team_id,
    admin: createAdminClient(),
  };
}

function parseZones(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((zone) => zone.trim())
    .filter(Boolean);
}

export async function createTeam(formData: FormData) {
  const { organizationId, admin } = await getEnterpriseManagerContext();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const zones = parseZones(formData.get("zones"));

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

export async function updateTeam(formData: FormData) {
  const { organizationId, admin } = await getEnterpriseManagerContext();

  const teamId = String(formData.get("team_id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const zones = parseZones(formData.get("zones"));
  const autoAssign = String(formData.get("auto_assign") || "false") === "true";
  const isActive = String(formData.get("is_active") || "false") === "true";

  if (!teamId || !name) throw new Error("Datos de equipo inválidos.");

  const { error } = await admin
    .from("teams")
    .update({
      name,
      description: description || null,
      zones,
      auto_assign: autoAssign,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teamId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/protected/teams");
}

export async function deleteTeam(formData: FormData) {
  const { organizationId, role, admin } = await getEnterpriseManagerContext();
  if (role !== "OWNER") throw new Error("Solo el Director puede eliminar equipos.");

  const teamId = String(formData.get("team_id") || "");
  if (!teamId) throw new Error("Equipo inválido.");

  const { data: team } = await admin
    .from("teams")
    .select("id,name")
    .eq("id", teamId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!team) throw new Error("Equipo no encontrado.");
  if (team.name === "Equipo Principal") {
    throw new Error("El Equipo Principal no se puede eliminar.");
  }

  const [{ count: membersCount }, { count: leadsCount }] = await Promise.all([
    admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("team_id", teamId),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("team_id", teamId),
  ]);

  if ((membersCount || 0) > 0 || (leadsCount || 0) > 0) {
    throw new Error("Mové primero los agentes y leads de este equipo antes de eliminarlo.");
  }

  const { error } = await admin
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/protected/teams");
}

export async function updateMemberTeam(formData: FormData) {
  const { organizationId, admin } = await getEnterpriseManagerContext();
  const memberId = String(formData.get("member_id") || "");
  const teamId = String(formData.get("team_id") || "");

  if (teamId) {
    const { data: team } = await admin
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!team) throw new Error("El equipo seleccionado no pertenece a esta organización.");
  }

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
