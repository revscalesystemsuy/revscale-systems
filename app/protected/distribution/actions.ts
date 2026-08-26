"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

const STATUSES = new Set(["DRAFT", "PUBLISHED", "PAUSED"]);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function requireDistributionManager() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!["OWNER", "MANAGER"].includes(context.role)) {
    throw new Error("Solo Dirección o Gerencia puede administrar publicaciones.");
  }
  if (!planHasFeature(context.plan, "property_distribution")) {
    throw new Error("Distribución de propiedades requiere Professional o Enterprise.");
  }
  return context;
}

export async function saveWebPublication(formData: FormData) {
  const context = await requireDistributionManager();
  const propertyId = String(formData.get("property_id") || "").trim();
  const status = String(formData.get("status") || "DRAFT").toUpperCase();
  if (!propertyId) throw new Error("Propiedad inválida.");
  if (!STATUSES.has(status)) throw new Error("Estado de publicación inválido.");

  const [{ data: property, error: propertyError }, { data: organization, error: organizationError }] = await Promise.all([
    context.supabase
      .from("properties")
      .select("id,title,property_type,operation,zone,address,price,currency,bedrooms,bathrooms,area_m2,status,description")
      .eq("id", propertyId)
      .eq("organization_id", context.organizationId)
      .single(),
    context.supabase
      .from("organizations")
      .select("name,slug")
      .eq("id", context.organizationId)
      .single(),
  ]);

  if (propertyError || !property) throw new Error("No se encontró la propiedad.");
  if (organizationError || !organization) throw new Error("No se encontró la inmobiliaria.");

  const title = String(formData.get("title") || property.title || "").trim();
  const description = String(formData.get("description") || property.description || "").trim();
  const coverImageUrl = String(formData.get("cover_image_url") || "").trim() || null;
  const contactName = String(formData.get("contact_name") || "").trim() || null;
  const contactPhone = String(formData.get("contact_phone") || "").trim() || null;
  const addressLabel = String(formData.get("address_label") || property.address || "").trim() || null;

  if (status === "PUBLISHED") {
    const missing = [
      !title && "título",
      !description && "descripción",
      !property.zone && "zona",
      property.price == null && "precio",
      !coverImageUrl && "foto principal",
    ].filter(Boolean);
    if (missing.length) throw new Error(`Antes de publicar completá: ${missing.join(", ")}.`);
  }

  const publicSlug = `${slugify(title || property.title) || "propiedad"}-${property.id.slice(0, 8)}`;
  const now = new Date().toISOString();

  const payload = {
    organization_id: context.organizationId,
    property_id: property.id,
    channel: "REVSCALE_WEB",
    status,
    organization_name: organization.name || "Inmobiliaria",
    organization_slug: organization.slug || context.organizationId,
    public_slug: publicSlug,
    title,
    description: description || null,
    property_type: property.property_type,
    operation: property.operation,
    zone: property.zone,
    address_label: addressLabel,
    price: property.price,
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area_m2: property.area_m2,
    cover_image_url: coverImageUrl,
    contact_name: contactName,
    contact_phone: contactPhone,
    published_at: status === "PUBLISHED" ? now : null,
    last_synced_at: now,
    updated_by: context.userId,
    updated_at: now,
  };

  const { data: existing, error: existingError } = await context.supabase
    .from("property_publications")
    .select("id,created_by")
    .eq("organization_id", context.organizationId)
    .eq("property_id", property.id)
    .eq("channel", "REVSCALE_WEB")
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const result = existing?.id
    ? await context.supabase
        .from("property_publications")
        .update(payload)
        .eq("id", existing.id)
        .eq("organization_id", context.organizationId)
    : await context.supabase.from("property_publications").insert({ ...payload, created_by: context.userId });

  if (result.error) throw new Error(result.error.message);

  revalidatePath("/protected/distribution");
  revalidatePath(`/inmobiliaria/${organization.slug || context.organizationId}`);
  revalidatePath(`/p/${publicSlug}`);
}
