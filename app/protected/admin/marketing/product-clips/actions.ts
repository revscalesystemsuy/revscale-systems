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

export async function saveProductClip(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const clipKey = text(formData, "clip_key");
  const payload = {
    clip_key: clipKey,
    created_by: userId,
    title: text(formData, "title"),
    product_surface: text(formData, "product_surface"),
    duration_seconds: Number(text(formData, "duration_seconds")),
    aspect_ratio: text(formData, "aspect_ratio") || "9:16",
    status: "SCRIPT_READY",
    hook: text(formData, "hook"),
    voiceover: text(formData, "voiceover"),
    shot_list: JSON.parse(text(formData, "shot_list") || "[]"),
    on_screen_text: JSON.parse(text(formData, "on_screen_text") || "[]"),
    cta: text(formData, "cta"),
    data_mode: text(formData, "data_mode") || "DEMO_SIMULATED",
    evidence_note: text(formData, "evidence_note"),
    updated_at: new Date().toISOString(),
  };
  if (!clipKey || !payload.title || !payload.product_surface || !payload.hook || !payload.voiceover || !payload.cta) redirect("/protected/admin/marketing/product-clips?error=Datos%20incompletos");
  const { data: existing } = await supabase.from("b2b_product_clips").select("id").eq("clip_key", clipKey).maybeSingle();
  const result = existing
    ? await supabase.from("b2b_product_clips").update(payload).eq("id", existing.id)
    : await supabase.from("b2b_product_clips").insert(payload);
  if (result.error) redirect(`/protected/admin/marketing/product-clips?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/protected/admin/marketing/product-clips");
  redirect("/protected/admin/marketing/product-clips?success=Guion%20guardado");
}

export async function updateProductClipStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const allowed = ["SCRIPT_READY","FOOTAGE_READY","EDIT_READY","PUBLISHED","BLOCKED","ARCHIVED"];
  if (!id || !allowed.includes(status)) redirect("/protected/admin/marketing/product-clips?error=Estado%20inv%C3%A1lido");
  const patch: Record<string, string | null> = { status, updated_at: new Date().toISOString() };
  if (status === "FOOTAGE_READY") patch.footage_reference = text(formData, "reference") || null;
  if (status === "EDIT_READY") patch.edit_reference = text(formData, "reference") || null;
  if (status === "PUBLISHED") { patch.publication_url = text(formData, "reference") || null; patch.published_at = new Date().toISOString(); }
  const { error } = await supabase.from("b2b_product_clips").update(patch).eq("id", id);
  if (error) redirect(`/protected/admin/marketing/product-clips?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/protected/admin/marketing/product-clips");
  redirect("/protected/admin/marketing/product-clips?success=Estado%20actualizado");
}
