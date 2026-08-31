"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();

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
  revalidatePath("/protected/admin/sales/case-studies");
  revalidatePath(`/protected/admin/sales/case-studies/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
}

const lines = (value: string) => value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 20);

export async function saveCaseStudy(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/case-studies");
  const { supabase, userId } = await requireAdmin();

  const [{ data: report }, { data: testimonial }] = await Promise.all([
    supabase.from("b2b_pilot_reports").select("*").eq("opportunity_id", opportunityId).eq("report_day", 45).eq("status", "FINAL").maybeSingle(),
    supabase.from("b2b_testimonials").select("*").eq("opportunity_id", opportunityId).eq("status", "APPROVED").maybeSingle(),
  ]);

  if (!report || !testimonial) {
    redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("Se requiere reporte FINAL de día 45 y testimonio APPROVED")}`);
  }

  const visibility = text(formData, "visibility_mode") || "ANONYMIZED";
  if (!["IDENTIFIED", "ANONYMIZED"].includes(visibility)) {
    redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("Visibilidad inválida")}`);
  }
  if (visibility === "IDENTIFIED" && !testimonial.company_name_consent) {
    redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("No se puede identificar la empresa sin consentimiento")}`);
  }

  const approvedQuote = testimonial.quote_consent ? testimonial.approved_copy || "" : "";
  const companyDisplay = visibility === "IDENTIFIED" && testimonial.company_name_consent ? text(formData, "company_display") : null;
  const respondentDisplay = testimonial.person_name_consent
    ? [testimonial.respondent_name, testimonial.role_consent ? testimonial.respondent_role : null].filter(Boolean).join(" · ") || null
    : null;

  const consentSnapshot = {
    company_name: Boolean(testimonial.company_name_consent),
    person_name: Boolean(testimonial.person_name_consent),
    role: Boolean(testimonial.role_consent),
    logo: Boolean(testimonial.logo_consent),
    metrics: Boolean(testimonial.metrics_consent),
    quote: Boolean(testimonial.quote_consent),
    anonymized_metrics: Boolean(testimonial.anonymized_metrics_consent),
    consent_recorded_at: testimonial.consent_recorded_at || null,
  };

  const metricSnapshot = testimonial.metrics_consent || testimonial.anonymized_metrics_consent
    ? (Array.isArray(report.core_metric_snapshot) ? report.core_metric_snapshot : [])
    : [];

  const payload = {
    opportunity_id: opportunityId,
    pilot_report_id: report.id,
    testimonial_id: testimonial.id,
    created_by: userId,
    status: "DRAFT",
    visibility_mode: visibility,
    title: text(formData, "title"),
    situation: text(formData, "situation"),
    finding: text(formData, "finding"),
    intervention: text(formData, "intervention"),
    result_summary: text(formData, "result_summary"),
    commercial_result: text(formData, "commercial_result") || null,
    attribution_notes: text(formData, "attribution_notes"),
    limitations: text(formData, "limitations"),
    approved_quote: approvedQuote,
    company_display: companyDisplay,
    respondent_display: respondentDisplay,
    metric_snapshot: metricSnapshot,
    consent_snapshot: consentSnapshot,
    screenshot_references: lines(text(formData, "screenshot_references")),
    evidence_references: lines(text(formData, "evidence_references")),
    updated_at: new Date().toISOString(),
  };

  if (!payload.title || !payload.situation || !payload.finding || !payload.intervention || !payload.result_summary || !payload.attribution_notes || !payload.limitations) {
    redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("Título, situación, hallazgo, intervención, resultado, atribución y limitaciones son obligatorios")}`);
  }
  if (payload.commercial_result && !payload.attribution_notes) {
    redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("Un resultado comercial requiere atribución explícita")}`);
  }

  const { data: existing } = await supabase.from("b2b_case_studies").select("id,status").eq("opportunity_id", opportunityId).maybeSingle();
  if (existing?.status === "READY") redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("El case study READY no se edita; revocalo si cambió el consentimiento")}`);
  const result = existing
    ? await supabase.from("b2b_case_studies").update(payload).eq("id", existing.id)
    : await supabase.from("b2b_case_studies").insert(payload);
  if (result.error) redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent(result.error.message)}`);

  await supabase.from("b2b_opportunities").update({ next_step: "Revisar evidencia y aprobar case study para prueba social.", updated_at: new Date().toISOString() }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/case-studies/${opportunityId}?success=Case%20study%20guardado`);
}

export async function markCaseStudyReady(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/case-studies");
  const { supabase } = await requireAdmin();
  const [{ data: study }, { data: testimonial }] = await Promise.all([
    supabase.from("b2b_case_studies").select("*").eq("opportunity_id", opportunityId).maybeSingle(),
    supabase.from("b2b_testimonials").select("*").eq("opportunity_id", opportunityId).maybeSingle(),
  ]);
  if (!study || !testimonial) redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("Case study no encontrado")}`);
  if (testimonial.status !== "APPROVED") redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("El consentimiento/testimonio ya no está aprobado")}`);
  if (!study.title || !study.situation || !study.finding || !study.intervention || !study.result_summary || !study.attribution_notes || !study.limitations) {
    redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("Completá el case study antes de aprobarlo")}`);
  }
  if (study.visibility_mode === "IDENTIFIED" && !testimonial.company_name_consent) {
    redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("Falta permiso vigente para identificar empresa")}`);
  }
  if (study.approved_quote && !testimonial.quote_consent) {
    redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent("Falta permiso vigente para publicar quote")}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_case_studies").update({ status: "READY", ready_at: now, updated_at: now }).eq("id", study.id);
  if (error) redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ next_step: "Distribuir prueba social solo en canales y formatos autorizados.", updated_at: now }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/case-studies/${opportunityId}?success=Case%20study%20READY`);
}

export async function revokeCaseStudy(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/case-studies");
  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_case_studies").update({ status: "REVOKED", revoked_at: now, updated_at: now }).eq("opportunity_id", opportunityId);
  if (error) redirect(`/protected/admin/sales/case-studies/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ next_step: "Retirar el case study de todos los canales publicados.", updated_at: now }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/case-studies/${opportunityId}?success=Case%20study%20revocado`);
}
