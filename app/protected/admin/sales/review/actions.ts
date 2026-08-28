'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildRevenueSnapshot, getRevenueWeek, type RevenueConversionEvent, type RevenueOpportunity } from "@/lib/b2b-revenue-review";

export async function saveWeeklyRevenueReview(formData: FormData) {
  const hypotheses = String(formData.get("hypotheses") || "").trim();
  const results = String(formData.get("results") || "").trim();
  const decisions = String(formData.get("decisions") || "").trim();
  const nextFocus = String(formData.get("next_focus") || "").trim();

  if (!results || !decisions || !nextFocus) {
    redirect(`/protected/admin/sales/review?error=${encodeURIComponent("Resultados, decisiones y foco siguiente son obligatorios")}`);
  }
  if ([hypotheses, results, decisions, nextFocus].some((value) => value.length > 5000)) {
    redirect(`/protected/admin/sales/review?error=${encodeURIComponent("Cada campo admite hasta 5000 caracteres")}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunityData }, { data: eventData }] = await Promise.all([
    supabase.from("b2b_opportunities").select("stage,tier,acquisition_source,next_step_due_at,created_at,lost_at,loss_reason,demo_booked_at,demo_completed_at,pilot_proposed_at,pilot_started_at,paid_at"),
    supabase.from("b2b_conversion_events").select("event_type,occurred_at"),
  ]);

  const snapshot = buildRevenueSnapshot(
    (opportunityData || []) as RevenueOpportunity[],
    (eventData || []) as RevenueConversionEvent[],
  );
  const { weekStartDate } = getRevenueWeek();
  const now = new Date().toISOString();

  const { error } = await supabase.from("b2b_revenue_reviews").upsert({
    week_start: weekStartDate,
    metrics_snapshot: snapshot,
    hypotheses: hypotheses || null,
    results,
    decisions,
    next_focus: nextFocus,
    reviewed_at: now,
    created_by: userId,
    updated_at: now,
  }, { onConflict: "week_start" });

  if (error) redirect(`/protected/admin/sales/review?error=${encodeURIComponent("No se pudo guardar la revisión semanal")}`);

  revalidatePath("/protected/admin/sales/review");
  redirect(`/protected/admin/sales/review?success=${encodeURIComponent("Revenue Review semanal guardado")}`);
}
