import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createLeadFollowup, createQuickFollowup, updateExpectedCloseDate } from "./actions";
import WhatsAppButton from "./WhatsAppButton";
import { getMatchingProperties } from "./match-actions";
import PropertyWhatsAppButton from "./PropertyWhatsAppButton";
import { currentPlanHasFeature } from "@/lib/plan-access";
import { calculateOpportunityRisk, PIPELINE_STAGE_LABELS } from "@/lib/commercial-ops";
import { formatDuration, LOSS_REASON_LABELS, PIPELINE_STAGES } from "@/lib/pipeline-metrics";
import { updatePipelineStage } from "@/app/protected/pipeline/actions";
import Link from "next/link";
import { CalendarClock, Pencil } from "lucide-react";

function formatMontevideoDateTimeLocal(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select(`
      id, full_name, phone, email, operation, property_type, primary_zone,
      budget_max, currency, bedrooms_min, lead_score, lead_temperature,
      next_action, requires_human, pipeline_stage, lost_reason,
      stage_entered_at, expected_close_date, created_at, closed_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (!lead) redirect("/protected/leads");

  const hasAdvancedAI = await currentPlanHasFeature("ai_assistant");
  const matches = hasAdvancedAI ? await getMatchingProperties(lead.id) : [];
  const aiLevel = lead.lead_score >= 80 ? "Alta" : lead.lead_score >= 50 ? "Media" : "Baja";

  const [{ data: interactionsData }, { data: followupsData }, { data: stageEventsData }] = await Promise.all([
    supabase.from("interactions").select("id,channel,direction,actor,message,detected_intent,created_at").eq("lead_id", lead.id).order("created_at", { ascending: false }),
    supabase.from("followups").select("id,title,notes,due_at,priority,status,completed_at,created_at").eq("lead_id", lead.id).order("due_at", { ascending: true }),
    supabase.from("lead_stage_events").select("id,from_stage,to_stage,changed_by,lost_reason,previous_stage_duration_seconds,event_source,changed_at").eq("lead_id", lead.id).order("changed_at", { ascending: false }),
  ]);

  const interactions = interactionsData || [];
  const followups = followupsData || [];
  const stageEvents = stageEventsData || [];
  const pendingFollowups = followups.filter((item) => item.status === "PENDING");
  const now = new Date();
  const overdueFollowups = pendingFollowups.filter((item) => item.due_at && new Date(item.due_at).getTime() < now.getTime());
  const lastInteractionAt = interactions[0]?.created_at || null;
  const risk = calculateOpportunityRisk(lead, {
    now,
    lastInteractionAt,
    hasPendingFollowup: pendingFollowups.length > 0,
    hasOverdueFollowup: overdueFollowups.length > 0,
  });

  const actorIds = [...new Set(stageEvents.map((event) => event.changed_by).filter(Boolean))] as string[];
  const { data: actorProfiles } = actorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const actorNames = new Map((actorProfiles || []).map((profile) => [profile.id, profile.full_name || "Usuario"]));

  const defaultQuickDue = formatMontevideoDateTimeLocal(new Date(Date.now() + 86_400_000));

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Centro comercial del lead</p>
            <h1 className="mt-3 font-serif text-4xl font-medium text-[#292722] md:text-5xl">{lead.full_name || "Sin nombre"}</h1>
            <p className="mt-2 text-sm text-[#6c655c]">Estado, riesgo, próximos pasos e historial en una sola vista.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RiskPill score={risk.score} level={risk.level} />
            <Link href={`/protected/leads/${lead.id}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">
              <Pencil size={15} /> Editar lead
            </Link>
          </div>
        </div>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Riesgo comercial" value={`${risk.score}/100`} detail={risk.level === "HIGH" ? "Alto" : risk.level === "MEDIUM" ? "Medio" : "Bajo"} />
          <Metric title="Tiempo en etapa" value={`${risk.stageAgeDays} d`} detail={PIPELINE_STAGE_LABELS[lead.pipeline_stage || "NEW"] || lead.pipeline_stage || "Nuevo lead"} />
          <Metric title="Seguimientos pendientes" value={pendingFollowups.length} detail={overdueFollowups.length ? `${overdueFollowups.length} vencido${overdueFollowups.length === 1 ? "" : "s"}` : "Al día"} />
          <Metric title="Cierre previsto" value={lead.expected_close_date || "Sin fecha"} detail={risk.isExpectedCloseOverdue ? "Fecha vencida" : "Forecast comercial"} />
        </section>

        {risk.reasons.length > 0 && (
          <section className="mt-5 rounded-xl border border-[#cdb69a] bg-[#efe3d3] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7e6648]">Por qué tiene este riesgo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {risk.reasons.map((reason) => <span key={reason} className="rounded-full border border-[#cdb69a] bg-[#f8f0e5] px-3 py-1.5 text-xs text-[#665440]">{reason}</span>)}
            </div>
          </section>
        )}

        <section className="mt-7 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <Card title="Resumen comercial">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Etapa" value={PIPELINE_STAGE_LABELS[lead.pipeline_stage || "NEW"] || lead.pipeline_stage || "Nuevo lead"} />
                <Info label="Prioridad" value={lead.lead_temperature || "Sin definir"} />
                <Info label="Score" value={String(lead.lead_score ?? "—")} />
                <Info label="Próxima acción" value={lead.next_action || "Sin acción definida"} />
                <Info label="Presupuesto" value={lead.budget_max ? `${lead.currency || "Sin moneda"} ${Number(lead.budget_max).toLocaleString("es-UY")}` : "Sin definir"} />
                <Info label="Fecha estimada" value={lead.expected_close_date || "Sin definir"} />
                {lead.pipeline_stage === "LOST" && <Info label="Motivo de pérdida" value={lead.lost_reason ? LOSS_REASON_LABELS[lead.lost_reason] || lead.lost_reason : "Sin motivo cargado"} />}
                {lead.closed_at && <Info label="Cierre registrado" value={new Date(lead.closed_at).toLocaleString("es-UY", { timeZone: "America/Montevideo" })} />}
              </div>
            </Card>

            <Card title="Historial de etapas">
              <p className="mb-4 text-sm leading-6 text-[#7b746a]">RevScale registra las transiciones desde que se activó el historial comercial. No inventa etapas anteriores.</p>
              <div className="space-y-3">
                {stageEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#403b34]">
                          {event.from_stage ? `${PIPELINE_STAGE_LABELS[event.from_stage] || event.from_stage} → ` : "Inicio → "}
                          {PIPELINE_STAGE_LABELS[event.to_stage] || event.to_stage}
                        </p>
                        <p className="mt-1 text-xs text-[#81796e]">
                          {event.previous_stage_duration_seconds !== null ? `Etapa anterior: ${formatDuration(Number(event.previous_stage_duration_seconds))}` : "Duración anterior no disponible"}
                        </p>
                      </div>
                      <span className="text-xs text-[#92897d]">{new Date(event.changed_at).toLocaleString("es-UY", { timeZone: "America/Montevideo" })}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#81796e]">
                      <span>Actor: {event.changed_by ? actorNames.get(event.changed_by) || "Usuario" : "Sistema"}</span>
                      <span>Origen: {event.event_source || "Sistema"}</span>
                      {event.lost_reason && <span>Motivo: {LOSS_REASON_LABELS[event.lost_reason] || event.lost_reason}</span>}
                    </div>
                  </div>
                ))}
                {!stageEvents.length && <p className="text-sm text-[#81796e]">Todavía no hay transiciones registradas para este lead.</p>}
              </div>
            </Card>

            <Card title="Historial comercial">
              {!interactions.length && <p className="text-[#7b746a]">Todavía no hay interacciones.</p>}
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-[#6f5c40]">{interaction.detected_intent === "ENVIAR_PROPIEDAD" ? "Propiedad enviada" : interaction.detected_intent === "CONTACTAR_LEAD" ? "Contacto realizado" : interaction.channel}</span>
                      <span className="text-xs text-[#92897d]">{new Date(interaction.created_at).toLocaleString("es-UY", { timeZone: "America/Montevideo" })}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#5f594f]">{interaction.message}</p>
                    <p className="mt-2 text-xs text-[#8b8378]">Realizado por: {interaction.actor}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card title="Acciones rápidas">
              <form action={updatePipelineStage} className="space-y-2">
                <input type="hidden" name="lead_id" value={lead.id} />
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#81796e]">Mover etapa</label>
                <select name="pipeline_stage" defaultValue={lead.pipeline_stage || "NEW"} className="w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#4f4941]">
                  {PIPELINE_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select name="lost_reason" defaultValue={lead.lost_reason || ""} className="w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#4f4941]">
                  <option value="">Motivo si se marca perdido</option>
                  {Object.entries(LOSS_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button className="w-full rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">Actualizar etapa</button>
              </form>

              <form action={updateExpectedCloseDate} className="mt-5 border-t border-[#ddd1c0] pt-5">
                <input type="hidden" name="lead_id" value={lead.id} />
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#81796e]">Fecha de cierre</label>
                <input name="expected_close_date" type="date" defaultValue={lead.expected_close_date || ""} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#4f4941]" />
                <button className="mt-2 w-full rounded-lg border border-[#bfae96] bg-[#eee4d5] px-4 py-2.5 text-sm font-semibold text-[#554f47]">Guardar fecha</button>
              </form>

              <form action={createQuickFollowup} className="mt-5 border-t border-[#ddd1c0] pt-5">
                <input type="hidden" name="lead_id" value={lead.id} />
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#81796e]">Nuevo seguimiento</label>
                <input name="title" defaultValue={lead.next_action || "Seguimiento comercial"} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#4f4941]" />
                <input name="due_at" type="datetime-local" defaultValue={defaultQuickDue} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#4f4941]" />
                <p className="mt-1.5 text-[11px] text-[#8a8176]">Hora de Uruguay</p>
                <button className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#bfae96] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#554f47]"><CalendarClock size={15} /> Crear seguimiento</button>
              </form>

              <WhatsAppButton leadId={lead.id} phone={lead.phone} />
            </Card>

            <Card title="Seguimientos">
              <div className="space-y-3">
                {pendingFollowups.map((followup) => {
                  const overdue = Boolean(followup.due_at && new Date(followup.due_at).getTime() < now.getTime());
                  return (
                    <div key={followup.id} className={`rounded-xl border p-4 ${overdue ? "border-[#c9a69a] bg-[#f1dfd8]" : "border-[#d7caba] bg-[#fffaf2]"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-[#403b34]">{followup.title}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{followup.priority}</span>
                      </div>
                      <p className="mt-2 text-xs text-[#81796e]">{followup.due_at ? new Date(followup.due_at).toLocaleString("es-UY", { timeZone: "America/Montevideo" }) : "Sin fecha"}</p>
                      {followup.notes && <p className="mt-2 text-xs leading-5 text-[#6d665d]">{followup.notes}</p>}
                      {overdue && <p className="mt-2 text-xs font-semibold text-[#744d40]">Seguimiento vencido</p>}
                    </div>
                  );
                })}
                {!pendingFollowups.length && <p className="text-sm text-[#81796e]">No hay seguimientos pendientes.</p>}
              </div>
              <Link href="/protected/followups" className="mt-4 inline-block text-sm font-medium text-[#725d40]">Ver todos los seguimientos</Link>
            </Card>

            <Card title="Información">
              <Info label="Teléfono" value={lead.phone || "Sin teléfono"} />
              <div className="mt-3"><Info label="Email" value={lead.email || "Sin email"} /></div>
              <div className="mt-3"><Info label="Operación" value={lead.operation || "Sin definir"} /></div>
              <div className="mt-3"><Info label="Tipo" value={lead.property_type || "Sin definir"} /></div>
              <div className="mt-3"><Info label="Zona" value={lead.primary_zone || "Sin definir"} /></div>
              <div className="mt-3"><Info label="Dormitorios" value={lead.bedrooms_min === null ? "Sin definir" : String(lead.bedrooms_min)} /></div>
            </Card>

            {hasAdvancedAI ? (
              <Card title="Asistente comercial">
                <p>Probabilidad: <b className="text-[#6f5c40]">{aiLevel}</b></p>
                <div className="mt-4 space-y-2 text-[#625d55]">
                  {lead.lead_score >= 80 && <p>Score alto de oportunidad</p>}
                  {lead.primary_zone && <p>Zona definida</p>}
                  {lead.budget_max && <p>Presupuesto informado</p>}
                  <p className="text-[#6f5c40]">Próxima acción: {lead.next_action || "Contactar cliente"}</p>
                </div>
                <form action={createLeadFollowup}>
                  <input type="hidden" name="lead_id" value={lead.id} />
                  <button className="mt-5 w-full rounded-lg bg-[#302d28] px-5 py-2.5 font-semibold !text-[#fffaf2]">Agendar visita</button>
                </form>
                {matches.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-serif text-xl font-medium text-[#37332d]">Matching de propiedades</h3>
                    <div className="mt-4 space-y-3">
                      {matches.map((property) => (
                        <div key={property.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
                          <p className="font-semibold">{property.title}</p>
                          <p className="mt-1 text-[#6f5c40]">Compatibilidad: {property.compatibility}%</p>
                          <p className="mt-1 text-sm text-[#756e64]">{property.zone}</p>
                          <p className="mt-1 text-sm text-[#756e64]">{property.currency} {Number(property.price).toLocaleString("es-UY")}</p>
                          <div className="mt-3 text-sm text-[#756e64]">{property.reasons.map((reason: string) => <p key={reason}>{reason}</p>)}</div>
                          <PropertyWhatsAppButton leadId={lead.id} propertyId={property.id} phone={lead.phone} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card title="Inteligencia comercial avanzada">
                <div className="rounded-xl border border-[#d2c5b3] bg-[#eee4d5] p-4">
                  <p className="font-semibold text-[#37332d]">Disponible en Professional</p>
                  <p className="mt-2 text-sm leading-6 text-[#6f685f]">Desbloqueá recomendaciones de próxima acción, probabilidad comercial y matching avanzado con propiedades.</p>
                  <Link href="/pricing" className="mt-4 inline-block rounded-lg bg-[#302d28] px-4 py-2 text-sm font-semibold !text-[#fffaf2]">Ver Professional</Link>
                </div>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function RiskPill({ score, level }: { score: number; level: "LOW" | "MEDIUM" | "HIGH" }) {
  const label = level === "HIGH" ? "Alto" : level === "MEDIUM" ? "Medio" : "Bajo";
  const className = level === "HIGH" ? "border-[#b58d73] bg-[#ead8cb] text-[#6b4433]" : level === "MEDIUM" ? "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]" : "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]";
  return <span className={`inline-flex w-fit rounded-full border px-3 py-2 text-xs font-semibold ${className}`}>Riesgo {score}/100 · {label}</span>;
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-2xl leading-none text-[#2f2c27]">{value}</p><p className="mt-2 text-xs text-[#81796e]">{detail}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{label}</p><p className="mt-1 text-sm text-[#403b34]">{value}</p></div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><h2 className="mb-4 font-serif text-xl font-medium text-[#37332d]">{title}</h2>{children}</div>;
}
