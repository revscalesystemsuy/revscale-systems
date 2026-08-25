import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  OPEN_PIPELINE_STAGE_SET,
  PIPELINE_STAGE_LABELS,
  buildTodayAction,
  calculateOpportunityRisk,
  getBusinessDateKey,
} from "@/lib/commercial-ops";
import { PIPELINE_STAGES } from "@/lib/pipeline-metrics";
import { updatePipelineStage } from "@/app/protected/pipeline/actions";
import { completeTodayFollowup, createNextDayFollowup } from "./actions";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  await supabase.rpc("refresh_my_commercial_notifications");

  const [{ data: leadsData }, { data: interactionsData }, { data: followupsData }] = await Promise.all([
    supabase
      .from("leads")
      .select("id,full_name,pipeline_stage,stage_entered_at,expected_close_date,lead_temperature,requires_human,next_action,created_at,budget_max,currency")
      .order("lead_score", { ascending: false }),
    supabase.from("interactions").select("lead_id,created_at").order("created_at", { ascending: false }),
    supabase.from("followups").select("id,lead_id,title,due_at,status").eq("status", "PENDING").order("due_at", { ascending: true }),
  ]);

  const now = new Date();
  const today = getBusinessDateKey(now);
  const interactions = interactionsData || [];
  const followups = followupsData || [];

  const priorities = (leadsData || [])
    .filter((lead) => OPEN_PIPELINE_STAGE_SET.has(lead.pipeline_stage || "NEW"))
    .map((lead) => {
      const lastInteraction = interactions.find((item) => item.lead_id === lead.id)?.created_at || null;
      const leadFollowups = followups.filter((item) => item.lead_id === lead.id);
      const overdue = leadFollowups.find((item) => item.due_at && new Date(item.due_at).getTime() < now.getTime());
      const risk = calculateOpportunityRisk(lead, {
        now,
        lastInteractionAt: lastInteraction,
        hasPendingFollowup: leadFollowups.length > 0,
        hasOverdueFollowup: Boolean(overdue),
      });
      const action = buildTodayAction(lead, risk, {
        today,
        hasOverdueFollowup: Boolean(overdue),
        overdueFollowupTitle: overdue?.title || null,
      });
      return { ...lead, risk, action, overdueFollowup: overdue || null, pendingFollowups: leadFollowups.length };
    })
    .sort((a, b) => b.action.priority - a.action.priority || b.risk.score - a.risk.score)
    .slice(0, 20);

  const highRisk = priorities.filter((item) => item.risk.level === "HIGH").length;
  const dueToday = priorities.filter((item) => item.expected_close_date === today).length;
  const overdueClose = priorities.filter((item) => item.risk.isExpectedCloseOverdue).length;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Operación diaria</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Qué hacer hoy</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Prioridades ordenadas por seguimientos vencidos, cierres previstos, riesgo comercial, estancamiento e intención. Ahora podés resolver las acciones sin salir de esta vista.</p>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Acciones priorizadas" value={priorities.length} />
          <Metric title="Riesgo alto" value={highRisk} />
          <Metric title="Cierres previstos hoy" value={dueToday} />
          <Metric title="Cierres vencidos" value={overdueClose} />
        </section>

        <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#37332d]">Prioridad comercial</h2>
              <p className="mt-2 text-sm text-[#81796e]">Cada oportunidad incluye la acción recomendada y controles rápidos para ejecutarla.</p>
            </div>
            <Link href="/protected/calendar" className="text-sm font-medium text-[#725d40]">Ver calendario de cierres</Link>
          </div>

          <div className="mt-5 space-y-4">
            {priorities.map((item, index) => (
              <article key={item.id} className="rounded-xl border border-[#d8ccbc] bg-[#fffaf2] p-5">
                <div className="grid gap-4 lg:grid-cols-[44px_1.1fr_1.5fr_130px_90px] lg:items-center">
                  <span className="font-serif text-xl text-[#948978]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <Link href={`/protected/leads/${item.id}`} className="font-medium text-[#37332d] hover:text-[#725d40]">{item.full_name || "Sin nombre"}</Link>
                    <p className="mt-1 text-xs text-[#81796e]">{PIPELINE_STAGE_LABELS[item.pipeline_stage || "NEW"] || item.pipeline_stage}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[#403b34]">{item.action.action}</p>
                    <p className="mt-1 text-xs leading-5 text-[#81796e]">{item.action.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[#81796e]">Riesgo</p>
                    <p className="mt-1 font-serif text-xl text-[#4b4238]">{item.risk.score}/100</p>
                  </div>
                  <RiskPill level={item.risk.level} />
                </div>

                <div className="mt-5 grid gap-3 border-t border-[#e0d6c8] pt-4 md:grid-cols-2 xl:grid-cols-4">
                  {item.overdueFollowup ? (
                    <form action={completeTodayFollowup}>
                      <input type="hidden" name="followup_id" value={item.overdueFollowup.id} />
                      <input type="hidden" name="lead_id" value={item.id} />
                      <button className="w-full rounded-lg bg-[#302d28] px-3 py-2.5 text-xs font-semibold !text-[#fffaf2]">Marcar seguimiento hecho</button>
                    </form>
                  ) : (
                    <form action={createNextDayFollowup}>
                      <input type="hidden" name="lead_id" value={item.id} />
                      <input type="hidden" name="title" value={item.next_action || "Retomar contacto"} />
                      <button className="w-full rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-3 py-2.5 text-xs font-semibold text-[#554f47]">Seguimiento para mañana</button>
                    </form>
                  )}

                  <form action={updatePipelineStage} className="flex gap-2">
                    <input type="hidden" name="lead_id" value={item.id} />
                    <input type="hidden" name="lost_reason" value="" />
                    <select name="pipeline_stage" defaultValue={item.pipeline_stage || "NEW"} className="min-w-0 flex-1 rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-2.5 py-2 text-xs text-[#4f4941]">
                      {PIPELINE_STAGES.filter(([value]) => value !== "LOST").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#554f47]">Mover</button>
                  </form>

                  <Link href={`/protected/leads/${item.id}/edit`} className="inline-flex items-center justify-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-xs font-semibold text-[#554f47]">Editar cierre / datos</Link>
                  <Link href={`/protected/leads/${item.id}`} className="inline-flex items-center justify-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-xs font-semibold text-[#554f47]">Abrir ficha comercial</Link>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#81796e]">
                  <span>{item.pendingFollowups} seguimientos pendientes</span>
                  <span>·</span>
                  <span>Cierre: {item.expected_close_date || "sin definir"}</span>
                  {item.budget_max ? <><span>·</span><span>{item.currency || "Sin moneda"} {Number(item.budget_max).toLocaleString("es-UY")}</span></> : null}
                </div>
              </article>
            ))}
            {!priorities.length && <p className="py-5 text-sm text-[#81796e]">No hay oportunidades abiertas que requieran acción.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-[2rem] leading-none text-[#2f2c27]">{value}</p></div>;
}

function RiskPill({ level }: { level: "LOW" | "MEDIUM" | "HIGH" }) {
  const label = level === "HIGH" ? "Alto" : level === "MEDIUM" ? "Medio" : "Bajo";
  const className = level === "HIGH" ? "border-[#b58d73] bg-[#ead8cb] text-[#6b4433]" : level === "MEDIUM" ? "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]" : "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]";
  return <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}
