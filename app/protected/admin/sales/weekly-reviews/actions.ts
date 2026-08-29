"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const checked = (fd: FormData, key: string) => fd.get(key) === "on";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

export async function recordWeeklyReview(formData: FormData) {
  const opportunityId = text(formData, "opportunity_id");
  if (!opportunityId) redirect("/protected/admin/sales/weekly-reviews");
  const { supabase, userId } = await requireAdmin();

  const { data: latestScore } = await supabase
    .from("b2b_activation_scores")
    .select("id,score_total,owner_next_step_pct,today_usage_days")
    .eq("opportunity_id", opportunityId)
    .order("evaluated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestScore) {
    redirect(`/protected/admin/sales/weekly-reviews/${opportunityId}?error=${encodeURIComponent("Primero registrá un Activation Score")}`);
  }

  const reviewWeek = text(formData, "review_week");
  const overdueCount = Number(text(formData, "overdue_followups_count"));
  const decision = text(formData, "decision_next_week");
  const owner = text(formData, "decision_owner");
  const dueRaw = text(formData, "decision_due_at");
  const evidence = text(formData, "evidence_notes");

  if (!reviewWeek || !decision || !owner || !dueRaw || !evidence) {
    redirect(`/protected/admin/sales/weekly-reviews/${opportunityId}?error=${encodeURIComponent("Semana, decisión, responsable, fecha y evidencia son obligatorios")}`);
  }
  if (!Number.isInteger(overdueCount) || overdueCount < 0) {
    redirect(`/protected/admin/sales/weekly-reviews/${opportunityId}?error=${encodeURIComponent("Seguimientos vencidos debe ser un entero >= 0")}`);
  }

  const dueAt = new Date(`${dueRaw}:00-03:00`);
  if (Number.isNaN(dueAt.getTime())) {
    redirect(`/protected/admin/sales/weekly-reviews/${opportunityId}?error=${encodeURIComponent("Fecha de decisión inválida")}`);
  }

  const { error } = await supabase.from("b2b_weekly_reviews").insert({
    opportunity_id: opportunityId,
    activation_score_id: latestScore.id,
    created_by: userId,
    review_week: reviewWeek,
    activation_score: latestScore.score_total,
    owner_next_step_pct: latestScore.owner_next_step_pct,
    today_usage_days: latestScore.today_usage_days,
    overdue_followups_count: overdueCount,
    blocked_items: text(formData, "blocked_items") || null,
    wins: text(formData, "wins") || null,
    product_learning: text(formData, "product_learning") || null,
    decision_next_week: decision,
    decision_owner: owner,
    decision_due_at: dueAt.toISOString(),
    sponsor_present: checked(formData, "sponsor_present"),
    evidence_notes: evidence,
  });

  if (error) {
    const message = error.code === "23505" ? "Ya existe una weekly review para esa semana" : error.message;
    redirect(`/protected/admin/sales/weekly-reviews/${opportunityId}?error=${encodeURIComponent(message)}`);
  }

  await supabase.from("b2b_opportunities").update({
    next_step: decision,
    next_step_due_at: dueAt.toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", opportunityId);

  revalidatePath("/protected/admin/sales/weekly-reviews");
  revalidatePath(`/protected/admin/sales/weekly-reviews/${opportunityId}`);
  revalidatePath("/protected/admin/sales");
  redirect(`/protected/admin/sales/weekly-reviews/${opportunityId}?success=Weekly%20review%20registrada`);
}
