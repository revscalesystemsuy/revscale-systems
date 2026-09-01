'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROUTE = "/protected/admin/marketing/paid-scaling";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  return { supabase, userId };
}

export async function evaluatePaidScaling(formData: FormData) {
  const channel = String(formData.get("channel") || "").trim();
  const campaignKey = String(formData.get("campaign_key") || "").trim();
  const currentBudget = Number(formData.get("current_daily_budget_usd"));
  const proposedBudget = Number(formData.get("proposed_daily_budget_usd"));
  const volumeConfirmed = formData.get("volume_sufficiency_confirmed") === "on";
  const volumeEvidence = String(formData.get("volume_evidence") || "").trim();

  if (
    !["GOOGLE_SEARCH", "META_RETARGETING"].includes(channel) ||
    !campaignKey ||
    !Number.isFinite(currentBudget) ||
    currentBudget < 0 ||
    !Number.isFinite(proposedBudget) ||
    proposedBudget <= currentBudget ||
    (volumeConfirmed && !volumeEvidence)
  ) {
    redirect(`${ROUTE}?error=${encodeURIComponent("Datos de escalado inválidos")}`);
  }

  const { supabase, userId } = await requireAdmin();
  const [{ count: paidCount }, { count: caseCount }, { data: latestReview, error: reviewError }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id", { count: "exact", head: true }).eq("stage", "PAID").not("paid_at", "is", null),
    supabase.from("b2b_case_studies").select("id", { count: "exact", head: true }).eq("status", "READY"),
    supabase
      .from("b2b_paid_optimization_reviews")
      .select("*")
      .eq("channel", channel)
      .eq("campaign_key", campaignKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (reviewError) redirect(`${ROUTE}?error=${encodeURIComponent(reviewError.message)}`);

  const verifiedPaid = paidCount || 0;
  const readyCases = caseCount || 0;
  const qualifiedDemos = Number(latestReview?.qualified_demo_count || 0);
  const spend = Number(latestReview?.spend_usd || 0);
  const ratio = latestReview?.cpqd_to_gross_profit_ratio == null ? null : Number(latestReview.cpqd_to_gross_profit_ratio);
  const expectedGP = latestReview?.expected_first_year_gross_profit_usd == null ? null : Number(latestReview.expected_first_year_gross_profit_usd);
  const trafficQuality = latestReview?.traffic_quality || null;

  let overCapStreak = 0;
  if (latestReview) {
    const { data: recentReviews } = await supabase
      .from("b2b_paid_optimization_reviews")
      .select("cpqd_to_gross_profit_ratio")
      .eq("channel", channel)
      .eq("campaign_key", campaignKey)
      .order("created_at", { ascending: false })
      .limit(4);
    for (const review of recentReviews || []) {
      const value = review.cpqd_to_gross_profit_ratio == null ? null : Number(review.cpqd_to_gross_profit_ratio);
      if (value !== null && value > 0.3) overCapStreak += 1;
      else break;
    }
  }

  let verdict = "READY_TO_SCALE";
  let reason = "Fundación, prueba, señal, calidad y economía cumplen los gates. El cambio de presupuesto sigue siendo manual en la plataforma publicitaria.";
  if (verifiedPaid < 10) {
    verdict = "BLOCKED_FOUNDATION";
    reason = `Escalado bloqueado: ${verifiedPaid}/10 clientes pagos verificados.`;
  } else if (readyCases < 3) {
    verdict = "BLOCKED_PROOF";
    reason = `Escalado bloqueado: ${readyCases}/3 casos READY verificables.`;
  } else if (!latestReview || spend <= 0 || qualifiedDemos <= 0) {
    verdict = "BLOCKED_SIGNAL";
    reason = "Falta una review con gasto real y al menos una demo calificada atribuida.";
  } else if (trafficQuality !== "CLEAN") {
    verdict = trafficQuality === "MIXED" ? "HOLD" : "BLOCKED_SIGNAL";
    reason = trafficQuality === "MIXED" ? "Calidad de tráfico mixta: sostener presupuesto y limpiar targeting antes de escalar." : "La calidad de tráfico no está validada como ICP limpia.";
  } else if (!expectedGP || ratio === null) {
    verdict = "BLOCKED_ECONOMICS";
    reason = "Falta beneficio bruto esperado o ratio CPQD/GP para validar economía.";
  } else if (ratio > 0.3) {
    verdict = "BLOCKED_ECONOMICS";
    reason = overCapStreak >= 2 ? `CPQD supera 30% del GP en ${overCapStreak} reviews consecutivas: no escalar y reestructurar.` : "CPQD supera 30% del beneficio bruto esperado del primer año.";
  } else if (ratio > 0.25) {
    verdict = "BLOCKED_ECONOMICS";
    reason = "CPQD está por encima del guardrail de 25%; optimizar antes de escalar.";
  } else if (!volumeConfirmed) {
    verdict = "HOLD";
    reason = "Economía apta, pero falta confirmar volumen suficiente con evidencia verificable.";
  }

  const evidenceSnapshot = {
    strategy_gate: { minimum_paid_customers: 10, minimum_ready_case_studies: 3, max_cpqd_to_gp_ratio: 0.25 },
    current: { verified_paid_customers: verifiedPaid, ready_case_studies: readyCases, spend_usd: spend, qualified_demo_count: qualifiedDemos },
    latest_review_id: latestReview?.id || null,
    volume_evidence: volumeEvidence || null,
    external_budget_changed: false,
    linkedin_ads_enabled: false,
  };

  const { error } = await supabase.from("b2b_paid_scaling_decisions").insert({
    channel,
    campaign_key: campaignKey,
    review_id: latestReview?.id || null,
    review_period_start: latestReview?.period_start || null,
    review_period_end: latestReview?.period_end || null,
    current_daily_budget_usd: currentBudget,
    proposed_daily_budget_usd: proposedBudget,
    verified_paid_customers: verifiedPaid,
    ready_case_studies: readyCases,
    qualified_demo_count: qualifiedDemos,
    cost_per_qualified_demo_usd: latestReview?.cost_per_qualified_demo_usd ?? null,
    expected_first_year_gross_profit_usd: expectedGP,
    cpqd_to_gross_profit_ratio: ratio,
    traffic_quality: trafficQuality,
    over_cap_streak_reviews: overCapStreak,
    volume_sufficiency_confirmed: volumeConfirmed,
    volume_evidence: volumeEvidence || null,
    verdict,
    reason,
    evidence_snapshot: evidenceSnapshot,
    manual_ads_change_required: true,
    created_by: userId,
  });
  if (error) redirect(`${ROUTE}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(ROUTE);
  redirect(`${ROUTE}?success=${encodeURIComponent(`Evaluación: ${verdict}`)}`);
}
