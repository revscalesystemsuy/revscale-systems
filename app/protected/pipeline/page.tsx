import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildForecastByCurrency, formatCommercialAmount, LOSS_REASON_LABELS } from "@/lib/pipeline-metrics";
import { calculateOpportunityRisk } from "@/lib/commercial-ops";
import { getPipelineStages, normalizePipelineOperation, type PipelineOperation } from "@/lib/pipeline-config";
import { updatePipelineStage } from "./actions";

export default function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; operation?: string }>;
}) {
  return (
    <Suspense fallback={<PipelineSkeleton />}>
      <PipelineContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PipelineContent({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; operation?: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) redirect("/auth/login");

  const userId = String(claimsData.claims.sub);
  const params = await searchParams;
  const operation: PipelineOperation = normalizePipelineOperation(params.operation);
  const filter = params.filter || "all";
  const stages = getPipelineStages(operation);

  const [{ data: membership }, { data: leadsData, error }, { data: interactionsData }, { data: followupsData }] = await Promise.all([
    supabase.from("organization_members").select("role").eq("user_id", userId).eq("status", "ACTIVE").single(),
    supabase
      .from("leads")
      .select("id,full_name,phone,primary_zone,operation,budget_max,currency,lead_temperature,lead_score,next_action,pipeline_stage,lost_reason,stage_entered_at,expected_close_date,requires_human,created_at")
      .eq("operation", operation)
      .order("updated_at", { ascending: false }),
    supabase.from("latest_interaction_by_lead").select("lead_id,last_interaction_at"),
    supabase.from("followups").select("lead_id,due_at,status").eq("status", "PENDING").order("due_at", { ascending: true }),
  ]);

  const leads = leadsData || [];
  const followups = followupsData || [];
  const lastInteractionByLead = new Map((interactionsData || []).map((item) => [item.lead_id, item.last_interaction_at]));
  const followupsByLead = new Map<string, typeof followups>();
  for (const followup of followups) {
    const existing = followupsByLead.get(followup.lead_id) || [];
    existing.push(followup);
    followupsByLead.set(followup.lead_id, existing);
  }

  const now = new Date();
  const enrichedLeads = leads.map((lead) => {
    const lastInteraction = lastInteractionByLead.get(lead.id) || null;
    const leadFollowups = followupsByLead.get(lead.id) || [];
    const overdueFollowup = leadFollowups.some((item) => item.due_at && new Date(item.due_at).getTime() < now.getTime());
    const risk = calculateOpportunityRisk(lead, {
      now,
      lastInteractionAt: lastInteraction,
      hasPendingFollowup: leadFollowups.length > 0,
      hasOverdueFollowup: overdueFollowup,
    });
    return { ...lead, risk, hasPendingFollowup: leadFollowups.length > 0, hasOverdueFollowup: overdueFollowup };
  });

  const filteredLeads = enrichedLeads.filter((lead) => {
    if (filter === "risk") return lead.risk.level === "HIGH";
    if (filter === "stalled") return lead.risk.isStalled;
    if (filter === "overdue-close") return lead.risk.isExpectedCloseOverdue;
    if (filter === "missing-close") return !lead.expected_close_date && !["WON", "LOST"].includes(lead.pipeline_stage || "NEW");
    if (filter === "hot") return (lead.lead_temperature || "").toUpperCase() === "HOT";
    return true;
  });

  const scopeText = membership?.role === "AGENT"
    ? "Avance comercial de tus leads asignados."
    : membership?.role === "MANAGER"
      ? "Avance comercial de tu equipo."
      : "Avance comercial de toda la organización.";

  const forecast = buildForecastByCurrency(leads);
  const highRiskCount = enrichedLeads.filter((lead) => lead.risk.level === "HIGH").length;
  const stalledCount = enrichedLeads.filter((lead) => lead.risk.isStalled).length;
  const overdueCloseCount = enrichedLeads.filter((lead) => lead.risk.isExpectedCloseOverdue).length;
  const missingCloseCount = enrichedLeads.filter((lead) => !lead.expected_close_date && !["WON", "LOST"].includes(lead.pipeline_stage || "NEW")).length;

  const filters = [
    ["all", "Todos", enrichedLeads.length],
    ["risk", "En riesgo", highRiskCount],
    ["stalled", "Estancados", stalledCount],
    ["overdue-close", "Cierre vencido", overdueCloseCount],
    ["missing-close", "Sin fecha", missingCloseCount],
    ["hot", "HOT", enrichedLeads.filter((lead) => (lead.lead_temperature || "").toUpperCase() === "HOT").length],
  ] as const;

  const operationLabel = operation === "ALQUILER" ? "Alquiler" : "Venta";
  const operationDescription = operation === "ALQUILER"
    ? "Seguimiento desde la consulta hasta documentación, contrato y entrega de llaves."
    : "Seguimiento desde la consulta hasta negociación, reserva y cierre de la venta.";

  const pipelineHref = (nextFilter: string) => {
    const base = `/protected/pipeline?operation=${operation}`;
    return nextFilter === "all" ? base : `${base}&filter=${nextFilter}`;
  };

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1800px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Pipeline comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Pipeline de {operationLabel.toLowerCase()}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55]">{operationDescription} {scopeText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {forecast.length ? forecast.map((item) => (
              <div key={item.currency} className="min-w-[170px] rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">Pipeline · {item.currency}</p>
                <p className="mt-1 font-serif text-xl text-[#302d28]">{formatCommercialAmount(item.currency, item.pipeline)}</p>
                <p className="mt-1 text-[10px] text-[#81796e]">Forecast {formatCommercialAmount(item.currency, item.weighted)}</p>
              </div>
            )) : (
              <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-3 text-sm text-[#756e65]">Sin presupuestos abiertos todavía.</div>
            )}
          </div>
        </div>

        <section className="mt-7 inline-flex rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-1">
          <Link
            href="/protected/pipeline?operation=COMPRA"
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${operation === "COMPRA" ? "bg-[#302d28] !text-[#fffaf2]" : "text-[#625d55] hover:bg-[#eee4d5]"}`}
          >
            Venta
          </Link>
          <Link
            href="/protected/pipeline?operation=ALQUILER"
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${operation === "ALQUILER" ? "bg-[#302d28] !text-[#fffaf2]" : "text-[#625d55] hover:bg-[#eee4d5]"}`}
          >
            Alquiler
          </Link>
        </section>

        <section className="mt-4 flex flex-wrap gap-2">
          {filters.map(([value, label, count]) => (
            <Link
              key={value}
              href={pipelineHref(value)}
              className={`rounded-full border px-3.5 py-2 text-xs font-semibold ${filter === value ? "border-[#6d5b43] bg-[#302d28] !text-[#fffaf2]" : "border-[#d2c5b3] bg-[#f7f0e6] text-[#625d55] hover:border-[#9f8b6e]"}`}
            >
              {label} · {count}
            </Link>
          ))}
        </section>

        {error && <div className="mt-6 rounded-xl border border-[#cfa9a0] bg-[#f5e6e1] p-4 text-sm text-[#7d4d44]">No se pudo cargar el pipeline.</div>}

        <section className="mt-6 overflow-x-auto pb-3">
          <div
            className="grid gap-4"
            style={{ minWidth: `${Math.max(1680, stages.length * 235)}px`, gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))` }}
          >
            {stages.map((stage) => {
              const stageLeads = filteredLeads.filter((lead) => (lead.pipeline_stage || "NEW") === stage.key);
              const stageValues = stageLeads.reduce<Record<string, number>>((acc, lead) => {
                const value = Number(lead.budget_max || 0);
                if (!Number.isFinite(value) || value <= 0) return acc;
                const currency = (lead.currency || "Sin moneda").toUpperCase();
                acc[currency] = (acc[currency] || 0) + value;
                return acc;
              }, {});

              return (
                <div key={stage.key} className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6]">
                  <div className="border-b border-[#d8ccbc] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8d7553]">Etapa</p>
                        <h2 className="mt-1 font-serif text-lg font-medium text-[#302d28]">{stage.label}</h2>
                      </div>
                      <span className="rounded-full border border-[#d0c2ad] bg-[#eee4d5] px-2.5 py-1 text-xs text-[#6b6258]">{stageLeads.length}</span>
                    </div>
                    <p className="mt-2 min-h-10 text-xs leading-5 text-[#756e65]">{stage.hint}</p>
                    <div className="mt-4 space-y-1">
                      {Object.entries(stageValues).map(([currency, value]) => <p key={currency} className="font-serif text-lg text-[#6f5c40]">{formatCommercialAmount(currency, value)}</p>)}
                      {!Object.keys(stageValues).length && <p className="text-xs text-[#756e65]">Sin valor cargado</p>}
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    {stageLeads.map((lead) => (
                      <article key={lead.id} className={`rounded-lg border bg-[#fffaf2] p-4 ${lead.risk.level === "HIGH" ? "border-[#b58d73]" : lead.risk.isStalled ? "border-[#c7a76b]" : "border-[#d8ccbc]"}`}>
                        <Link href={`/protected/leads/${lead.id}`} className="block">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#37332d]">{lead.full_name || "Sin nombre"}</p>
                              <p className="mt-1 text-[11px] text-[#756e65]">{lead.primary_zone || "Zona sin definir"}</p>
                            </div>
                            <RiskPill score={lead.risk.score} level={lead.risk.level} />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {lead.risk.isStalled && <StatusPill label={`${lead.risk.stageAgeDays} d en etapa`} tone="warning" />}
                            {lead.risk.isExpectedCloseOverdue && <StatusPill label="Cierre vencido" tone="danger" />}
                            {!lead.expected_close_date && !["WON", "LOST"].includes(lead.pipeline_stage || "NEW") && <StatusPill label="Sin fecha de cierre" tone="neutral" />}
                            {lead.hasOverdueFollowup && <StatusPill label="Seguimiento vencido" tone="danger" />}
                          </div>

                          <div className="mt-3 border-t border-[#e0d6c8] pt-3 text-xs leading-5 text-[#625d55]">
                            <p>{operationLabel} · {lead.lead_temperature || "Sin prioridad"}</p>
                            <p>{lead.budget_max ? `${lead.currency || "Sin moneda"} ${Number(lead.budget_max).toLocaleString("es-UY")}` : "Presupuesto sin definir"}</p>
                            <p>Fecha de cierre: {lead.expected_close_date || "Sin definir"}</p>
                            <p className="mt-1 text-[#4f4941]">{lead.next_action || "Sin acción definida"}</p>
                            {lead.risk.reasons.length > 0 && <p className="mt-2 text-[#7b5d48]">{lead.risk.reasons.slice(0, 2).join(" · ")}</p>}
                            {lead.pipeline_stage === "LOST" && lead.lost_reason && <p className="mt-2 text-[#7d4d44]">Motivo: {LOSS_REASON_LABELS[lead.lost_reason] || lead.lost_reason}</p>}
                          </div>
                        </Link>

                        <form action={updatePipelineStage} className="mt-3 space-y-2">
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <select name="pipeline_stage" defaultValue={lead.pipeline_stage || "NEW"} className="w-full rounded-md border border-[#cdbfa9] bg-[#f7f0e6] px-2.5 py-2 text-xs text-[#4f4941]">
                            {stages.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                          </select>
                          <select name="lost_reason" defaultValue={lead.lost_reason || ""} className="w-full rounded-md border border-[#cdbfa9] bg-[#fffaf2] px-2.5 py-2 text-xs text-[#4f4941]">
                            <option value="">Motivo si se marca perdido</option>
                            {Object.entries(LOSS_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <button className="w-full rounded-md bg-[#302d28] px-3 py-2 text-xs font-semibold !text-[#fffaf2]">Mover etapa</button>
                        </form>
                      </article>
                    ))}

                    {!stageLeads.length && <div className="rounded-lg border border-dashed border-[#d2c5b3] px-4 py-8 text-center text-xs text-[#756e65]">Sin oportunidades</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="mt-3 text-xs leading-5 text-[#756e65]">Cada tipo de operación tiene sus propias etapas y tiempos recomendados. HOT / WARM / COLD sigue siendo prioridad comercial, no una etapa. El forecast nunca mezcla monedas.</p>
      </div>
    </main>
  );
}

function RiskPill({ score, level }: { score: number; level: "LOW" | "MEDIUM" | "HIGH" }) {
  const label = level === "HIGH" ? "Alto" : level === "MEDIUM" ? "Medio" : "Bajo";
  const className = level === "HIGH"
    ? "border-[#b58d73] bg-[#ead8cb] text-[#6b4433]"
    : level === "MEDIUM"
      ? "border-[#c4a76f] bg-[#efe2c4] text-[#6c5831]"
      : "border-[#c8c0b3] bg-[#eee9e0] text-[#625d55]";
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${className}`}>{label} · {score}</span>;
}

function StatusPill({ label, tone }: { label: string; tone: "danger" | "warning" | "neutral" }) {
  const className = tone === "danger"
    ? "border-[#c7a094] bg-[#f0ddd7] text-[#714b40]"
    : tone === "warning"
      ? "border-[#c9ae78] bg-[#f2e7cb] text-[#6e5b34]"
      : "border-[#c8c0b3] bg-[#eee9e0] text-[#625d55]";
  return <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${className}`}>{label}</span>;
}

function PipelineSkeleton() {
  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1800px] animate-pulse">
        <div className="h-12 w-80 rounded-lg bg-[#e8ddce]" />
        <div className="mt-3 h-5 w-[520px] max-w-full rounded bg-[#eee4d5]" />
        <div className="mt-10 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-80 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6]" />)}
        </div>
      </div>
    </main>
  );
}
