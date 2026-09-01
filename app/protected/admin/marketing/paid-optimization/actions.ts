'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect('/auth/login');
  const { data: admin } = await supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (!admin) redirect('/protected');
  return { supabase, userId };
}

export async function savePaidSpend(formData: FormData) {
  const channel = String(formData.get('channel') || '').trim();
  const campaignKey = String(formData.get('campaign_key') || '').trim();
  const spendDate = String(formData.get('spend_date') || '').trim();
  const spendUsd = Number(formData.get('spend_usd'));
  const impressionsRaw = String(formData.get('impressions') || '').trim();
  const clicksRaw = String(formData.get('clicks') || '').trim();
  const sourceReference = String(formData.get('source_reference') || '').trim();
  if (!['GOOGLE_SEARCH','META_RETARGETING'].includes(channel) || !campaignKey || !/^\d{4}-\d{2}-\d{2}$/.test(spendDate) || !Number.isFinite(spendUsd) || spendUsd < 0 || !sourceReference) {
    redirect('/protected/admin/marketing/paid-optimization?error=Datos%20de%20spend%20inv%C3%A1lidos');
  }
  const { supabase, userId } = await requireAdmin();
  const payload = {
    channel, campaign_key: campaignKey, spend_date: spendDate, spend_usd: spendUsd,
    impressions: impressionsRaw ? Number(impressionsRaw) : null,
    clicks: clicksRaw ? Number(clicksRaw) : null,
    source_reference: sourceReference,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('b2b_paid_media_spend').upsert(payload, { onConflict: 'channel,campaign_key,spend_date' });
  if (error) redirect(`/protected/admin/marketing/paid-optimization?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/protected/admin/marketing/paid-optimization');
  redirect('/protected/admin/marketing/paid-optimization?success=Spend%20registrado');
}

export async function createOptimizationReview(formData: FormData) {
  const channel = String(formData.get('channel') || '').trim();
  const campaignKey = String(formData.get('campaign_key') || '').trim();
  const periodStart = String(formData.get('period_start') || '').trim();
  const periodEnd = String(formData.get('period_end') || '').trim();
  const trafficQuality = String(formData.get('traffic_quality') || 'UNKNOWN').trim();
  const gpRaw = String(formData.get('expected_first_year_gross_profit_usd') || '').trim();
  const expectedGP = gpRaw ? Number(gpRaw) : null;
  if (!['GOOGLE_SEARCH','META_RETARGETING'].includes(channel) || !campaignKey || !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) || !['UNKNOWN','CLEAN','MIXED','NON_ICP'].includes(trafficQuality)) {
    redirect('/protected/admin/marketing/paid-optimization?error=Review%20inv%C3%A1lida');
  }
  const { supabase, userId } = await requireAdmin();
  const { data: snapshot, error: snapshotError } = await supabase.rpc('get_paid_optimization_snapshot', {
    p_channel: channel, p_campaign_key: campaignKey, p_period_start: periodStart, p_period_end: periodEnd,
  });
  if (snapshotError) redirect(`/protected/admin/marketing/paid-optimization?error=${encodeURIComponent(snapshotError.message)}`);
  const spend = Number(snapshot?.spend_usd || 0);
  const qd = Number(snapshot?.qualified_demo_count || 0);
  const cpqd = snapshot?.cost_per_qualified_demo_usd == null ? null : Number(snapshot.cost_per_qualified_demo_usd);
  const ratio = cpqd != null && expectedGP && expectedGP > 0 ? cpqd / expectedGP : null;
  let verdict = 'KEEP_TESTING';
  let reason = 'Señal dentro del guardrail; mantener test y revisar calidad semanalmente.';
  if (spend <= 0) { verdict = 'NO_DATA'; reason = 'No hay gasto registrado en el período.'; }
  else if (trafficQuality === 'NON_ICP') { verdict = 'PAUSE_OR_REWORK'; reason = 'Tráfico no-ICP: pausar o rehacer targeting/keywords antes de gastar más.'; }
  else if (qd === 0) { verdict = 'NO_QUALIFIED_DEMOS'; reason = 'Hay gasto pero cero demos calificadas; revisar tráfico, landing y mensaje.'; }
  else if (!expectedGP || expectedGP <= 0) { verdict = 'NEEDS_GROSS_PROFIT'; reason = 'Falta beneficio bruto esperado real del primer año para evaluar el guardrail económico.'; }
  else if (ratio !== null && ratio > 0.30) { verdict = 'PAUSE_OR_REWORK'; reason = 'CPQD supera 30% del beneficio bruto esperado del primer año.'; }
  else if (ratio !== null && ratio > 0.25) { verdict = 'ADJUST'; reason = 'CPQD está entre 25% y 30% del beneficio bruto esperado; ajustar antes de escalar.'; }

  const { error } = await supabase.from('b2b_paid_optimization_reviews').insert({
    channel, campaign_key: campaignKey, period_start: periodStart, period_end: periodEnd,
    spend_usd: spend, qualified_demo_count: qd, cost_per_qualified_demo_usd: cpqd,
    expected_first_year_gross_profit_usd: expectedGP, cpqd_to_gross_profit_ratio: ratio,
    traffic_quality: trafficQuality, verdict, reason, evidence_snapshot: snapshot || {}, created_by: userId,
  });
  if (error) redirect(`/protected/admin/marketing/paid-optimization?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/protected/admin/marketing/paid-optimization');
  redirect(`/protected/admin/marketing/paid-optimization?success=${encodeURIComponent(`Review: ${verdict}`)}`);
}
