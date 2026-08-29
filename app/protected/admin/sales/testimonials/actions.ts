"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const checked = (fd: FormData, key: string) => fd.get(key) === "on";

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
  revalidatePath("/protected/admin/sales/testimonials");
  revalidatePath(`/protected/admin/sales/testimonials/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
}

export async function markTestimonialRequested(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/testimonials");
  const { supabase, userId } = await requireAdmin();

  const { data: report } = await supabase
    .from("b2b_pilot_reports")
    .select("id,status,report_day,observed_outcomes,attribution_notes,limitations")
    .eq("opportunity_id", opportunityId)
    .eq("report_day", 45)
    .eq("status", "FINAL")
    .maybeSingle();

  if (!report) {
    redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("Solo se solicita testimonio con reporte final de día 45")}`);
  }

  const requestChannel = text(formData, "request_channel");
  const requestCopy = text(formData, "request_copy");
  if (!requestChannel || !requestCopy) {
    redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("Canal y copy de solicitud son obligatorios")}`);
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase.from("b2b_testimonials").select("id,status").eq("opportunity_id", opportunityId).maybeSingle();
  if (existing && ["APPROVED","DECLINED","REVOKED"].includes(existing.status)) {
    redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("El testimonio ya está cerrado en un estado final")}`);
  }

  const payload = {
    opportunity_id: opportunityId,
    pilot_report_id: report.id,
    created_by: userId,
    status: "REQUESTED",
    requested_at: now,
    request_channel: requestChannel,
    request_copy: requestCopy,
    updated_at: now,
  };

  const result = existing
    ? await supabase.from("b2b_testimonials").update(payload).eq("id", existing.id)
    : await supabase.from("b2b_testimonials").insert(payload);
  if (result.error) redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent(result.error.message)}`);

  await supabase.from("b2b_opportunities").update({
    next_step: "Esperar respuesta y registrar consentimiento explícito para testimonio.",
    updated_at: now,
  }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/testimonials/${opportunityId}?success=Solicitud%20registrada`);
}

export async function saveTestimonialResponse(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/testimonials");
  const { supabase } = await requireAdmin();
  const { data: testimonial } = await supabase.from("b2b_testimonials").select("id,status").eq("opportunity_id", opportunityId).maybeSingle();
  if (!testimonial) redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("Primero registrá la solicitud")}`);
  if (["APPROVED","DECLINED","REVOKED"].includes(testimonial.status)) {
    redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("El testimonio está cerrado")}`);
  }

  const testimonialText = text(formData, "testimonial_text");
  const respondentName = text(formData, "respondent_name");
  const respondentRole = text(formData, "respondent_role");
  const outcome = text(formData, "specific_outcome_reference");
  const consentEvidence = text(formData, "consent_evidence");
  if (!testimonialText || !consentEvidence) {
    redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("El texto recibido y la evidencia de consentimiento son obligatorios")}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_testimonials").update({
    status: "RECEIVED",
    respondent_name: respondentName || null,
    respondent_role: respondentRole || null,
    testimonial_text: testimonialText,
    specific_outcome_reference: outcome || null,
    company_name_consent: checked(formData, "company_name_consent"),
    person_name_consent: checked(formData, "person_name_consent"),
    role_consent: checked(formData, "role_consent"),
    logo_consent: checked(formData, "logo_consent"),
    metrics_consent: checked(formData, "metrics_consent"),
    quote_consent: checked(formData, "quote_consent"),
    anonymized_metrics_consent: checked(formData, "anonymized_metrics_consent"),
    consent_evidence: consentEvidence,
    consent_recorded_at: now,
    notes: text(formData, "notes") || null,
    updated_at: now,
  }).eq("id", testimonial.id);
  if (error) redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent(error.message)}`);

  refresh(opportunityId);
  redirect(`/protected/admin/sales/testimonials/${opportunityId}?success=Respuesta%20registrada`);
}

export async function approveTestimonial(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/testimonials");
  const { supabase } = await requireAdmin();
  const { data: testimonial } = await supabase.from("b2b_testimonials").select("*").eq("opportunity_id", opportunityId).maybeSingle();
  if (!testimonial) redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("Testimonio no encontrado")}`);
  if (testimonial.status !== "RECEIVED") redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("Solo se aprueba un testimonio recibido")}`);
  if (!testimonial.quote_consent || !testimonial.consent_evidence || !testimonial.testimonial_text) {
    redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("La publicación de la quote requiere consentimiento explícito y evidencia")}`);
  }

  const approvedCopy = text(formData, "approved_copy");
  if (!approvedCopy) redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent("Definí el copy exacto aprobado")}`);

  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_testimonials").update({
    status: "APPROVED",
    approved_copy: approvedCopy,
    approved_at: now,
    updated_at: now,
  }).eq("id", testimonial.id);
  if (error) redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent(error.message)}`);

  await supabase.from("b2b_opportunities").update({
    next_step: "Construir case study usando solo activos y métricas autorizados.",
    updated_at: now,
  }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/testimonials/${opportunityId}?success=Testimonio%20aprobado`);
}

export async function closeTestimonial(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const status = text(formData, "status");
  if (!opportunityId || !["DECLINED","REVOKED"].includes(status)) redirect("/protected/admin/sales/testimonials");
  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();
  const patch = status === "DECLINED"
    ? { status, declined_at: now, updated_at: now }
    : { status, revoked_at: now, updated_at: now };
  const { error } = await supabase.from("b2b_testimonials").update(patch).eq("opportunity_id", opportunityId);
  if (error) redirect(`/protected/admin/sales/testimonials/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({
    next_step: status === "REVOKED" ? "Retirar usos del testimonio y conservar solo evidencia permitida." : "No usar testimonio; continuar con evidencia verificable sin quote.",
    updated_at: now,
  }).eq("id", opportunityId);
  refresh(opportunityId);
  redirect(`/protected/admin/sales/testimonials/${opportunityId}?success=${status}`);
}
