"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("No autenticado");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) throw new Error("Sin permisos");
  return { supabase, userId };
}

export async function updateFounderVideoStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "SCRIPT_READY");
  const raw = String(formData.get("raw_video_reference") || "").trim() || null;
  const edit = String(formData.get("edit_reference") || "").trim() || null;
  const publicationUrl = String(formData.get("publication_url") || "").trim() || null;
  const patch: Record<string, unknown> = { status, raw_video_reference: raw, edit_reference: edit, updated_at: new Date().toISOString() };
  if (status === "PUBLISHED") {
    if (!publicationUrl) throw new Error("La publicación requiere URL");
    patch.publication_url = publicationUrl;
    patch.published_at = new Date().toISOString();
  }
  const { error } = await supabase.from("b2b_founder_videos").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/protected/admin/marketing/founder-videos");
}
