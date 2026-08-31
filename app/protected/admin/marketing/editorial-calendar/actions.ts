"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

export async function updateEditorialSlot(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "PLANNED");
  const publicationUrl = String(formData.get("publication_url") || "").trim();
  const evidenceReference = String(formData.get("evidence_reference") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  const allowed = new Set(["PLANNED","DRAFT","READY","BLOCKED","PUBLISHED","COMPLETED","SKIPPED"]);
  if (!id || !allowed.has(status)) throw new Error("Estado inválido.");

  const { data: slot, error: slotError } = await supabase.from("b2b_editorial_calendar").select("requires_evidence,evidence_requirement").eq("id", id).maybeSingle();
  if (slotError) throw slotError;
  if (!slot) throw new Error("Slot editorial no encontrado.");
  if (["READY","PUBLISHED"].includes(status) && slot.requires_evidence && !evidenceReference) {
    throw new Error(slot.evidence_requirement || "Este contenido requiere evidencia antes de quedar listo.");
  }
  if (status === "PUBLISHED" && !publicationUrl) throw new Error("Registrá la URL publicada.");

  const { error } = await supabase.from("b2b_editorial_calendar").update({
    status,
    publication_url: publicationUrl || null,
    evidence_reference: evidenceReference || null,
    published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw error;
  revalidatePath("/protected/admin/marketing/editorial-calendar");
}
