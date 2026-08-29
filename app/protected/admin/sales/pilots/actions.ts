"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const list = (fd: FormData, key: string) => text(fd, key).split("\n").map((x) => x.trim()).filter(Boolean);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

export async function savePilotAgreement(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const proposalId = text(formData, "proposal_id") || null;
  const status = text(formData, "status") || "PREPARED";
  if (!opportunityId || !["PREPARED","OFFERED","ACCEPTED"].includes(status)) redirect("/protected/admin/sales/pilots");

  const { supabase, userId } = await requireAdmin();
  const { data: opportunity } = await supabase.from("b2b_opportunities").select("id,stage").eq("id", opportunityId).maybeSingle();
  if (!opportunity || !["PILOT_PROPOSED","PILOT_ACTIVE"].includes(opportunity.stage)) {
    redirect(`/protected/admin/sales/pilots/${opportunityId}?error=${encodeURIComponent("El acuerdo de piloto requiere una oportunidad con piloto propuesto")}`);
  }

  const metrics = list(formData, "decision_metrics").slice(0, 3);
  if (status === "ACCEPTED" && metrics.length !== 3) {
    redirect(`/protected/admin/sales/pilots/${opportunityId}?error=${encodeURIComponent("Antes de aceptar el piloto deben quedar definidas exactamente tres métricas de decisión")}`);
  }

  const now = new Date().toISOString();
  const payload = {
    opportunity_id: opportunityId,
    proposal_id: proposalId,
    created_by: userId,
    status,
    pilot_days: 45,
    onboarding_days: 7,
    sponsor_name: text(formData, "sponsor_name") || null,
    sponsor_role: text(formData, "sponsor_role") || null,
    champion_name: text(formData, "champion_name") || null,
    champion_role: text(formData, "champion_role") || null,
    data_scope: text(formData, "data_scope") || null,
    property_scope: text(formData, "property_scope") || null,
    integration_scope: text(formData, "integration_scope") || null,
    decision_metrics: metrics,
    target_start_date: text(formData, "target_start_date") || null,
    risks: text(formData, "risks") || null,
    acceptance_notes: text(formData, "acceptance_notes") || null,
    offered_at: status === "OFFERED" ? now : undefined,
    accepted_at: status === "ACCEPTED" ? now : undefined,
    updated_at: now,
  };

  const { data: existing } = await supabase.from("b2b_pilot_agreements").select("id,status").eq("opportunity_id", opportunityId).maybeSingle();
  const result = existing
    ? await supabase.from("b2b_pilot_agreements").update(payload).eq("id", existing.id)
    : await supabase.from("b2b_pilot_agreements").insert(payload);
  if (result.error) redirect(`/protected/admin/sales/pilots/${opportunityId}?error=${encodeURIComponent(result.error.message)}`);

  const nextStep = status === "ACCEPTED"
    ? "Preparar kickoff y onboarding de 7 días."
    : status === "OFFERED"
      ? "Confirmar aceptación, sponsor y tres métricas de decisión del piloto."
      : "Cerrar alcance, sponsor y métricas del Revenue Recovery Pilot.";
  await supabase.from("b2b_opportunities").update({ next_step: nextStep, updated_at: now }).eq("id", opportunityId);

  revalidatePath("/protected/admin/sales/pilots");
  revalidatePath(`/protected/admin/sales/pilots/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales/pilots/${opportunityId}?success=${status === "ACCEPTED" ? "Piloto%20aceptado" : "Acuerdo%20de%20piloto%20guardado"}`);
}

export async function activatePilot(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/pilots");
  const { supabase } = await requireAdmin();
  const { data: agreement } = await supabase.from("b2b_pilot_agreements").select("id,status,sponsor_name,decision_metrics,target_start_date").eq("opportunity_id", opportunityId).maybeSingle();
  if (!agreement || agreement.status !== "ACCEPTED") {
    redirect(`/protected/admin/sales/pilots/${opportunityId}?error=${encodeURIComponent("El piloto debe estar aceptado antes de activarse")}`);
  }
  if (!agreement.sponsor_name || !Array.isArray(agreement.decision_metrics) || agreement.decision_metrics.length !== 3) {
    redirect(`/protected/admin/sales/pilots/${opportunityId}?error=${encodeURIComponent("Falta sponsor o las tres métricas de decisión")}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_pilot_agreements").update({ status: "ACTIVE", activated_at: now, updated_at: now }).eq("id", agreement.id);
  if (error) redirect(`/protected/admin/sales/pilots/${opportunityId}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("b2b_opportunities").update({ stage: "PILOT_ACTIVE", pilot_started_at: now, next_step: "Ejecutar onboarding de 7 días y levantar baseline.", updated_at: now }).eq("id", opportunityId);

  revalidatePath("/protected/admin/sales/pilots");
  revalidatePath(`/protected/admin/sales/pilots/${opportunityId}`);
  revalidatePath("/protected/admin/sales/conversion");
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales/pilots/${opportunityId}?success=Piloto%20activado`);
}
