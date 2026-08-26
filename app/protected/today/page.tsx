import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OPEN_PIPELINE_STAGE_SET, PIPELINE_STAGE_LABELS, buildTodayAction, calculateOpportunityRisk, getBusinessDateKey } from "@/lib/commercial-ops";
import { PIPELINE_STAGES } from "@/lib/pipeline-metrics";
import { getSlaStatus } from "@/lib/sla-metrics";
import { updatePipelineStage } from "@/app/protected/pipeline/actions";
import WhatsAppButton from "@/app/protected/leads/[id]/WhatsAppButton";
import { completeTodayFollowup, createNextDayFollowup } from "./actions";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", userId).eq("status", "ACTIVE").single();
  if (!membership) redirect("/protected");
  await supabase.rpc("refresh_my_commercial_notifications");

  const [{ data: leadsData }, { data: interactionsData }, { data: followupsData }, { data: slaSettings }] = await Promise.all([
    supabase.from("leads").select("id,full_name,phone,pipeline_stage,stage_entered_at,expected_close_date,lead_temperature,requires_human,next_action,created_at,budget_max,currency,source_channel,source_provider,source_campaign,assigned_at,first_human_response_at,sla_deadline,sla_breached_at").order("lead_score", { ascending: false }),
    supabase.from("latest_interaction_by_lead").select("lead_id,last_interaction_at"),
    supabase.from("followups").select("id,lead_id,title,due_at,status").eq("status", "PENDING").order("due_at", { ascending: true }),
    supabase.from("organization_sla_settings").select("is_enabled,warning_minutes_before").eq("organization_id", membership.organization_id).maybeSingle(),
  ]);

  const now = new Date();
  const today = getBusinessDateKey(now);
  const warningMinutes = slaSettings?.warning_minutes_before ?? 5;
  const slaEnabled = slaSettings?.is_enabled !== false;
  const lastInteractionByLead = new Map((interactionsData || []).map((item) => [item.lead_id, item.last_interaction_at]));
  const followupsByLead = new Map<string, typeof followupsData>();
  for (const followup of followupsData || []) {
    const existing = followupsByLead.get(followup.lead_id) || [];
    existing.push(followup);
    followupsByLead.set(followup.lead_id, existing);
  }

  const priorities = (leadsData || []).filter((lead) => OPEN_PIPELINE_STAGE_SET.has(lead.pipeline_stage || "NEW")).map((lead) => {
    const lastInteraction = lastInteractionByLead.get(lead.id) || null;
    const leadFollowups = followupsByLead.get(lead.id) || [];
    const overdue = leadFollowups.find((item) => item.due_at && new Date(item.due_at).getTime() < now.getTime());
    const risk = calculateOpportunityRisk(lead, { now, lastInteractionAt: lastInteraction, hasPendingFollowup: leadFollowups.length > 0, hasOverdueFollowup: Boolean(overdue) });
    const action = buildTodayAction(lead, risk, { today, hasOverdueFollowup: Boolean(overdue), overdueFollowupTitle: overdue?.title || null });
    return { ...lead, risk, action, overdueFollowup: overdue || null, pendingFollowups: leadFollowups.length };
  }).sort((a, b) => b.action.priority - a.action.priority || b.risk.score - a.risk.score).slice(0, 20);

  const slaQueue = slaEnabled ? (leadsData || []).filter((lead) => OPEN_PIPELINE_STAGE_SET.has(lead.pipeline_stage || "NEW") && lead.sla_deadline && !lead.first_human_response_at).map((lead) => ({ ...lead, slaStatus: getSlaStatus(lead, now, warningMinutes) })).filter((lead) => ["WAITING", "WARNING", "BREACHED"].includes(lead.slaStatus)).sort((a, b) => {
    const rank: Record<string, number> = { BREACHED: 3, WARNING: 2, WAITING: 1 };
    const statusDiff = (rank[b.slaStatus] || 0) - (rank[a.slaStatus] || 0);
    if (statusDiff) return statusDiff;
    if (a.lead_temperature === "HOT" && b.lead_temperature !== "HOT") return -1;
    if (b.lead_temperature === "HOT" && a.lead_temperature !== "HOT") return 1;
    return new Date(a.sla_deadline!).getTime() - new Date(b.sla_deadline!).getTime();
  }).slice(0, 10) : [];

  const highRisk = priorities.filter((item) => item.risk.level === "HIGH").length;
  const dueToday = priorities.filter((item) => item.expected_close_date === today).length;
  const overdueClose = priorities.filter((item) => item.risk.isExpectedCloseOverdue).length;
  const slaBreached = slaQueue.filter((item) => item.slaStatus === "BREACHED").length;

  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Operación diaria</p>
    <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Qué hacer hoy</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Prioridades ordenadas por primera respuesta, seguimientos vencidos, cierres previstos, riesgo comercial, estancamiento e intención. Podés resolver las acciones sin salir de esta vista.</p>

    <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric title="Acciones priorizadas" value={priorities.length} /><Metric title="SLA vencido" value={slaBreached} /><Metric title="Riesgo alto" value={highRisk} /><Metric title="Cierres previstos hoy" value={dueToday} /><Metric title="Cierres vencidos" value={overdueClose} /></section>

    {slaEnabled && <section className="mt-7 rounded-xl border border-[#cbb99f] bg-[#efe3d3] p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#80694b]">Velocidad de primera respuesta</p><h2 className="mt-2 font-serif text-2xl font-medium text-[#37332d]">SLA que requiere atención</h2><p className="mt-2 text-sm leading-6 text-[#71675b]">La respuesta de IA no cierra este reloj: RevScale espera la primera respuesta humana.</p></div><Link href="/protected/settings/sla" className="text-sm font-medium text-[#725d40]">Ver configuración SLA</Link></div><div className="mt-5 space-y-3">{slaQueue.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.slaStatus === "BREACHED" ? "border-[#b88e75] bg-[#f1dfd2]" : item.slaStatus === "WARNING" ? "border-[#c4a86e] bg-[#f3e8cf]" : "border-[#d7caba] bg-[#fffaf2]"}`}><div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_160px_150px] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><Link href={`/protected/leads/${item.id}`} className="font-semibold text-[#37332d] hover:text-[#725d40]">{item.full_name || "Sin nombre"}</Link>{item.lead_temperature === "HOT" && <span className="rounded-full border border-[#d5b9ac] bg-[#f2e1da] px-2 py-0.5 text-[10px] font-semibold text-[#7a5044]">HOT</span>}</div><p className="mt-1 text-xs text-[#81796e]">{item.source_provider || item.source_channel || "Origen sin atribuir"}{item.source_campaign ? ` · ${item.source_campaign}` : ""}</p></div><div><p className="text-xs uppercase tracking-[0.12em] text-[#81796e]">Vencimiento</p><p className="mt-1 text-sm font-medium text-[#4f493f]">{formatDateTime(item.sla_deadline)}</p></div><SlaPill status={item.slaStatus} /><div className="flex gap-2"><WhatsAppButton leadId={item.id} phone={item.phone} compact /><Link href={`/protected/leads/${item.id}`} className="inline-flex items-center justify-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#554f47]">Abrir</Link></div></div></article>)}{!slaQueue.length && <p className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4 text-sm text-[#81796e]">No hay leads esperando primera respuesta humana dentro del SLA.</p>}</div></section>}

    <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-serif text-2xl font-medium text-[#37332d]">Prioridad comercial</h2><p className="mt-2 text-sm text-[#81796e]">Cada oportunidad incluye la acción recomendada y controles rápidos para ejecutarla.</p></div><Link href="/protected/calendar" className="text-sm font-medium text-[#725d40]">Ver calendario de cierres</Link></div><div className="mt-5 space-y-4">{priorities.map((item, index) => <article key={item.id} className="rounded-xl border border-[#d8ccbc] bg-[#fffaf2] p-5"><div className="grid gap-4 lg:grid-cols-[44px_1.1fr_1.5fr_130px_90px] lg:items-center"><span className="font-serif text-xl text-[#948978]">{String(index + 1).padStart(2, "0")}</span><div><Link href={`/protected/leads/${item.id}`} className="font-medium text-[#37332d] hover:text-[#725d40]">{item.full_name || "Sin nombre"}</Link><p className="mt-1 text-xs text-[#81796e]">{PIPELINE_STAGE_LABELS[item.pipeline_stage || "NEW"] || item.pipeline_stage}</p></div><div><p className="font-medium text-[#403b34]">{item.action.action}</p><p className="mt-1 text-xs leading-5 text-[#81796e]">{item.action.reason}</p></div><div><p className="text-xs uppercase tracking-[0.12em] text-[#81796e]">Riesgo</p><p className="mt-1 font-serif text-xl text-[#4b4238]">{item.risk.score}/100</p></div><RiskPill level={item.risk.level} /></div><div className="mt-5 grid gap-3 border-t border-[#e0d6c8] pt-4 md:grid-cols-2 xl:grid-cols-5">{item.overdueFollowup ? <form action={completeTodayFollowup}><input type="hidden" name="followup_id" value={item.overdueFollowup.id} /><input type="hidden" name="lead_id" value={item.id} /><button className="w-full rounded-lg bg-[#302d28] px-3 py-2.5 text-xs font-semibold !text-[#fffaf2]">Marcar seguimiento hecho</button></form> : <form action={createNextDayFollowup}><input type="hidden" name="lead_id" value={item.id} /><input type="hidden" name="title" value={item.next_action || "Retomar contacto"} /><button className="w-full rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-3 py-2.5 text-xs font-semibold text-[#554f47]">Próximo día hábil · 09:00</button></form>}<form action={updatePipelineStage} className="flex gap-2"><input type="hidden" name="lead_id" value={item.id} /><input type="hidden" name="lost_reason" value="" /><select name="pipeline_stage" defaultValue={item.pipeline_stage || "NEW"} className="min-w-0 flex-1 rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-2.5 py-2 text-xs text-[#4f4941]">{PIPELINE_STAGES.filter(([value]) => value !== "LOST").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#554f47]">Mover</button></form><WhatsAppButton leadId={item.id} phone={item.phone} compact /><Link href={`/protected/leads/${item.id}/edit`} className="inline-flex items-center justify-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-xs font-semibold text-[#554f47]">Editar cierre / datos</Link><Link href={`/protected/leads/${item.id}`} className="inline-flex items-center justify-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-xs font-semibold text-[#554f47]">Abrir ficha comercial</Link></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#81796e]"><span>{item.pendingFollowups} seguimientos pendientes</span><span>·</span><span>Cierre: {item.expected_close_date || "sin definir"}</span>{item.budget_max ? <><span>·</span><span>{item.currency || "Sin moneda"} {Number(item.budget_max).toLocaleString("es-UY")}</span></> : null}</div></article>)}{!priorities.length && <p className="py-5 text-sm text-[#81796e]">No hay oportunidades abiertas que requieran acción.</p>}</div></section>
  </div></main>;
}

function Metric({ title, value }: { title: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-[2rem] leading-none text-[#2f2c27]">{value}</p></div>; }
function RiskPill({ level }: { level: "LOW" | "MEDIUM" | "HIGH" }) { const label = level === "HIGH" ? "Alto" : level === "MEDIUM" ? "Medio" : "Bajo"; const className = level === "HIGH" ? "border-[#b58d73] bg-[#ead8cb] text-[#6b4433]" : level === "MEDIUM" ? "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]" : "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]"; return <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>; }
function SlaPill({ status }: { status: ReturnType<typeof getSlaStatus> }) { const label = status === "BREACHED" ? "Incumplido" : status === "WARNING" ? "Por vencer" : status === "WITHIN" ? "Cumplido" : status === "UNASSIGNED" ? "Sin SLA" : "En SLA"; const className = status === "BREACHED" ? "border-[#b88e75] bg-[#ead3c3] text-[#6b4433]" : status === "WARNING" ? "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]" : status === "WITHIN" ? "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]" : "border-[#d2c5b3] bg-[#eee4d5] text-[#6f6558]"; return <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>; }
function formatDateTime(value: string | null) { if (!value) return "Sin vencimiento"; return new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value)); }
