"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireEnterpriseRole } from "@/lib/organization-role";

async function getManagerContext() {
  const context = await requireEnterpriseRole(["OWNER", "MANAGER"]);
  return { ...context, admin: createAdminClient() };
}

export async function inviteAgent(formData: FormData) {
  const { organizationId, role: currentRole, teamId, supabase, admin } = await getManagerContext();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const requestedRole = String(formData.get("role") || "AGENT").toUpperCase();

  if (!name || !email) throw new Error("Nombre y email son obligatorios.");

  const nextRole = currentRole === "OWNER" && ["OWNER", "MANAGER", "AGENT"].includes(requestedRole)
    ? requestedRole
    : "AGENT";

  if (currentRole === "MANAGER" && !teamId) {
    throw new Error("El Gerente debe pertenecer a un equipo para invitar agentes.");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("max_agents")
    .eq("organization_id", organizationId)
    .single();

  const { count: currentAgents } = await admin
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE");

  if (subscription && currentAgents !== null && currentAgents >= subscription.max_agents) {
    throw new Error("Tu plan alcanzó el límite de agentes activos.");
  }

  const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
    email,
    password: "Welcome123!",
    email_confirm: true,
  });

  if (userError || !createdUser.user) {
    throw new Error(userError?.message || "No se pudo crear usuario.");
  }

  const newUserId = createdUser.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: newUserId,
    full_name: name,
    phone: phone || null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(newUserId);
    throw new Error(profileError.message);
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: organizationId,
    user_id: newUserId,
    role: nextRole,
    status: "ACTIVE",
    team_id: currentRole === "MANAGER" ? teamId : null,
  });

  if (memberError) {
    await admin.auth.admin.deleteUser(newUserId);
    throw new Error(memberError.message);
  }

  revalidatePath("/protected/agents");
  revalidatePath("/protected/teams");
}

export async function updateAgent(formData: FormData) {
  const { organizationId, role: currentRole, teamId, admin } = await getManagerContext();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const requestedRole = String(formData.get("role") || "AGENT").toUpperCase();

  if (!id) throw new Error("Agente inválido.");

  const { data: member } = await admin
    .from("organization_members")
    .select("id,user_id,role,team_id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!member) throw new Error("No existe el agente.");

  if (currentRole === "MANAGER") {
    if (!teamId || member.team_id !== teamId || member.role === "OWNER" || member.role === "MANAGER") {
      throw new Error("Solo podés editar agentes de tu propio equipo.");
    }
  }

  const nextRole = currentRole === "OWNER" && ["OWNER", "MANAGER", "AGENT"].includes(requestedRole)
    ? requestedRole
    : member.role;

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: name, phone: phone || null })
    .eq("id", member.user_id);

  if (profileError) throw new Error(profileError.message);

  if (currentRole === "OWNER") {
    const { error: roleError } = await admin
      .from("organization_members")
      .update({ role: nextRole })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (roleError) throw new Error(roleError.message);
  }

  revalidatePath("/protected/agents");
  revalidatePath(`/protected/agents/${id}/edit`);
  revalidatePath("/protected/teams");
}

export async function toggleAgentStatus(formData: FormData) {
  const { organizationId, role: currentRole, teamId, supabase, admin } = await getManagerContext();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "").toUpperCase();

  if (!id || !["ACTIVE", "SUSPENDED"].includes(status)) throw new Error("Datos inválidos.");

  const { data: member } = await admin
    .from("organization_members")
    .select("id,role,team_id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!member) throw new Error("Agente no encontrado.");

  if (currentRole === "MANAGER") {
    if (!teamId || member.team_id !== teamId || member.role !== "AGENT") {
      throw new Error("Solo podés administrar agentes de tu propio equipo.");
    }
  }

  if (status === "ACTIVE") {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("max_agents")
      .eq("organization_id", organizationId)
      .single();

    const { count: activeAgents } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "ACTIVE");

    if (subscription && activeAgents !== null && activeAgents >= subscription.max_agents) {
      throw new Error("Tu plan no permite activar más agentes.");
    }
  }

  const { error } = await admin
    .from("organization_members")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/protected/agents");
  revalidatePath("/protected/teams");
}
