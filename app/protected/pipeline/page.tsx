import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildForecastByCurrency, formatCommercialAmount, LOSS_REASON_LABELS } from "@/lib/pipeline-metrics";
import { updatePipelineStage } from "./actions";

const STAGES = [
  { key: "NEW", label: "Nuevo lead", hint: "Pendiente de contacto" },
  { key: "CONTACTED", label: "Contactado", hint: "Conversación iniciada" },
  { key: "QUALIFIED", label: "Calificado", hint: "Necesidad validada" },
  { key: "VISIT", label: "Visita", hint: "Propiedad visitada" },
  { key: "NEGOTIATION", label: "Negociación", hint: "Condiciones en curso" },
  { key: "WON", label: "Cierre", hint: "Operación concretada" },
  { key: "LOST", label: "Perdido", hint: "Oportunidad cerrada" },
] as const;

export default function PipelinePage() {
  return (
    <Suspense fallback={<PipelineSkeleton />}>
      <PipelineContent />
    </Suspense>
  );
}

async function PipelineContent() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) redirect("/auth/login");

  const userId = String(claimsData.claims.sub);
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id,full_name,phone,primary_zone,operation,budget_max,currency,lead_temperature,lead_score,next_action,pipeline_stage,lost_reason")
    .order("updated_at", { ascending: false });

  const scopeText = membership?.role === "AGENT"
    ? "Avance comercial de tus leads asignados."
    : membership?.role === "MANAGER"
      ? "Avance comercial de tu equipo."
      : "Avance comercial de toda la organización.";

  const forecast = buildForecastByCurrency(leads || []);

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1700px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Pipeline comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Pipeline de ventas</h1>
            <p className="mt-3 text-sm leading-6 text-[#625d55]">{scopeText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {forecast.length ? forecast.map((item) => (
              <div key={item.currency} className="min-w-[170px] rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">Pipeline · {item.currency}</p>
                <p className="mt-1 font-serif text-xl text-[#302d28]">{formatCommercialAmount(item.currency, item.pipeline)}</p>
                <p className="mt-1 text-[10px] text-[#81796e]">Forecast {formatCommercialAmount(item.currency, item.weighted)}</p>
              </div>
            )) : (
              <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-3 text-sm text-[#81796e]">Sin presupuestos abiertos todavía.</div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-[#cfa9a0] bg-[#f5e6e1] p-4 text-sm text-[#7d4d44]">No se pudo cargar el pipeline.</div>
        )}

        <section className="mt-8 overflow-x-auto pb-3">
          <div className="grid min-w-[1680px] grid-cols-7 gap-4">
            {STAGES.map((stage) => {
              const stageLeads = (leads || []).filter((lead) => (lead.pipeline_stage || "NEW") === stage.key);
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
                    <p className="mt-2 text-xs leading-5 text-[#7b746a]">{stage.hint}</p>
                    <div className="mt-4 space-y-1">
                      {Object.entries(stageValues).map(([currency, value]) => <p key={currency} className="font-serif text-lg text-[#6f5c40]">{formatCommercialAmount(currency, value)}</p>)}
                      {!Object.keys(stageValues).length && <p className="text-xs text-[#92897d]">Sin valor cargado</p>}
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    {stageLeads.map((lead) => (
                      <article key={lead.id} className="rounded-lg border border-[#d8ccbc] bg-[#fffaf2] p-4">
                        <Link href={`/protected/leads/${lead.id}`} className="block">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#37332d]">{lead.full_name || "Sin nombre"}</p>
                              <p className="mt-1 text-[11px] text-[#81796e]">{lead.primary_zone || "Zona sin definir"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] uppercase tracking-[0.12em] text-[#8b8378]">Score</p>
                              <p className="font-serif text-lg text-[#6f5c40]">{lead.lead_score ?? "—"}</p>
                            </div>
                          </div>
                          <div className="mt-3 border-t border-[#e0d6c8] pt-3 text-xs leading-5 text-[#6d665d]">
                            <p>{lead.operation || "Operación sin definir"} · {lead.lead_temperature || "Sin prioridad"}</p>
                            <p>{lead.budget_max ? `${lead.currency || "Sin moneda"} ${Number(lead.budget_max).toLocaleString("es-UY")}` : "Presupuesto sin definir"}</p>
                            <p className="mt-1 text-[#554f47]">{lead.next_action || "Sin acción definida"}</p>
                            {lead.pipeline_stage === "LOST" && lead.lost_reason && <p className="mt-2 text-[#7d4d44]">Motivo: {LOSS_REASON_LABELS[lead.lost_reason] || lead.lost_reason}</p>}
                          </div>
                        </Link>

                        <form action={updatePipelineStage} className="mt-3 space-y-2">
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <select
                            name="pipeline_stage"
                            defaultValue={lead.pipeline_stage || "NEW"}
                            className="w-full rounded-md border border-[#cdbfa9] bg-[#f7f0e6] px-2.5 py-2 text-xs text-[#4f4941]"
                          >
                            {STAGES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                          </select>
                          <select name="lost_reason" defaultValue={lead.lost_reason || ""} className="w-full rounded-md border border-[#cdbfa9] bg-[#fffaf2] px-2.5 py-2 text-xs text-[#4f4941]">
                            <option value="">Motivo si se marca perdido</option>
                            {Object.entries(LOSS_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <button className="w-full rounded-md bg-[#302d28] px-3 py-2 text-xs font-semibold !text-[#fffaf2]">Mover etapa</button>
                        </form>
                      </article>
                    ))}

                    {!stageLeads.length && (
                      <div className="rounded-lg border border-dashed border-[#d2c5b3] px-4 py-8 text-center text-xs text-[#92897d]">Sin oportunidades</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <p className="mt-3 text-xs text-[#81796e]">El forecast pondera el presupuesto máximo según la etapa comercial. No representa comisión ni facturación de RevScale.</p>
      </div>
    </main>
  );
}

function PipelineSkeleton() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-[1600px] animate-pulse">
        <div className="h-10 w-64 rounded bg-[#e1d6c7]" />
        <div className="mt-8 h-[520px] rounded-2xl bg-[#e7dccd]" />
      </div>
    </main>
  );
}
