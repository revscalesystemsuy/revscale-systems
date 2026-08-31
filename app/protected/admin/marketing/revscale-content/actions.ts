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

export async function saveRevScaleContent(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status") || "DRAFT";
  const requiresEvidence = formData.get("requires_evidence") === "on";
  const evidenceReference = text(formData, "evidence_reference");
  if (status === "READY" && requiresEvidence && !evidenceReference) {
    redirect(`/protected/admin/marketing/revscale-content?error=${encodeURIComponent("No se puede marcar READY sin evidencia requerida")}`);
  }
  const payload = {
    created_by: userId,
    content_key: text(formData, "content_key"),
    title: text(formData, "title"),
    pillar: text(formData, "pillar"),
    channel: text(formData, "channel"),
    format: text(formData, "format"),
    purpose: text(formData, "purpose"),
    status,
    post_copy: text(formData, "post_copy"),
    asset_brief: text(formData, "asset_brief"),
    cta: text(formData, "cta"),
    requires_evidence: requiresEvidence,
    evidence_requirement: text(formData, "evidence_requirement") || null,
    evidence_reference: evidenceReference || null,
    source_strategy_ref: text(formData, "source_strategy_ref") || null,
    notes: text(formData, "notes") || null,
    updated_at: new Date().toISOString(),
  };
  if (!payload.content_key || !payload.title || !payload.pillar || !payload.channel || !payload.format || !payload.purpose || !payload.post_copy) {
    redirect(`/protected/admin/marketing/revscale-content?error=${encodeURIComponent("Completá key, título, pilar, canal, formato, propósito y copy")}`);
  }
  const result = id
    ? await supabase.from("b2b_revscale_content").update(payload).eq("id", id)
    : await supabase.from("b2b_revscale_content").insert(payload);
  if (result.error) redirect(`/protected/admin/marketing/revscale-content?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/protected/admin/marketing/revscale-content");
  redirect("/protected/admin/marketing/revscale-content?success=Contenido%20guardado");
}

export async function markRevScaleContentPublished(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  const url = text(formData, "publication_url");
  if (!id || !url) redirect("/protected/admin/marketing/revscale-content");
  const { data: item } = await supabase.from("b2b_revscale_content").select("requires_evidence,evidence_reference,status").eq("id", id).maybeSingle();
  if (!item || !["READY","PUBLISHED"].includes(item.status)) redirect(`/protected/admin/marketing/revscale-content?error=${encodeURIComponent("Solo se publica contenido READY")}`);
  if (item.requires_evidence && !item.evidence_reference) redirect(`/protected/admin/marketing/revscale-content?error=${encodeURIComponent("Falta evidencia requerida")}`);
  const now = new Date().toISOString();
  const { error } = await supabase.from("b2b_revscale_content").update({ status: "PUBLISHED", published_at: now, publication_url: url, updated_at: now }).eq("id", id);
  if (error) redirect(`/protected/admin/marketing/revscale-content?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/protected/admin/marketing/revscale-content");
  redirect("/protected/admin/marketing/revscale-content?success=Contenido%20publicado");
}
