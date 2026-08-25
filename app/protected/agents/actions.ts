"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePeopleManager } from "@/lib/organization-role";

async function getManagerContext() {
  return requirePeopleManager();
}

export async function inviteAgent(formData: FormData) {
  const { role: currentRole, teamId, plan, supabase } = await getManagerContext();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const requestedRole = String(formData.get("role") || "AGENT").toUpperCase();
  const requestedTeamId = String(formData.get("team_id") || "").trim() || null;
  const returnTo = String(formData.get("return_to") || "") === "onboarding" ? "onboarding" : "";

  if (!name || !email) throw new Error("Nombre y email son obligatorios.");
  if (currentRole === "MANAGER" && !teamId) {
    throw new Error("El Gerente debe pertenecer a un equipo para invitar agentes.");
  }

  const enterprise = plan === "ENTERPRISE";
  const role = enterprise && currentRole === "OWNER" && ["OWNER", "MANAGER", "AGENT"].includes(requestedRole)
    ? requestedRole
    : "AGENT";

  const { error } = await supabase.functions.invoke("invite-organization-member", {
    body: {
      name,
      email,
      phone,
      role,
      team_id: enterprise ? (currentRole === "MANAGER" ? teamId : requestedTeamId) : null,
    },
  });

  if (error) throw new Error(error.message || "No se pudo enviar la invitación.");

  revalidatePath("/protected/agents");
  revalidatePath("/protected/teams");
  revalidatePath("/protected/onboarding");
  if (returnTo) redirect("/protected/onboarding");
}

export async function updateAgent(formData: FormData) {
  const { role: currentRole, plan, supabase } = await getManagerContext();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const requestedRole = String(formData.get("role") || "AGENT").toUpperCase();

  if (!id || !name) throw new Error("Agente inválido.");

  const { error: profileError } = await supabase.rpc("update_organization_member_profile", {
    p_member_id: id,
    p_full_name: name,
    p_phone: phone || null,
  });
  if (profileError) throw new Error(profileError.message);

  if (currentRole === "OWNER" && plan === "ENTERPRISE") {
    if (!["OWNER", "MANAGER", "AGENT"].includes(requestedRole)) throw new Error("Rol inválido.");
    const { error: roleError } = await supabase.rpc("update_organization_member", {
      p_member_id: id,
      p_role: requestedRole,
      p_status: null,
      p_team_id: null,
      p_set_team: false,
    });
    if (roleError) throw new Error(roleError.message);
  }

  revalidatePath("/protected/agents");
  revalidatePath(`/protected/agents/${id}/edit`);
  revalidatePath("/protected/teams");
}

export async function toggleAgentStatus(formData: FormData) {
  const { supabase } = await getManagerContext();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "").toUpperCase();
  if (!id || !["ACTIVE", "SUSPENDED"].includes(status)) throw new Error("Datos inválidos.");

  const { error } = await supabase.rpc("update_organization_member", {
    p_member_id: id,
    p_role: null,
    p_status: status,
    p_team_id: null,
    p_set_team: false,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/protected/agents");
  revalidatePath("/protected/teams");
}
