"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { founderLinkedInCalendar } from "./calendar";

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

const blockedDays = new Set([26,27]);

export async function initializeFounderLinkedInCalendar() {
  const { supabase, userId } = await requireAdmin();
  const { data: existing } = await supabase.from("b2b_founder_linkedin_posts").select("day_number");
  const existingDays = new Set((existing || []).map((x) => x.day_number));
  const rows = founderLinkedInCalendar.filter((item) => !existingDays.has(item.day)).map((item) => ({
    created_by: userId,
    day_number: item.day,
    theme: item.theme,
    format: item.format,
    pillar: item.pillar,
    status: blockedDays.has(item.day) ? "BLOCKED" : (item.format === "NETWORKING" || item.format === "PARTNERSHIPS" ? "PLANNED" : "READY"),
    post_copy: item.copy,
    asset_brief: item.brief,
    cta: item.cta,
    requires_evidence: blockedDays.has(item.day),
    evidence_requirement: item.day === 26 ? "Cliente/operador real + consentimiento explícito vigente." : item.day === 27 ? "Muestra suficiente + datos anonimizados + metodología transparente." : null,
  }));
  if (rows.length) {
    const { error } = await supabase.from("b2b_founder_linkedin_posts").insert(rows);
    if (error) redirect(`/protected/admin/marketing/founder-linkedin?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/protected/admin/marketing/founder-linkedin");
  redirect("/protected/admin/marketing/founder-linkedin?success=Calendario%20inicializado");
}

export async function updateFounderLinkedInPost(formData: FormData) {
  const id = text(formData, "id");
  if (!id) redirect("/protected/admin/marketing/founder-linkedin");
  const { supabase } = await requireAdmin();
  const { data: row } = await supabase.from("b2b_founder_linkedin_posts").select("*").eq("id", id).maybeSingle();
  if (!row) redirect("/protected/admin/marketing/founder-linkedin?error=Post%20no%20encontrado");

  const status = text(formData, "status") || row.status;
  if (!["PLANNED","DRAFT","READY","BLOCKED","PUBLISHED","COMPLETED","SKIPPED"].includes(status)) {
    redirect(`/protected/admin/marketing/founder-linkedin?error=${encodeURIComponent("Estado inválido")}`);
  }
  if (row.requires_evidence && ["READY","PUBLISHED","COMPLETED"].includes(status) && !text(formData, "evidence_reference") && !row.evidence_reference) {
    redirect(`/protected/admin/marketing/founder-linkedin?error=${encodeURIComponent("Este contenido requiere evidencia antes de publicarse")}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_founder_linkedin_posts").update({
    status,
    post_copy: text(formData, "post_copy") || row.post_copy,
    asset_brief: text(formData, "asset_brief") || row.asset_brief,
    cta: text(formData, "cta") || row.cta,
    evidence_reference: text(formData, "evidence_reference") || row.evidence_reference,
    scheduled_for: text(formData, "scheduled_for") || row.scheduled_for,
    linkedin_url: text(formData, "linkedin_url") || row.linkedin_url,
    published_at: status === "PUBLISHED" && !row.published_at ? now : row.published_at,
    icp_conversations: Number(text(formData, "icp_conversations") || row.icp_conversations || 0),
    owner_manager_interactions: Number(text(formData, "owner_manager_interactions") || row.owner_manager_interactions || 0),
    demos_influenced: Number(text(formData, "demos_influenced") || row.demos_influenced || 0),
    referrals: Number(text(formData, "referrals") || row.referrals || 0),
    notes: text(formData, "notes") || row.notes,
    updated_at: now,
  }).eq("id", id);
  if (error) redirect(`/protected/admin/marketing/founder-linkedin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/protected/admin/marketing/founder-linkedin");
  redirect("/protected/admin/marketing/founder-linkedin?success=Actualizado");
}
