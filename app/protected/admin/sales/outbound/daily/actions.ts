"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_CHANNELS = new Set(["EMAIL", "WHATSAPP", "LINKEDIN"]);

export async function registerDailyFirstTouch(formData: FormData) {
  const prospectId = String(formData.get("prospect_id") || "");
  const channel = String(formData.get("channel") || "").toUpperCase();

  if (!prospectId || !ALLOWED_CHANNELS.has(channel)) {
    redirect("/protected/admin/sales/outbound/daily?error=Datos%20de%20contacto%20inv%C3%A1lidos");
  }

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

  const { data: prospect } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,decision_maker_name,public_email,public_phone,whatsapp_number,score_status,prospect_tier,icp_score,team_size_hint,lead_sources_hint,score_growth_investment,score_decision_access,score_geography")
    .eq("id", prospectId)
    .maybeSingle();

  if (!prospect || prospect.score_status !== "SCORED" || !["A", "B"].includes(prospect.prospect_tier || "")) {
    redirect("/protected/admin/sales/outbound/daily?error=La%20cuenta%20todav%C3%ADa%20no%20es%20Tier%20A%2FB%20con%20score%20completo");
  }

  if (channel === "EMAIL" && !prospect.public_email) {
    redirect("/protected/admin/sales/outbound/daily?error=La%20cuenta%20no%20tiene%20email%20disponible");
  }
  if (channel === "WHATSAPP" && !prospect.whatsapp_number) {
    redirect("/protected/admin/sales/outbound/daily?error=La%20cuenta%20no%20tiene%20WhatsApp%20disponible");
  }

  const now = new Date();
  const due = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const phone = channel === "WHATSAPP" ? prospect.whatsapp_number : prospect.public_phone;

  const payload = {
    source_type: "MANUAL",
    source_id: prospect.id,
    company: prospect.company_name,
    contact_name: prospect.decision_maker_name,
    email: prospect.public_email,
    phone,
    source_status: "FORMAL_OUTBOUND_STARTED",
    stage: "CONTACTED",
    sales_owner_id: userId,
    primary_channel: channel,
    plan_interest: "UNKNOWN",
    next_step: "Toque Día 3 con un ángulo distinto. No repetir el mismo copy ni duplicar canal el mismo día.",
    next_step_due_at: due.toISOString(),
    last_contact_at: now.toISOString(),
    notes: "Primer touch formal registrado desde la rutina de 15 cuentas/día. El botón registra actividad solo después de que el contacto se envió realmente.",
    icp_team_size: prospect.team_size_hint,
    icp_lead_sources: prospect.lead_sources_hint,
    icp_growth_investment: prospect.score_growth_investment == null ? null : prospect.score_growth_investment > 0,
    icp_decision_access: prospect.score_decision_access == null ? null : prospect.score_decision_access > 0,
    icp_geography_fit: prospect.score_geography == null ? null : prospect.score_geography > 0,
    icp_score: prospect.icp_score,
    tier: prospect.prospect_tier,
    last_contact_outcome: "CONTACTED",
    acquisition_source: "OUTBOUND",
    acquisition_detail: `Primer touch formal ${channel}`,
    acquisition_campaign: "GTM_PROPERTYOS_FORMAL_OUTBOUND",
  };

  const { error } = await supabase
    .from("b2b_opportunities")
    .upsert(payload, { onConflict: "source_type,source_id" });

  if (error) {
    redirect(`/protected/admin/sales/outbound/daily?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/protected/admin/sales/outbound/daily");
  revalidatePath("/protected/admin/sales");
  revalidatePath("/protected/admin/sales/followups");
  redirect("/protected/admin/sales/outbound/daily?success=Primer%20touch%20formal%20registrado");
}
