"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const checked = (fd: FormData, key: string) => fd.get(key) === "on";
const lines = (value: string) => value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 20);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

function refresh(opportunityId: string) {
  revalidatePath("/protected/admin/sales/social-proof");
  revalidatePath(`/protected/admin/sales/social-proof/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
}

async function loadAuthorizedSource(supabase: Awaited<ReturnType<typeof createClient>>, opportunityId: string) {
  const [{ data: study }, { data: testimonial }] = await Promise.all([
    supabase.from("b2b_case_studies").select("*").eq("opportunity_id", opportunityId).eq("status", "READY").maybeSingle(),
    supabase.from("b2b_testimonials").select("*").eq("opportunity_id", opportunityId).eq("status", "APPROVED").maybeSingle(),
  ]);
  if (!study || !testimonial) throw new Error("Se requiere case study READY y testimonio APPROVED");
  return { study, testimonial };
}

function validateUsage(testimonial: any, usage: Record<string, boolean>) {
  if (usage.company && !testimonial.company_name_consent) throw new Error("Falta consentimiento para nombre de empresa");
  if (usage.person && !testimonial.person_name_consent) throw new Error("Falta consentimiento para nombre de persona");
  if (usage.role && !testimonial.role_consent) throw new Error("Falta consentimiento para cargo");
  if (usage.logo && !testimonial.logo_consent) throw new Error("Falta consentimiento para logo");
  if (usage.quote && !testimonial.quote_consent) throw new Error("Falta consentimiento para quote");
  if (usage.metrics && !(testimonial.metrics_consent || testimonial.anonymized_metrics_consent)) throw new Error("Falta consentimiento para métricas");
}

export async function saveSocialProofPublication(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/social-proof");
  const { supabase, userId } = await requireAdmin();

  try {
    const { study, testimonial } = await loadAuthorizedSource(supabase, opportunityId);
    const channel = text(formData, "channel");
    const assetType = text(formData, "asset_type");
    if (!["WEBSITE","SALES_DECK","LINKEDIN","EMAIL","PROPOSAL","OTHER"].includes(channel)) throw new Error("Canal inválido");
    if (!["CASE_STUDY","QUOTE","METRIC_CARD","MINI_CASE","SCREENSHOT"].includes(assetType)) throw new Error("Tipo de activo inválido");

    const usage = {
      company: checked(formData, "uses_company_name"),
      person: checked(formData, "uses_person_name"),
      role: checked(formData, "uses_role"),
      logo: checked(formData, "uses_logo"),
      metrics: checked(formData, "uses_metrics"),
      quote: checked(formData, "uses_quote"),
    };
    validateUsage(testimonial, usage);

    const publicationCopy = text(formData, "publication_copy");
    const placement = text(formData, "placement");
    const approvalNotes = text(formData, "approval_notes");
    if (!publicationCopy || !placement || !approvalNotes) throw new Error("Copy, placement y notas de aprobación son obligatorios");
    if (usage.quote && testimonial.approved_copy && !publicationCopy.includes(testimonial.approved_copy)) {
      throw new Error("La publicación debe usar la quote aprobada sin reemplazarla");
    }

    const consentSnapshot = {
      company_name: Boolean(testimonial.company_name_consent),
      person_name: Boolean(testimonial.person_name_consent),
      role: Boolean(testimonial.role_consent),
      logo: Boolean(testimonial.logo_consent),
      metrics: Boolean(testimonial.metrics_consent),
      anonymized_metrics: Boolean(testimonial.anonymized_metrics_consent),
      quote: Boolean(testimonial.quote_consent),
      consent_recorded_at: testimonial.consent_recorded_at || null,
    };

    const payload = {
      opportunity_id: opportunityId,
      case_study_id: study.id,
      testimonial_id: testimonial.id,
      created_by: userId,
      status: "DRAFT",
      channel,
      asset_type: assetType,
      placement,
      publication_copy: publicationCopy,
      uses_company_name: usage.company,
      uses_person_name: usage.person,
      uses_role: usage.role,
      uses_logo: usage.logo,
      uses_metrics: usage.metrics,
      uses_quote: usage.quote,
      asset_references: lines(text(formData, "asset_references")),
      evidence_references: lines(text(formData, "evidence_references")),
      consent_snapshot: consentSnapshot,
      approval_notes: approvalNotes,
      external_reference: text(formData, "external_reference") || null,
      updated_at: new Date().toISOString(),
    };

    const id = text(formData, "publication_id");
    const result = id
      ? await supabase.from("b2b_social_proof_publications").update(payload).eq("id", id).eq("status", "DRAFT")
      : await supabase.from("b2b_social_proof_publications").insert(payload);
    if (result.error) throw result.error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la publicación";
    redirect(`/protected/admin/sales/social-proof/${opportunityId}?error=${encodeURIComponent(message)}`);
  }

  refresh(opportunityId);
  redirect(`/protected/admin/sales/social-proof/${opportunityId}?success=Borrador%20guardado`);
}

export async function approveSocialProofPublication(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const publicationId = text(formData, "publication_id");
  if (!opportunityId || !publicationId) redirect("/protected/admin/sales/social-proof");
  const { supabase } = await requireAdmin();
  try {
    const { testimonial } = await loadAuthorizedSource(supabase, opportunityId);
    const { data: publication } = await supabase.from("b2b_social_proof_publications").select("*").eq("id", publicationId).eq("opportunity_id", opportunityId).maybeSingle();
    if (!publication || publication.status !== "DRAFT") throw new Error("Solo se aprueban borradores");
    validateUsage(testimonial, {
      company: publication.uses_company_name,
      person: publication.uses_person_name,
      role: publication.uses_role,
      logo: publication.uses_logo,
      metrics: publication.uses_metrics,
      quote: publication.uses_quote,
    });
    if (!publication.publication_copy || !publication.approval_notes) throw new Error("Faltan copy o notas de aprobación");
    const now = new Date().toISOString();
    const { error } = await supabase.from("b2b_social_proof_publications").update({ status: "APPROVED", approved_at: now, updated_at: now }).eq("id", publicationId);
    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo aprobar";
    redirect(`/protected/admin/sales/social-proof/${opportunityId}?error=${encodeURIComponent(message)}`);
  }
  refresh(opportunityId);
  redirect(`/protected/admin/sales/social-proof/${opportunityId}?success=Publicaci%C3%B3n%20aprobada`);
}

export async function markSocialProofPublished(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const publicationId = text(formData, "publication_id");
  const externalReference = text(formData, "external_reference");
  if (!opportunityId || !publicationId) redirect("/protected/admin/sales/social-proof");
  const { supabase } = await requireAdmin();
  const { data: publication } = await supabase.from("b2b_social_proof_publications").select("status").eq("id", publicationId).eq("opportunity_id", opportunityId).maybeSingle();
  if (!publication || publication.status !== "APPROVED") redirect(`/protected/admin/sales/social-proof/${opportunityId}?error=${encodeURIComponent("Solo se publica un activo APPROVED")}`);
  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_social_proof_publications").update({ status: "PUBLISHED", published_at: now, external_reference: externalReference || null, updated_at: now }).eq("id", publicationId);
  if (error) redirect(`/protected/admin/sales/social-proof/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ next_step: "Reutilizar prueba social aprobada en contenido y ventas sin exceder permisos.", updated_at: now }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/social-proof/${opportunityId}?success=Publicaci%C3%B3n%20registrada`);
}

export async function withdrawSocialProofPublication(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const publicationId = text(formData, "publication_id");
  if (!opportunityId || !publicationId) redirect("/protected/admin/sales/social-proof");
  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_social_proof_publications").update({ status: "WITHDRAWN", withdrawn_at: now, updated_at: now }).eq("id", publicationId).eq("opportunity_id", opportunityId);
  if (error) redirect(`/protected/admin/sales/social-proof/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/social-proof/${opportunityId}?success=Activo%20retirado`);
}
