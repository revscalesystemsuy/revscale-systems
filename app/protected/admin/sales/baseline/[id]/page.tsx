import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { lockPilotBaseline, savePilotBaseline } from "../actions";

export default async function BaselineDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunity }, { data: onboarding }, { data: pilot }, { data: baseline }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_onboarding_plans").select("id,status,baseline_notes").eq("opportunity_id", id).maybeSingle(),
    supabase.from("b2b_pilot_agreements").select("id,status,decision_metrics").eq("opportunity_id", id).maybeSingle(),
    supabase.from("b2b_pilot_baselines").select("*").eq("opportunity_id", id).maybeSingle(),
  ]);
  if (!opportunity) notFound();
  const locked = baseline?.status === "LOCKED";
  const decisionLines = Array.isArray(baseline?.decision_metric_baselines)
    ? baseline.decision_metric_baselines.map((x: { metric?: string; baseline?: string; notes?: string | null }) => `${x.metric || ""} | ${x.baseline || ""}${x.notes ? ` | ${x.notes}` : ""}`).join("\n")
    : Array.isArray(pilot?.decision_metrics) ? pilot.decision_metrics.map((x: string) => `${x} | `).join("\n") : "";
  const stageLines = baseline?.stage_distribution && typeof baseline.stage_distribution === "object" ? Object.entries(baseline.stage_distribution as Record<string, number>).map(([k,v]) => `${k}: ${v}`).join("\n") : "";
  const sourceLines = baseline?.source_distribution && typeof baseline.source_distribution === "object" ? Object.entries(baseline.source_distribution as Record<string, number>).map(([k,v]) => `${k}: ${v}`).join("\n") : "";

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/protected/admin/sales/baseline" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a baseline</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 57 · Baseline</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#6d665d]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage} · onboarding {onboarding?.status || "PENDIENTE"}</p></div>
        {messages.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Línea base operativa</h2><p className="mt-2 text-sm leading-6 text-[#716a61]">Capturá evidencia de la muestra real antes de atribuir mejoras al piloto. Una vez bloqueada, la línea base queda inmutable desde esta interfaz.</p></div><span className="rounded-full border border-[#cdbda5] bg-[#eee4d5] px-3 py-1 text-xs font-semibold">{baseline?.status || "DRAFT"}</span></div>
          <form action={savePilotBaseline} className="mt-6 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="opportunity_id" value={id}/>
            <Field label="Referencia del dataset"><input disabled={locked} name="dataset_reference" defaultValue={baseline?.dataset_reference || ""} className="field" placeholder="Export CRM 2026-08-29 / archivo / consulta"/></Field>
            <Field label="Momento de captura"><input disabled={locked} type="datetime-local" name="captured_at" defaultValue={baseline?.captured_at ? toLocalInput(baseline.captured_at) : ""} className="field"/></Field>
            <Metric label="Leads activos" name="active_leads_count" value={baseline?.active_leads_count} locked={locked}/>
            <Metric label="Fuentes activas" name="source_count" value={baseline?.source_count} locked={locked}/>
            <Metric label="Sin owner" name="unowned_leads_count" value={baseline?.unowned_leads_count} locked={locked}/>
            <Metric label="Sin próximo paso" name="no_next_step_count" value={baseline?.no_next_step_count} locked={locked}/>
            <Metric label="Seguimientos vencidos" name="overdue_followups_count" value={baseline?.overdue_followups_count} locked={locked}/>
            <Metric label="Alta intención sin actividad" name="high_intent_inactive_count" value={baseline?.high_intent_inactive_count} locked={locked}/>
            <Field label="Mediana primera respuesta humana (min)"><input disabled={locked} type="number" min="0" step="0.1" name="median_first_response_minutes" defaultValue={baseline?.median_first_response_minutes ?? ""} className="field"/></Field>
            <Metric label="Candidatos a reactivación" name="reactivation_candidates_count" value={baseline?.reactivation_candidates_count} locked={locked}/>
            <Field label="Distribución por etapa" wide><textarea disabled={locked} name="stage_distribution" defaultValue={stageLines} className="field min-h-28" placeholder={'NEW: 12\nCONTACTED: 30\nVISIT: 8'}/></Field>
            <Field label="Distribución por fuente" wide><textarea disabled={locked} name="source_distribution" defaultValue={sourceLines} className="field min-h-28" placeholder={'InfoCasas: 40\nWhatsApp: 25\nMeta: 15'}/></Field>
            <Field label="3 métricas de decisión del piloto" wide><textarea disabled={locked} name="decision_metric_baselines" defaultValue={decisionLines} className="field min-h-28" placeholder={'% leads con próximo paso | 61% | export inicial\nseguimientos vencidos | 37 | corte inicial\nreactivaciones | 0 | antes del piloto'}/><span className="mt-1 block text-[11px] font-normal text-[#81786d]">Formato: métrica | baseline | nota. Si se informan, deben ser exactamente 3 antes de bloquear.</span></Field>
            <Field label="Proceso actual" wide><textarea disabled={locked} name="process_notes" defaultValue={baseline?.process_notes || onboarding?.baseline_notes || ""} className="field min-h-28" placeholder="Cómo entra, se asigna, se responde y se hace seguimiento hoy."/></Field>
            <Field label="Notas de evidencia" wide><textarea disabled={locked} name="evidence_notes" defaultValue={baseline?.evidence_notes || ""} className="field min-h-24" placeholder="Limitaciones del dataset, campos ausentes, supuestos que NO deben tratarse como hechos..."/></Field>
            {!locked && <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2] md:col-span-2"><Save size={16}/> Guardar baseline</button>}
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><div className="flex items-center gap-2"><LockKeyhole size={18} className="text-[#756247]"/><h2 className="font-serif text-2xl">Congelar comparación</h2></div><p className="mt-3 text-sm leading-6 text-[#716a61]">Bloquear evita editar retroactivamente el “antes”. Requiere dataset, fecha, leads activos, sin owner, sin próximo paso, vencidos y descripción del proceso actual.</p>{locked ? <p className="mt-5 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] p-4 text-sm">Baseline bloqueado. Ya puede usarse como referencia para Activation Score y métricas antes/después.</p> : <form action={lockPilotBaseline} className="mt-5"><input type="hidden" name="opportunity_id" value={id}/><button className="w-full rounded-lg border border-[#8f7756] bg-[#ede1cf] px-5 py-3 text-sm font-semibold">Bloquear baseline</button></form>}</section>
      </div>
      <style>{`.field{width:100%;border:1px solid #cfc1ad;background:#fffaf2;border-radius:.5rem;padding:.7rem .8rem;color:#403b34;outline:none}.field:focus{border-color:#9d8767}.field:disabled{opacity:.68;cursor:not-allowed}`}</style>
    </main>
  );
}

function toLocalInput(value: string) { const d = new Date(value); const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Montevideo", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false }).formatToParts(d); const o = Object.fromEntries(parts.map((p) => [p.type,p.value])); return `${o.year}-${o.month}-${o.day}T${o.hour}:${o.minute}`; }
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`text-xs font-semibold text-[#665f56] ${wide ? "md:col-span-2" : ""}`}><span className="mb-2 block">{label}</span>{children}</label>; }
function Metric({ label, name, value, locked }: { label: string; name: string; value: number | null | undefined; locked: boolean }) { return <Field label={label}><input disabled={locked} type="number" min="0" name={name} defaultValue={value ?? ""} className="field"/></Field>; }
