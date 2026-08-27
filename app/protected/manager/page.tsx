import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  FileWarning,
  Flame,
  Gauge,
  MessageCircleWarning,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { buildSlaMetrics, formatResponseMinutes } from "@/lib/sla-metrics";
import { formatCommercialAmount } from "@/lib/pipeline-metrics";
import { OPEN_PIPELINE_STAGE_SET, calculateOpportunityRisk } from "@/lib/commercial-ops";

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "OPPORTUNITY" | "GOOD";
type ManagerInsight = {
  id: string;
  priority: Priority;
  score: number;
  eyebrow: string;
  title: string;
  detail: string;
  why: string;
  actionLabel: string;
  href: string;
};

type SpendRow = { channel: string | null; provider: string | null; campaign: string | null; amount: number | string; currency: string };
type TouchRow = { lead_id: string; channel: string | null; provider: string | null; campaign: string | null; touched_at: string };
type CommissionRow = { lead_id: string; currency: string; office_commission: number | string | null; payment_status: string | null; due_date: string | null; created_at: string };
type ReactivationRow = { id: string; lead_id: string; score: number; reason: string; status: string; detected_at: string };
type DocumentRow = { id: string; title: string; status: string; legal_review_required: boolean; legal_review_status: string; expires_at: string | null };
type WhatsAppConversation = { id: string; lead_id: string | null; unread_count: number; handoff_requested_at: string | null; handoff_resolved_at: string | null; priority: number | null };

const priorityLabel: Record<Priority, string> = {
  CRITICAL: "Crítico",
  HIGH: "Alta",
  MEDIUM: "Media",
  OPPORTUNITY: "Oportunidad",
  GOOD: "En orden",
};

const priorityStyle: Record<Priority, string> = {
  CRITICAL: "border-[#b98f79] bg-[#eeddd2] text-[#6b4433]",
  HIGH: "border-[#c8aa82] bg-[#efe2cf] text-[#73583c]",
  MEDIUM: "border-[#cfc0a9] bg-[#f1eadf] text-[#6f675d]",
  OPPORTUNITY: "border-[#aab59a] bg-[#e6eadf] text-[#556247]",
  GOOD: "border-[#b8c0aa] bg-[#e9ece3] text-[#566148]",
};

function dimension(row: { campaign?: string | null; provider?: string | null; channel?: string | null }) {
  return row.campaign || row.provider || row.channel || "Sin atribución";
}

function moneyList(values: Map<string, number>) {
  const rows = [...values.entries()].filter(([, value]) => value > 0);
  if (!rows.length) return "Sin valor monetario cargado";
  return rows.map(([currency, value]) => formatCommercialAmount(currency, value)).join(" · ");
}

export default async function RevScaleManagerPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.role !== "OWNER") redirect("/protected");

  const now = new Date();
  const nowMs = now.getTime();
  const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(nowMs - 90 * 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString().slice(0, 10);

  const hasWhatsapp = planHasFeature(context.plan, "whatsapp_ai");
  const hasReactivation = planHasFeature(context.plan, "matching");
  const hasDocuments = planHasFeature(context.plan, "documents");
  const hasAnalytics = planHasFeature(context.plan, "analytics");
  const hasCommissions = planHasFeature(context.plan, "commissions") || hasAnalytics;

  const [
    leadsResult,
    interactionsResult,
    followupsResult,
    whatsappResult,
    reactivationResult,
    documentsResult,
    spendResult,
    touchesResult,
    commissionsResult,
  ] = await Promise.all([
    context.supabase
      .from("leads")
      .select("id,full_name,pipeline_stage,budget_max,currency,stage_entered_at,expected_close_date,assigned_to,team_id,next_action,lead_temperature,lead_score,requires_human,assigned_at,received_at,first_human_response_at,sla_deadline,sla_breached_at,source_channel,source_provider,source_campaign,created_at")
      .eq("organization_id", context.organizationId),
    context.supabase.from("latest_interaction_by_lead").select("lead_id,last_interaction_at").eq("organization_id", context.organizationId),
    context.supabase.from("followups").select("id,lead_id,due_at,status").eq("organization_id", context.organizationId).eq("status", "PENDING"),
    hasWhatsapp
      ? context.supabase.from("whatsapp_conversations").select("id,lead_id,unread_count,handoff_requested_at,handoff_resolved_at,priority").eq("organization_id", context.organizationId)
      : Promise.resolve({ data: [], error: null }),
    hasReactivation
      ? context.supabase.from("reactivation_opportunities").select("id,lead_id,score,reason,status,detected_at").eq("organization_id", context.organizationId).eq("status", "OPEN").order("score", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    hasDocuments
      ? context.supabase.from("documents").select("id,title,status,legal_review_required,legal_review_status,expires_at").eq("organization_id", context.organizationId).limit(250)
      : Promise.resolve({ data: [], error: null }),
    hasAnalytics
      ? context.supabase.from("marketing_spend_entries").select("channel,provider,campaign,amount,currency").eq("organization_id", context.organizationId).gte("period_end", ninetyDaysAgo.slice(0, 10))
      : Promise.resolve({ data: [], error: null }),
    hasAnalytics
      ? context.supabase.from("lead_attribution_touches").select("lead_id,channel,provider,campaign,touched_at").eq("organization_id", context.organizationId).order("touched_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    hasCommissions
      ? context.supabase.from("commissions").select("lead_id,currency,office_commission,payment_status,due_date,created_at").eq("organization_id", context.organizationId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const leads = leadsResult.data || [];
  const interactions = interactionsResult.data || [];
  const followups = followupsResult.data || [];
  const conversations = (whatsappResult.data || []) as WhatsAppConversation[];
  const reactivation = (reactivationResult.data || []) as ReactivationRow[];
  const documents = (documentsResult.data || []) as DocumentRow[];
  const spend = (spendResult.data || []) as SpendRow[];
  const touches = (touchesResult.data || []) as TouchRow[];
  const commissions = (commissionsResult.data || []) as CommissionRow[];
  const loadErrors = [leadsResult.error, interactionsResult.error, followupsResult.error, whatsappResult.error, reactivationResult.error, documentsResult.error, spendResult.error, touchesResult.error, commissionsResult.error].filter(Boolean);

  const lastInteractionByLead = new Map(interactions.map((item) => [item.lead_id, item.last_interaction_at]));
  const followupsByLead = new Map<string, typeof followups>();
  for (const row of followups) {
    const current = followupsByLead.get(row.lead_id) || [];
    current.push(row);
    followupsByLead.set(row.lead_id, current);
  }

  const openLeads = leads.filter((lead) => OPEN_PIPELINE_STAGE_SET.has(lead.pipeline_stage || "NEW"));
  const riskLeads = openLeads.map((lead) => {
    const leadFollowups = followupsByLead.get(lead.id) || [];
    const risk = calculateOpportunityRisk(lead, {
      now,
      lastInteractionAt: lastInteractionByLead.get(lead.id) || null,
      hasPendingFollowup: leadFollowups.length > 0,
      hasOverdueFollowup: leadFollowups.some((item) => item.due_at && new Date(item.due_at).getTime() < nowMs),
    });
    return { ...lead, risk };
  });
  const highRisk = riskLeads.filter((lead) => lead.risk.level === "HIGH").sort((a, b) => b.risk.score - a.risk.score);
  const overdueExpected = riskLeads.filter((lead) => lead.risk.isExpectedCloseOverdue);

  const riskValue = new Map<string, number>();
  for (const lead of highRisk) {
    const value = Number(lead.budget_max || 0);
    if (!lead.currency || !Number.isFinite(value) || value <= 0) continue;
    riskValue.set(lead.currency, (riskValue.get(lead.currency) || 0) + value);
  }

  const hotNoHuman = openLeads.filter((lead) => {
    if (lead.lead_temperature !== "HOT" || lead.first_human_response_at) return false;
    const deadline = lead.sla_deadline ? new Date(lead.sla_deadline).getTime() : null;
    if (deadline) return deadline < nowMs;
    const start = lead.assigned_at || lead.received_at || lead.created_at;
    return start ? nowMs - new Date(start).getTime() > 15 * 60 * 1000 : false;
  });

  const needsHuman = openLeads.filter((lead) => lead.requires_human === true);
  const sla = buildSlaMetrics(leads);
  const recentSlaBreaches = leads.filter((lead) => lead.sla_breached_at && lead.sla_breached_at >= sevenDaysAgo).length;
  const pendingHandoffs = conversations.filter((row) => row.handoff_requested_at && !row.handoff_resolved_at);
  const unreadWhatsapp = conversations.reduce((sum, row) => sum + Number(row.unread_count || 0), 0);

  const pendingLegalReview = documents.filter((row) => row.legal_review_required && row.legal_review_status === "PENDING");
  const waitingSignature = documents.filter((row) => row.status === "SENT" || row.status === "VIEWED");
  const expiringDocuments = documents.filter((row) => row.expires_at && !["SIGNED", "VOIDED", "EXPIRED"].includes(row.status) && new Date(row.expires_at).getTime() <= nowMs + 7 * 24 * 60 * 60 * 1000);
  const blockedDocuments = pendingLegalReview.length + waitingSignature.length + expiringDocuments.length;

  const openReactivation = reactivation.filter((row) => row.status === "OPEN");
  const strongReactivation = openReactivation.filter((row) => Number(row.score) >= 75);

  const forecastIncomplete = openLeads.filter((lead) => {
    const budget = Number(lead.budget_max || 0);
    return !Number.isFinite(budget) || budget <= 0 || !lead.currency || !lead.expected_close_date || !lead.next_action || !lead.assigned_to;
  });

  const overdueCommissions = commissions.filter((row) => row.due_date && row.due_date < today && !["PAID", "COLLECTED"].includes(String(row.payment_status || "").toUpperCase()));
  const overdueCommissionValue = new Map<string, number>();
  for (const row of overdueCommissions) {
    const value = Number(row.office_commission || 0);
    if (!Number.isFinite(value) || value <= 0) continue;
    overdueCommissionValue.set(row.currency, (overdueCommissionValue.get(row.currency) || 0) + value);
  }

  const firstTouchByLead = new Map<string, TouchRow>();
  for (const touch of touches) if (!firstTouchByLead.has(touch.lead_id)) firstTouchByLead.set(touch.lead_id, touch);
  const sourceByLead = new Map(leads.map((lead) => [lead.id, { channel: lead.source_channel, provider: lead.source_provider, campaign: lead.source_campaign }]));
  const marketingBuckets = new Map<string, { currency: string; label: string; spend: number; revenue: number }>();
  const ensureMarketing = (currency: string, label: string) => {
    const key = `${currency}|${label}`;
    if (!marketingBuckets.has(key)) marketingBuckets.set(key, { currency, label, spend: 0, revenue: 0 });
    return marketingBuckets.get(key)!;
  };
  for (const row of spend) ensureMarketing(row.currency, dimension(row)).spend += Number(row.amount || 0);
  for (const row of commissions.filter((item) => item.created_at >= ninetyDaysAgo)) {
    const firstTouch = firstTouchByLead.get(row.lead_id);
    const fallback = sourceByLead.get(row.lead_id) || {};
    const label = dimension(firstTouch || fallback);
    ensureMarketing(row.currency, label).revenue += Number(row.office_commission || 0);
  }
  const campaignRows = [...marketingBuckets.values()].filter((row) => row.spend > 0).map((row) => ({ ...row, roi: ((row.revenue - row.spend) / row.spend) * 100 }));
  const roiLosers = campaignRows.filter((row) => row.roi < 0).sort((a, b) => a.roi - b.roi);
  const roiWinners = campaignRows.filter((row) => row.roi >= 100).sort((a, b) => b.roi - a.roi);

  const insights: ManagerInsight[] = [];
  if (hotNoHuman.length) insights.push({
    id: "hot-no-human", priority: "CRITICAL", score: 110,
    eyebrow: "Speed-to-lead", title: `${hotNoHuman.length} lead${hotNoHuman.length === 1 ? "" : "s"} HOT sin respuesta humana`,
    detail: hotNoHuman.slice(0, 3).map((lead) => lead.full_name || "Lead sin nombre").join(" · "),
    why: "La temperatura es HOT y no existe primera respuesta humana dentro del SLA o de los primeros 15 minutos. La probabilidad de perder intención activa aumenta con cada minuto sin contacto.",
    actionLabel: "Atender leads", href: "/protected/leads",
  });
  if (pendingHandoffs.length) insights.push({
    id: "handoffs", priority: "CRITICAL", score: 105,
    eyebrow: "WhatsApp", title: `${pendingHandoffs.length} conversación${pendingHandoffs.length === 1 ? "" : "es"} piden intervención humana`,
    detail: `${unreadWhatsapp} mensajes sin leer en el inbox de la organización.`,
    why: "La IA o el cliente solicitaron handoff y todavía no figura una resolución humana. Estas conversaciones deben salir de la cola automática y tomar dueño.",
    actionLabel: "Abrir inbox", href: "/protected/inbox",
  });
  if (highRisk.length) insights.push({
    id: "pipeline-risk", priority: "HIGH", score: 96,
    eyebrow: "Pipeline", title: `${highRisk.length} oportunidad${highRisk.length === 1 ? "" : "es"} en riesgo alto`,
    detail: `Valor expuesto: ${moneyList(riskValue)}.`,
    why: `RevScale combina antigüedad de etapa, inactividad, seguimientos vencidos y fecha esperada de cierre. La señal más fuerte hoy: ${highRisk[0]?.risk.reasons[0] || "riesgo acumulado"}.`,
    actionLabel: "Intervenir pipeline", href: "/protected/pipeline?filter=risk",
  });
  if (recentSlaBreaches > 0 || (sla.assigned >= 5 && sla.withinPct < 80)) insights.push({
    id: "sla", priority: "HIGH", score: 91,
    eyebrow: "Equipo", title: `SLA comercial en ${sla.withinPct}% de cumplimiento`,
    detail: `${recentSlaBreaches} incumplimientos en los últimos 7 días · mediana ${formatResponseMinutes(sla.medianMinutes)}.`,
    why: "El problema no es cantidad de leads sino velocidad de atención. RevScale compara asignación, primera respuesta humana y vencimiento del reloj SLA.",
    actionLabel: "Ver rendimiento", href: "/protected/executive/performance",
  });
  if (overdueExpected.length) insights.push({
    id: "overdue-close", priority: "HIGH", score: 88,
    eyebrow: "Forecast", title: `${overdueExpected.length} cierre${overdueExpected.length === 1 ? "" : "s"} esperado${overdueExpected.length === 1 ? "" : "s"} ya vencieron`,
    detail: "La fecha estimada quedó atrás y la oportunidad continúa abierta.",
    why: "Una fecha de cierre vencida distorsiona el forecast y suele esconder una negociación frenada, una tarea pendiente o una oportunidad que debería reclasificarse.",
    actionLabel: "Revisar forecast", href: "/protected/pipeline?filter=stalled",
  });
  if (strongReactivation.length) insights.push({
    id: "reactivation", priority: "OPPORTUNITY", score: 86,
    eyebrow: "Opportunity Radar", title: `${strongReactivation.length} lead${strongReactivation.length === 1 ? "" : "s"} recuperable${strongReactivation.length === 1 ? "" : "s"} con score ≥ 75`,
    detail: strongReactivation[0]?.reason || "Hay una razón nueva y concreta para volver a contactar.",
    why: "RevScale detectó una nueva razón comercial —matching, cambio de precio, disponibilidad o nueva unidad— sobre una base que ya conocés. No es un envío masivo: es reactivación contextual.",
    actionLabel: "Abrir Radar", href: "/protected/reactivation",
  });
  if (blockedDocuments) insights.push({
    id: "documents", priority: pendingLegalReview.length || expiringDocuments.length ? "HIGH" : "MEDIUM", score: pendingLegalReview.length || expiringDocuments.length ? 82 : 66,
    eyebrow: "Documentos", title: `${blockedDocuments} bloqueo${blockedDocuments === 1 ? "" : "s"} documental${blockedDocuments === 1 ? "" : "es"}`,
    detail: `${pendingLegalReview.length} en revisión · ${waitingSignature.length} esperando firma · ${expiringDocuments.length} por vencer.`,
    why: "RevScale prioriza documentos que pueden frenar reserva, firma o cierre; no cuenta borradores sin impacto operativo.",
    actionLabel: "Resolver documentos", href: "/protected/documents",
  });
  if (overdueCommissions.length) insights.push({
    id: "collections", priority: "HIGH", score: 79,
    eyebrow: "Comisiones", title: `${overdueCommissions.length} comisión${overdueCommissions.length === 1 ? "" : "es"} vencida${overdueCommissions.length === 1 ? "" : "s"}`,
    detail: `Ingreso de oficina pendiente: ${moneyList(overdueCommissionValue)}.`,
    why: "La operación puede estar cerrada comercialmente pero el ingreso aún no está cobrado. RevScale separa cierre de caja para que Dirección no confunda venta con ingreso realizado.",
    actionLabel: "Revisar cobros", href: "/protected/commissions",
  });
  if (roiLosers.length) insights.push({
    id: "roi-loser", priority: "HIGH", score: 76,
    eyebrow: "Marketing ROI", title: `${roiLosers.length} campaña${roiLosers.length === 1 ? "" : "s"} con ROI negativo`,
    detail: `${roiLosers[0].label}: ${Math.round(roiLosers[0].roi)}% ROI en ${roiLosers[0].currency}.`,
    why: "La inversión supera la comisión que quedó en la inmobiliaria durante la ventana de 90 días. RevScale mide ingreso retenido, no valor de las propiedades ni volumen de leads.",
    actionLabel: "Reasignar presupuesto", href: "/protected/marketing-roi",
  });
  if (needsHuman.length && !hotNoHuman.length) insights.push({
    id: "needs-human", priority: "MEDIUM", score: 68,
    eyebrow: "Atención", title: `${needsHuman.length} lead${needsHuman.length === 1 ? "" : "s"} requieren humano`,
    detail: "Hay una señal explícita de escalamiento aunque no todos sean HOT.",
    why: "El campo requires_human se activa cuando la conversación o la operación necesita criterio de una persona. RevScale lo separa de la automatización para evitar respuestas fuera de contexto.",
    actionLabel: "Revisar leads", href: "/protected/leads",
  });
  if (forecastIncomplete.length) insights.push({
    id: "forecast-quality", priority: "MEDIUM", score: 62,
    eyebrow: "Datos", title: `${forecastIncomplete.length} oportunidad${forecastIncomplete.length === 1 ? "" : "es"} debilitan el forecast`,
    detail: "Falta presupuesto, moneda, fecha de cierre, próxima acción o responsable.",
    why: "Una predicción comercial no puede ser confiable si faltan los campos mínimos que explican valor, timing y ownership.",
    actionLabel: "Completar pipeline", href: "/protected/pipeline",
  });
  if (roiWinners.length) insights.push({
    id: "roi-winner", priority: "OPPORTUNITY", score: 58,
    eyebrow: "Crecimiento", title: `${roiWinners[0].label} está devolviendo ${Math.round(roiWinners[0].roi)}% de ROI`,
    detail: `${roiWinners[0].currency} · ingreso de oficina ${formatCommercialAmount(roiWinners[0].currency, roiWinners[0].revenue)} sobre inversión ${formatCommercialAmount(roiWinners[0].currency, roiWinners[0].spend)}.`,
    why: "Es una señal para evaluar aumento de presupuesto, siempre que calidad de leads, capacidad del equipo y muestra sean suficientes.",
    actionLabel: "Analizar campaña", href: "/protected/marketing-roi",
  });

  if (!insights.length) insights.push({
    id: "all-good", priority: "GOOD", score: 10,
    eyebrow: "Control diario", title: "No hay señales críticas abiertas", detail: "Pipeline, SLA y tareas visibles no muestran un bloqueo urgente en este momento.",
    why: "RevScale no genera alertas para llenar el dashboard. Si la evidencia no supera un umbral de intervención, la prioridad queda limpia.",
    actionLabel: "Ver pipeline", href: "/protected/pipeline",
  });

  insights.sort((a, b) => b.score - a.score);
  const topInsights = insights.slice(0, 6);
  const criticalCount = insights.filter((item) => item.priority === "CRITICAL").length;
  const highCount = insights.filter((item) => item.priority === "HIGH").length;
  const brief = criticalCount
    ? `Hay ${criticalCount} prioridad${criticalCount === 1 ? "" : "es"} crítica${criticalCount === 1 ? "" : "s"} que conviene resolver antes de mirar métricas generales.`
    : highCount
      ? `No hay una emergencia crítica, pero sí ${highCount} señal${highCount === 1 ? "" : "es"} de alta prioridad con impacto comercial.`
      : "La operación no muestra bloqueos de alta prioridad. El foco puede pasar a crecimiento y calidad del forecast.";

  return (
    <main className="min-h-screen p-6 text-[#292722] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Decision Intelligence · Dirección</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">RevScale Manager</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Cruza pipeline, velocidad de respuesta, WhatsApp, reactivación, documentos, cobros y ROI para decirte qué requiere una decisión hoy y por qué.</p>
          </div>
          <div className="rounded-xl border border-[#c8b99f] bg-[#e7dccb] px-4 py-3 text-sm text-[#5c5143]"><b>{context.plan}</b> · señales habilitadas por tu plan</div>
        </div>

        {loadErrors.length > 0 && <div className="mt-6 rounded-xl border border-[#d3b7ae] bg-[#f1dfd8] p-4 text-sm text-[#704b3d]">Una fuente de datos no respondió. El Manager muestra las señales disponibles y omite la fuente afectada.</div>}

        <section className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)] md:p-7">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-[#c7b89f] bg-[#e8dece] p-3 text-[#705d42]"><Sparkles size={22} strokeWidth={1.7} /></div>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Brief de Dirección</p><h2 className="mt-2 font-serif text-3xl font-medium">{brief}</h2><p className="mt-3 text-sm leading-6 text-[#6c655c]">Las recomendaciones están ordenadas por urgencia e impacto. Cada una muestra la evidencia que la disparó; no se generan alertas sin una razón verificable.</p></div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric icon={<Flame size={17} />} label="HOT sin humano" value={String(hotNoHuman.length)} />
          <Metric icon={<AlertTriangle size={17} />} label="Riesgo alto" value={String(highRisk.length)} />
          <Metric icon={<Gauge size={17} />} label="SLA" value={`${sla.withinPct}%`} />
          <Metric icon={<RefreshCw size={17} />} label="Recuperables" value={String(strongReactivation.length)} />
          <Metric icon={<FileWarning size={17} />} label="Bloqueos docs" value={String(blockedDocuments)} />
          <Metric icon={<TrendingDown size={17} />} label="ROI negativo" value={String(roiLosers.length)} />
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Action Center</p><h2 className="mt-2 font-serif text-3xl">Qué haría primero</h2></div><span className="text-sm text-[#81796e]">{topInsights.length} señales priorizadas</span></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {topInsights.map((insight, index) => <InsightCard key={insight.id} insight={insight} rank={index + 1} />)}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <Panel icon={<BadgeDollarSign size={19} />} title="Dinero en riesgo" value={moneyList(riskValue)} description={`${highRisk.length} oportunidades abiertas con riesgo alto y valor conocido.`} href="/protected/pipeline?filter=risk" link="Abrir pipeline" />
          <Panel icon={<MessageCircleWarning size={19} />} title="Atención humana" value={String(pendingHandoffs.length + needsHuman.length)} description={`${pendingHandoffs.length} handoffs WhatsApp · ${needsHuman.length} leads marcados para humano.`} href={hasWhatsapp ? "/protected/inbox" : "/protected/leads"} link="Resolver cola" />
          <Panel icon={<BriefcaseBusiness size={19} />} title="Caja pendiente" value={moneyList(overdueCommissionValue)} description={`${overdueCommissions.length} comisiones con fecha vencida y estado aún no cobrado.`} href="/protected/commissions" link="Revisar cobros" />
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Transparencia</p><h2 className="mt-2 font-serif text-2xl">Cómo decide RevScale Manager</h2></div><Link href="/protected/executive" className="text-sm font-semibold text-[#756246]">Abrir dashboard ejecutivo anterior</Link></div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Rule icon={<Target size={18} />} title="Evidencia antes que opinión" text="Cada señal nace de campos concretos: etapa, actividad, SLA, handoff, score de reactivación, estado documental, comisión o gasto." />
            <Rule icon={<TrendingUp size={18} />} title="Impacto antes que volumen" text="Un lead HOT sin humano o una negociación de alto valor pesa más que diez tareas administrativas sin riesgo inmediato." />
            <Rule icon={<AlertTriangle size={18} />} title="Explicable y accionable" text="Siempre muestra por qué se activó la recomendación y te lleva al módulo exacto donde podés resolverla." />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span></div><p className="mt-3 font-serif text-3xl">{value}</p></div>;
}

function InsightCard({ insight, rank }: { insight: ManagerInsight; rank: number }) {
  return <article className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_14px_36px_rgba(72,58,40,.035)]"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">#{rank} · {insight.eyebrow}</p><h3 className="mt-2 font-serif text-2xl font-medium">{insight.title}</h3></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${priorityStyle[insight.priority]}`}>{priorityLabel[insight.priority]}</span></div><p className="mt-3 text-sm leading-6 text-[#625d55]">{insight.detail}</p><div className="mt-4 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">Por qué RevScale piensa esto</p><p className="mt-2 text-sm leading-6 text-[#6d655b]">{insight.why}</p></div><Link href={insight.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6f5c40]">{insight.actionLabel}<ArrowRight size={15} /></Link></article>;
}

function Panel({ icon, title, value, description, href, link }: { icon: React.ReactNode; title: string; value: string; description: string; href: string; link: string }) {
  return <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><div className="flex items-center gap-2 text-[#806d52]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em]">{title}</p></div><p className="mt-3 font-serif text-2xl">{value}</p><p className="mt-3 text-sm leading-6 text-[#71695f]">{description}</p><Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6f5c40]">{link}<ArrowRight size={14} /></Link></div>;
}

function Rule({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-[#ded2c1] bg-[#fffaf2] p-5"><div className="text-[#806d52]">{icon}</div><p className="mt-3 font-semibold text-[#443e36]">{title}</p><p className="mt-2 text-sm leading-6 text-[#71695f]">{text}</p></div>;
}
