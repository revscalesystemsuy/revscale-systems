"use server";

import { revalidatePath } from "next/cache";
import { currentPlanHasFeature } from "@/lib/plan-access";
import { requireEnterpriseRole } from "@/lib/organization-role";

async function getEnterpriseManagerContext() {
  const allowed = await currentPlanHasFeature("enterprise_operations");
  if (!allowed) throw new Error("Esta función requiere Enterprise.");
  return requireEnterpriseRole(["OWNER", "MANAGER"]);
}

function parseZones(value: FormDataEntryValue | null) {
  return String(value || "").split(",").map((zone) => zone.trim()).filter(Boolean);
}

export async function createTeam(formData: FormData) {
  const { organizationId, role, supabase } = await getEnterpriseManagerContext();
  if (role !== "OWNER") throw new Error("Solo el Director puede crear equipos o sucursales.");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const zones = parseZones(formData.get("zones"));
  if (!name) throw new Error("Ingresá un nombre para el equipo.");

  const { error } = await supabase.from("teams").insert({
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
  const { organizationId, role, teamId: managerTeamId, supabase } = await getEnterpriseManagerContext();
  const teamId = String(formData.get("team_id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const zones = parseZones(formData.get("zones"));
  const autoAssign = String(formData.get("auto_assign") || "false") === "true";
  const isActive = String(formData.get("is_active") || "false") === "true";

  if (!teamId || !name) throw new Error("Datos de equipo inválidos.");
  if (role === "MANAGER" && teamId !== managerTeamId) throw new Error("Solo podés editar tu propio equipo.");

  const { error } = await supabase.from("teams").update({
    name,
    description: description || null,
    zones,
    auto_assign: autoAssign,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }).eq("id", teamId).eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/protected/teams");
}

export async function deleteTeam(formData: FormData) {
  const { organizationId, role, supabase } = await getEnterpriseManagerContext();
  if (role !== "OWNER") throw new Error("Solo el Director puede eliminar equipos.");

  const teamId = String(formData.get("team_id") || "");
  if (!teamId) throw new Error("Equipo inválido.");

  const { data: team } = await supabase.from("teams").select("id,name").eq("id", teamId).eq("organization_id", organizationId).maybeSingle();
  if (!team) throw new Error("Equipo no encontrado.");
  if (team.name === "Equipo Principal") throw new Error("El Equipo Principal no se puede eliminar.");

  const [{ count: membersCount }, { count: leadsCount }] = await Promise.all([
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("team_id", teamId),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("team_id", teamId),
  ]);

  if ((membersCount || 0) > 0 || (leadsCount || 0) > 0) throw new Error("Mové primero los agentes y leads de este equipo antes de eliminarlo.");

  const { error } = await supabase.from("teams").delete().eq("id", teamId).eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  revalidatePath("/protected/teams");
}

export async function updateMemberTeam(formData: FormData) {
  const { role, supabase } = await getEnterpriseManagerContext();
  if (role !== "OWNER") throw new Error("Solo el Director puede mover personas entre equipos.");

  const memberId = String(formData.get("member_id") || "");
  const teamId = String(formData.get("team_id") || "") || null;
  if (!memberId) throw new Error("Miembro inválido.");

  const { error } = await supabase.rpc("update_organization_member", {
    p_member_id: memberId,
    p_role: null,
    p_status: null,
    p_team_id: teamId,
    p_set_team: true,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/protected/teams");
  revalidatePath("/protected/agents");
}

export async function updateMemberRole(formData: FormData) {
  const { role, supabase } = await getEnterpriseManagerContext();
  if (role !== "OWNER") throw new Error("Solo el Director puede cambiar roles.");

  const memberId = String(formData.get("member_id") || "");
  const nextRole = String(formData.get("role") || "").toUpperCase();
  if (!memberId || !["OWNER", "MANAGER", "AGENT"].includes(nextRole)) throw new Error("Rol inválido.");

  const { error } = await supabase.rpc("update_organization_member", {
    p_member_id: memberId,
    p_role: nextRole,
    p_status: null,
    p_team_id: null,
    p_set_team: false,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/protected/teams");
  revalidatePath("/protected/agents");
}
