"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

function text(value: FormDataEntryValue | null, max = 500) { const v = String(value || "").trim(); return v ? v.slice(0, max) : null; }
function url(value: FormDataEntryValue | null) { const v = text(value, 1000); if (!v) return null; try { const parsed = new URL(v); return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null; } catch { return null; } }
function domain(value: FormDataEntryValue | null) { return String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") || null; }

export async function savePublicSite(formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "property_distribution")) redirect("/protected/billing");
  if (!["OWNER", "MANAGER"].includes(context.role)) redirect("/protected");

  const { data: org } = await context.supabase.from("organizations").select("name,slug").eq("id", context.organizationId).single();
  if (!org?.slug) throw new Error("La organización necesita un slug público.");

  const requestedDomain = context.plan === "ENTERPRISE" ? domain(formData.get("custom_domain")) : null;
  const { data: existing } = await context.supabase.from("brokerage_public_sites").select("custom_domain,custom_domain_status").eq("organization_id", context.organizationId).maybeSingle();
  const domainChanged = requestedDomain !== (existing?.custom_domain || null);
  const payload = {
    organization_id: context.organizationId,
    site_slug: org.slug,
    is_active: formData.get("is_active") === "on",
    tagline: text(formData.get("tagline"), 180),
    about: text(formData.get("about"), 1800),
    logo_url: url(formData.get("logo_url")),
    hero_image_url: null,
    accent_color: "#302d28",
    public_phone: text(formData.get("public_phone"), 40),
    public_email: text(formData.get("public_email"), 180),
    public_whatsapp: text(formData.get("public_whatsapp"), 40),
    public_address: text(formData.get("public_address"), 240),
    instagram_url: url(formData.get("instagram_url")),
    facebook_url: url(formData.get("facebook_url")),
    seo_title: text(formData.get("seo_title"), 160) || `${org.name || "Inmobiliaria"} | Propiedades`,
    seo_description: text(formData.get("seo_description"), 320),
    lead_capture_enabled: formData.get("lead_capture_enabled") === "on",
    custom_domain: requestedDomain,
    custom_domain_status: requestedDomain ? (domainChanged ? "PENDING" : existing?.custom_domain_status || "PENDING") : "NOT_CONFIGURED",
    hide_revscale_branding: context.plan === "ENTERPRISE" && formData.get("hide_revscale_branding") === "on",
  };

  const { error } = await context.supabase.from("brokerage_public_sites").upsert(payload, { onConflict: "organization_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/protected/distribution");
  revalidatePath("/protected/distribution/site");
  revalidatePath(`/inmobiliaria/${org.slug}`);
}
