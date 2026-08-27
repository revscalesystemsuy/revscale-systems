"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

const STATUSES = new Set(["DRAFT", "PUBLISHED", "PAUSED"]);
const LOCATION_TYPES = new Set(["city", "neighborhood"]);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function readHttpUrl(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    return parsed.toString();
  } catch {
    throw new Error("La foto principal debe usar una URL http o https válida.");
  }
}

function readGalleryUrls(value: FormDataEntryValue | null) {
  const raw = String(value || "");
  const result: string[] = [];
  for (const item of raw.split(/[\n,]+/).map((entry) => entry.trim()).filter(Boolean)) {
    const parsed = readHttpUrl(item);
    if (parsed && !result.includes(parsed)) result.push(parsed);
  }
  return result.slice(0, 9);
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

async function requireLivePortalManager() {
  const context = await requireDistributionManager();
  if (!planHasFeature(context.plan, "integrations")) {
    throw new Error("Las conexiones LIVE con portales externos requieren Enterprise.");
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
  const coverImageUrl = readHttpUrl(formData.get("cover_image_url"));
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

export async function saveMercadoLibrePublication(formData: FormData) {
  const context = await requireLivePortalManager();
  const propertyId = String(formData.get("property_id") || "").trim();
  if (!propertyId) throw new Error("Propiedad inválida.");

  const [{ data: property, error: propertyError }, { data: organization, error: organizationError }] = await Promise.all([
    context.supabase
      .from("properties")
      .select("id,title,property_type,operation,zone,address,price,currency,bedrooms,bathrooms,area_m2,status,description")
      .eq("id", propertyId)
      .eq("organization_id", context.organizationId)
      .single(),
    context.supabase.from("organizations").select("name,slug").eq("id", context.organizationId).single(),
  ]);
  if (propertyError || !property) throw new Error("No se encontró la propiedad.");
  if (organizationError || !organization) throw new Error("No se encontró la inmobiliaria.");

  const title = String(formData.get("ml_title") || property.title || "").trim();
  const description = String(formData.get("ml_description") || property.description || "").trim();
  const coverImageUrl = readHttpUrl(formData.get("ml_cover_image_url"));
  const galleryUrls = readGalleryUrls(formData.get("ml_gallery_urls"));
  const categoryId = String(formData.get("ml_category_id") || "").trim();
  const listingTypeId = String(formData.get("ml_listing_type_id") || "silver").trim();
  const locationId = String(formData.get("ml_location_id") || "").trim();
  const locationType = String(formData.get("ml_location_type") || "city").trim().toLowerCase();
  const addressLabel = String(formData.get("ml_address_label") || property.address || "").trim() || null;
  const contactName = String(formData.get("ml_contact_name") || "").trim() || null;
  const contactPhone = String(formData.get("ml_contact_phone") || "").trim() || null;

  if (!title || property.price == null || !property.currency || !coverImageUrl) {
    throw new Error("Para Mercado Libre completá título, precio, moneda y al menos una imagen.");
  }
  if (!categoryId) throw new Error("Ingresá la categoría oficial de Mercado Libre para este inmueble.");
  if (!locationId || !LOCATION_TYPES.has(locationType)) throw new Error("Ingresá una ciudad o barrio válido de Mercado Libre.");

  const now = new Date().toISOString();
  const providerPayload = {
    category_id: categoryId,
    listing_type_id: listingTypeId || "silver",
    location_id: locationId,
    location_type: locationType,
  };

  const publicationPayload = {
    organization_id: context.organizationId,
    property_id: property.id,
    channel: "MERCADOLIBRE",
    status: "DRAFT",
    organization_name: organization.name || "Inmobiliaria",
    organization_slug: organization.slug || context.organizationId,
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
    gallery_urls: galleryUrls,
    contact_name: contactName,
    contact_phone: contactPhone,
    provider_payload: providerPayload,
    last_sync_status: null,
    sync_error: null,
    updated_by: context.userId,
    updated_at: now,
  };

  const { data: existing, error: existingError } = await context.supabase
    .from("property_publications")
    .select("id,external_id,status")
    .eq("organization_id", context.organizationId)
    .eq("property_id", property.id)
    .eq("channel", "MERCADOLIBRE")
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const payload = existing?.external_id
    ? { ...publicationPayload, status: existing.status === "PAUSED" ? "PAUSED" : "PUBLISHED" }
    : publicationPayload;
  const result = existing?.id
    ? await context.supabase.from("property_publications").update(payload).eq("id", existing.id).eq("organization_id", context.organizationId)
    : await context.supabase.from("property_publications").insert({ ...payload, created_by: context.userId });
  if (result.error) throw new Error(result.error.message);

  revalidatePath("/protected/distribution");
}

export async function syncMercadoLibrePublication(formData: FormData) {
  const context = await requireLivePortalManager();
  const publicationId = String(formData.get("publication_id") || "").trim();
  const action = String(formData.get("action") || "VALIDATE").toUpperCase();
  if (!publicationId) throw new Error("Primero guardá la configuración de Mercado Libre.");
  if (!["VALIDATE", "PUBLISH", "SYNC", "PAUSE", "ACTIVATE"].includes(action)) throw new Error("Acción inválida.");

  const { data, error } = await context.supabase.functions.invoke("portal-sync", {
    body: { publication_id: publicationId, action },
  });
  if (error) throw new Error(error.message || "No se pudo sincronizar con Mercado Libre.");
  if (data?.error) throw new Error(String(data.error));

  revalidatePath("/protected/distribution");
  revalidatePath("/protected/settings/integrations");
}
