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

export async function saveNegotiation(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  const status = text(formData, "status") || "OPEN";
  const concessionType = text(formData, "concession_type") || "NONE";
  const giveGet = text(formData, "give_get");
  if (!opportunityId || !["OPEN","AGREED","WALK_AWAY"].includes(status)) redirect("/protected/admin/sales/negotiation");
  if (concessionType !== "NONE" && !giveGet) {
    redirect(`/protected/admin/sales/negotiation/${opportunityId}?error=${encodeURIComponent("Toda concesión exige una contraprestación explícita")}`);
  }

  const { supabase, userId } = await requireAdmin();
  const { data: opportunity } = await supabase.from("b2b_opportunities").select("id,stage").eq("id", opportunityId).maybeSingle();
  if (!opportunity || !["PILOT_PROPOSED","PILOT_ACTIVE"].includes(opportunity.stage)) {
    redirect(`/protected/admin/sales/negotiation/${opportunityId}?error=${encodeURIComponent("La negociación requiere una oportunidad con piloto propuesto o activo")}`);
  }

  const proposalId = text(formData, "proposal_id") || null;
  const pilotAgreementId = text(formData, "pilot_agreement_id") || null;
  const nextStep = text(formData, "next_step") || null;
  const dueRaw = text(formData, "next_step_due_at");
  const dueAt = dueRaw ? new Date(`${dueRaw}:00-03:00`).toISOString() : null;
  const now = new Date().toISOString();

  const payload = {
    opportunity_id: opportunityId,
    proposal_id: proposalId,
    pilot_agreement_id: pilotAgreementId,
    created_by: userId,
    status,
    objection_type: text(formData, "objection_type") || null,
    objection_detail: text(formData, "objection_detail") || null,
    concession_type: concessionType,
    concession_detail: text(formData, "concession_detail") || null,
    give_get: giveGet || null,
    revised_price_usd: text(formData, "revised_price_usd") ? Number(text(formData, "revised_price_usd")) : null,
    revised_pilot_days: text(formData, "revised_pilot_days") ? Number(text(formData, "revised_pilot_days")) : null,
    revised_scope: text(formData, "revised_scope") || null,
    next_step: nextStep,
    next_step_due_at: dueAt,
    agreed_at: status === "AGREED" ? now : null,
    walk_away_at: status === "WALK_AWAY" ? now : null,
    updated_at: now,
  };

  const { error } = await supabase.from("b2b_negotiations").insert(payload);
  if (error) redirect(`/protected/admin/sales/negotiation/${opportunityId}?error=${encodeURIComponent(error.message)}`);

  await supabase.from("b2b_opportunities").update({
    next_step: status === "AGREED" ? "Confirmar cierre y preparar handoff a onboarding." : status === "WALK_AWAY" ? "Registrar motivo de pérdida si corresponde." : nextStep,
    next_step_due_at: dueAt,
    updated_at: now,
  }).eq("id", opportunityId);

  revalidatePath("/protected/admin/sales/negotiation");
  revalidatePath(`/protected/admin/sales/negotiation/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales/negotiation/${opportunityId}?success=${status === "AGREED" ? "Negociaci%C3%B3n%20acordada" : status === "WALK_AWAY" ? "Negociaci%C3%B3n%20cerrada" : "Negociaci%C3%B3n%20registrada"}`);
}
