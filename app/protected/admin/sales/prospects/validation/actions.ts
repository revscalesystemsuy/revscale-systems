'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SIGNAL_VALUES: Record<string, number[]> = {
  score_team_size: [5, 10, 15, 20],
  score_lead_volume: [2, 6, 12, 20],
  score_source_fragmentation: [5, 15],
  score_whatsapp_centrality: [0, 10],
  score_process_pain: [0, 15],
  score_growth_investment: [0, 10],
  score_decision_access: [0, 5],
};

const CHANNELS = ["WHATSAPP", "EMAIL", "PHONE", "OTHER"] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!admin) redirect("/protected");
  return supabase;
}

export async function recordValidationEvidence(formData: FormData) {
  const prospectId = String(formData.get("prospect_id") || "").trim();
  const signalKey = String(formData.get("signal_key") || "").trim();
  const scoreValue = Number(String(formData.get("score_value") || "").trim());
  const channel = String(formData.get("channel") || "").trim().toUpperCase();
  const responseText = String(formData.get("response_text") || "").trim();
  const evidenceNote = String(formData.get("evidence_note") || "").trim();

  const allowedValues = SIGNAL_VALUES[signalKey];
  if (
    !prospectId ||
    !allowedValues ||
    !Number.isInteger(scoreValue) ||
    !allowedValues.includes(scoreValue) ||
    !CHANNELS.includes(channel as (typeof CHANNELS)[number]) ||
    !responseText
  ) {
    redirect(`/protected/admin/sales/prospects/validation?error=${encodeURIComponent("Completá señal, puntaje, canal y respuesta con valores válidos")}`);
  }

  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("record_b2b_prospect_validation_evidence", {
    p_prospect_id: prospectId,
    p_signal_key: signalKey,
    p_score_value: scoreValue,
    p_channel: channel,
    p_response_text: responseText,
    p_evidence_note: evidenceNote || null,
  });

  if (error) {
    redirect(`/protected/admin/sales/prospects/validation?error=${encodeURIComponent("No se pudo registrar la evidencia ni recalcular el score")}`);
  }

  revalidatePath("/protected/admin/sales/prospects/validation");
  revalidatePath("/protected/admin/sales/prospects/scoring");
  revalidatePath("/protected/admin/sales/prospects/tiers");

  redirect(`/protected/admin/sales/prospects/validation?success=${encodeURIComponent("Evidencia registrada y score recalculado")}`);
}
