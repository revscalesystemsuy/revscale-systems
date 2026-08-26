"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

function text(value: FormDataEntryValue | null, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function nullableText(value: FormDataEntryValue | null, max = 500) {
  const result = text(value, max);
  return result || null;
}

function positiveInt(value: FormDataEntryValue | null, fallback: number, max = 10000) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), max) : fallback;
}

async function requireTerritoryContext() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.subscriptionStatus !== "ACTIVE" || !planHasFeature(context.plan, "territory_acquisition")) redirect("/protected/billing");
  return context;
}

export async function createTerritory(formData: FormData) {
  const context = await requireTerritoryContext();
  if (!["OWNER", "MANAGER"].includes(context.role)) redirect("/protected/territories");

  const name = text(formData.get("name"), 120);
  if (!name) return;
  const teamId = nullableText(formData.get("team_id"), 64);
  if (context.role === "MANAGER" && teamId !== context.teamId) return;

  const zones = text(formData.get("zones"), 600)
    .split(",")
    .map((zone) => zone.trim())
    .filter(Boolean)
    .slice(0, 20);

  await context.supabase.from("territories").insert({
    organization_id: context.organizationId,
    name,
    department: nullableText(formData.get("department"), 100),
    city: nullableText(formData.get("city"), 100),
    zones,
    team_id: teamId,
    description: nullableText(formData.get("description"), 1000),
    priority: ["STANDARD", "HIGH", "STRATEGIC"].includes(text(formData.get("priority"))) ? text(formData.get("priority")) : "STANDARD",
    monthly_prospect_target: positiveInt(formData.get("monthly_prospect_target"), 20),
    monthly_contact_target: positiveInt(formData.get("monthly_contact_target"), 40),
    monthly_listing_target: positiveInt(formData.get("monthly_listing_target"), 4),
    inactivity_days: Math.min(Math.max(positiveInt(formData.get("inactivity_days"), 7, 60), 1), 60),
    created_by: context.userId,
  });
  revalidatePath("/protected/territories");
}

export async function assignTerritoryAgent(formData: FormData) {
  const context = await requireTerritoryContext();
  if (!["OWNER", "MANAGER"].includes(context.role)) return;
  const territoryId = text(formData.get("territory_id"), 64);
  const userId = text(formData.get("user_id"), 64);
  if (!territoryId || !userId) return;

  const { data: territory } = await context.supabase.from("territories").select("id,team_id").eq("id", territoryId).eq("organization_id", context.organizationId).maybeSingle();
  if (!territory || (context.role === "MANAGER" && territory.team_id !== context.teamId)) return;

  await context.supabase.from("territory_assignments").upsert({
    organization_id: context.organizationId,
    territory_id: territoryId,
    user_id: userId,
    assignment_role: text(formData.get("assignment_role")) === "SUPPORT" ? "SUPPORT" : "PRIMARY",
    is_active: true,
    created_by: context.userId,
  }, { onConflict: "territory_id,user_id" });
  revalidatePath("/protected/territories");
}

export async function createAcquisitionProspect(formData: FormData) {
  const context = await requireTerritoryContext();
  const territoryId = text(formData.get("territory_id"), 64);
  const assignedTo = nullableText(formData.get("assigned_to"), 64) || (context.role === "AGENT" ? context.userId : null);
  const ownerName = text(formData.get("owner_name"), 160);
  const address = text(formData.get("address"), 240);
  if (!territoryId || !ownerName || !address) return;

  await context.supabase.from("acquisition_prospects").insert({
    organization_id: context.organizationId,
    territory_id: territoryId,
    assigned_to: assignedTo,
    owner_name: ownerName,
    owner_phone: nullableText(formData.get("owner_phone"), 80),
    owner_email: nullableText(formData.get("owner_email"), 180),
    address,
    zone: nullableText(formData.get("zone"), 120),
    property_type: nullableText(formData.get("property_type"), 80),
    intended_operation: ["SALE", "RENT", "BOTH"].includes(text(formData.get("intended_operation"))) ? text(formData.get("intended_operation")) : "SALE",
    source: ["DOOR_KNOCKING", "REFERRAL", "PORTAL", "SOCIAL", "DATABASE", "SIGN", "OWNER_INBOUND", "OTHER"].includes(text(formData.get("source"))) ? text(formData.get("source")) : "OTHER",
    temperature: ["COLD", "WARM", "HOT"].includes(text(formData.get("temperature"))) ? text(formData.get("temperature")) : "WARM",
    notes: nullableText(formData.get("notes"), 2000),
    next_action_at: nullableText(formData.get("next_action_at"), 64),
    created_by: context.userId,
  });
  revalidatePath("/protected/territories");
}

export async function updateProspectStage(formData: FormData) {
  const context = await requireTerritoryContext();
  const prospectId = text(formData.get("prospect_id"), 64);
  const status = text(formData.get("status"));
  const allowed = ["IDENTIFIED", "CONTACTED", "QUALIFIED", "VALUATION", "PROPOSAL", "WON", "LOST"];
  if (!prospectId || !allowed.includes(status)) return;

  const patch: Record<string, string | null> = { status };
  if (status === "LOST") patch.loss_reason = nullableText(formData.get("loss_reason"), 500);
  await context.supabase.from("acquisition_prospects").update(patch).eq("id", prospectId).eq("organization_id", context.organizationId);
  revalidatePath("/protected/territories");
}

export async function addAcquisitionActivity(formData: FormData) {
  const context = await requireTerritoryContext();
  const prospectId = text(formData.get("prospect_id"), 64);
  const note = text(formData.get("note"), 2000);
  const activityType = text(formData.get("activity_type"));
  const allowed = ["CALL", "WHATSAPP", "EMAIL", "VISIT", "VALUATION", "PROPOSAL", "NOTE"];
  if (!prospectId || !note || !allowed.includes(activityType)) return;

  await context.supabase.from("acquisition_activities").insert({
    organization_id: context.organizationId,
    prospect_id: prospectId,
    activity_type: activityType,
    note,
    outcome: nullableText(formData.get("outcome"), 500),
    next_action_at: nullableText(formData.get("next_action_at"), 64),
    created_by: context.userId,
  });
  revalidatePath("/protected/territories");
}

export async function convertProspectToProperty(formData: FormData) {
  const context = await requireTerritoryContext();
  const prospectId = text(formData.get("prospect_id"), 64);
  if (!prospectId) return;

  const { data: prospect } = await context.supabase
    .from("acquisition_prospects")
    .select("id,owner_name,address,zone,property_type,intended_operation,estimated_value,currency,notes,status,converted_property_id")
    .eq("id", prospectId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (!prospect || prospect.converted_property_id) return;

  const operation = prospect.intended_operation === "RENT" ? "RENT" : "SALE";
  const { data: property, error } = await context.supabase.from("properties").insert({
    organization_id: context.organizationId,
    title: `${prospect.property_type || "Propiedad"} · ${prospect.zone || prospect.address}`,
    property_type: prospect.property_type || "Otro",
    operation,
    zone: prospect.zone || "",
    address: prospect.address,
    price: prospect.estimated_value || 0,
    currency: prospect.currency || "USD",
    status: "AVAILABLE",
    description: prospect.notes || `Captación ganada · propietario: ${prospect.owner_name}`,
  }).select("id").single();
  if (error || !property) return;

  await context.supabase.from("acquisition_prospects").update({ status: "WON", converted_property_id: property.id }).eq("id", prospectId).eq("organization_id", context.organizationId);
  revalidatePath("/protected/territories");
  revalidatePath("/protected/properties");
}
