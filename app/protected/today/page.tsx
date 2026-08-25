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
      const overdue = leadFollowups.find((item) => new Date(item.due_at).getTime() < now.getTime());
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
      return { ...lead, risk, action };
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
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Prioridades ordenadas por seguimientos vencidos, cierres previstos, riesgo comercial, estancamiento e intención.</p>

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
              <p className="mt-2 text-sm text-[#81796e]">Cada fila explica qué conviene hacer y por qué.</p>
            </div>
            <Link href="/protected/calendar" className="text-sm font-medium text-[#725d40]">Ver calendario de cierres</Link>
          </div>

          <div className="mt-5 divide-y divide-[#ddd1c0]">
            {priorities.map((item, index) => (
              <article key={item.id} className="grid gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-[44px_1.2fr_1.4fr_150px_90px] lg:items-center">
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
