"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";

async function requireOwnerContext() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.role !== "OWNER") redirect("/protected");
  return context;
}

export async function assignInitialLeads(formData: FormData) {
  const { supabase, organizationId } = await requireOwnerContext();
  const memberUserId = String(formData.get("member_user_id") || "").trim();
  if (!memberUserId) throw new Error("Seleccioná un responsable.");

  const { data: member } = await supabase
    .from("organization_members")
    .select("user_id,team_id,role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", memberUserId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!member) throw new Error("El responsable no pertenece a la organización.");

  const { error } = await supabase
    .from("leads")
    .update({
      assigned_to: member.user_id,
      assigned_at: new Date().toISOString(),
      team_id: member.team_id || null,
    })
    .eq("organization_id", organizationId)
    .is("assigned_to", null);

  if (error) throw new Error(error.message);

  revalidatePath("/protected/onboarding");
  revalidatePath("/protected/leads");
  revalidatePath("/protected/pipeline");
  revalidatePath("/protected/today");
}

export async function completeOnboarding() {
  const { supabase, organizationId } = await requireOwnerContext();

  const [
    { data: organization },
    { count: leadsCount },
    { count: propertiesCount },
    { count: activeMembersCount },
    { count: assignedLeadsCount },
  ] = await Promise.all([
    supabase.from("organizations").select("id").eq("id", organizationId).maybeSingle(),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "ACTIVE"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).not("assigned_to", "is", null),
  ]);

  const leadTotal = leadsCount || 0;
  const multiUser = (activeMembersCount || 0) > 1;
  const ready = Boolean(organization?.id) && leadTotal > 0 && (propertiesCount || 0) > 0 && (!multiUser || (assignedLeadsCount || 0) === leadTotal);

  if (!ready) throw new Error("Todavía faltan pasos obligatorios del onboarding.");

  const { error } = await supabase.from("organization_onboarding").upsert(
    { organization_id: organizationId, completed: true },
    { onConflict: "organization_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/protected");
  revalidatePath("/protected/onboarding");
  redirect("/protected");
}
