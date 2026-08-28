import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Ban, CalendarClock, Mail, Phone, Target, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markB2BLost, updateB2BCommercialFields, updateB2BScoringSignals } from "../actions";

const lossReasonLabels = {
  NO_FIT: "No encaja con ICP",
  NO_RESPONSE: "Sin respuesta",
  PRICE: "Precio",
  TIMING: "Timing / no es momento",
  COMPETITOR: "Eligió otra opción",
  NO_DECISION: "Sin decisión / estancado",
  INTERNAL_PRIORITY: "Otra prioridad interna",
  TECHNICAL_GAP: "Gap técnico / requisito faltante",
  OTHER: "Otro",
} as const;

function localInputValue(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function signalValue(value: boolean | null) {
  if (value === true) return "YES";
  if (value === false) return "NO";
  return "UNKNOWN";
}

export default async function B2BOpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunity } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,email,phone,stage,primary_channel,plan_interest,next_step,next_step_due_at,last_contact_at,notes,source_type,created_at,icp_team_size,icp_monthly_inquiries,icp_lead_sources,icp_whatsapp_daily,icp_followup_pain,icp_growth_investment,icp_decision_access,icp_geography_fit,icp_score,tier,score_updated_at,loss_reason,loss_notes,lost_at")
    .eq("id", id)
    .maybeSingle();
  if (!opportunity) notFound();

  const { data: history } = await supabase.from("b2b_stage_history").select("id,from_stage,to_stage,changed_at").eq("opportunity_id", id).order("changed_at", { ascending: false }).limit(10);

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
        <div className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Ficha comercial B2B</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#746c62]">Etapa actual: <strong>{opportunity.stage}</strong></p></div>
            <div className="flex gap-2"><span className="rounded-full border border-[#cbbda8] bg-[#efe5d6] px-3 py-1 text-xs font-semibold text-[#6d5d48]">{opportunity.source_type}</span><span className="rounded-full border border-[#b7aa94] bg-[#e6dac8] px-3 py-1 text-xs font-semibold text-[#5c4d3a]">{opportunity.tier === "UNSCORED" ? "Sin score" : `Tier ${opportunity.tier} · ${opportunity.icp_score}`}</span></div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3"><Info icon={<UserRound size={14}/>} label="Contacto" value={opportunity.contact_name}/><Info icon={<Mail size={14}/>} label="Email" value={opportunity.email}/><Info icon={<Phone size={14}/>} label="Teléfono" value={opportunity.phone}/></div>
        </div>

        {messages.success && <div className="mt-5 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-5 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        {opportunity.stage !== "LOST" ? (
          <>
            <form action={updateB2BCommercialFields} className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
              <input type="hidden" name="opportunity_id" value={opportunity.id}/>
              <h2 className="font-serif text-2xl">Operación comercial</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Canal principal"><select name="primary_channel" defaultValue={opportunity.primary_channel} className="field"><option value="WEB">Web</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="LINKEDIN">LinkedIn</option><option value="PHONE">Teléfono</option><option value="OTHER">Otro</option></select></Field>
                <Field label="Plan de interés"><select name="plan_interest" defaultValue={opportunity.plan_interest} className="field"><option value="UNKNOWN">Sin definir</option><option value="STARTER">Starter</option><option value="PROFESSIONAL">Professional</option><option value="ENTERPRISE">Enterprise</option></select></Field>
                <Field label="Próximo paso"><input name="next_step" defaultValue={opportunity.next_step || ""} required className="field"/></Field>
                <Field label="Fecha del próximo paso"><input type="datetime-local" name="next_step_due_at" defaultValue={localInputValue(opportunity.next_step_due_at)} required className="field"/></Field>
                <Field label="Último contacto"><input type="datetime-local" name="last_contact_at" defaultValue={localInputValue(opportunity.last_contact_at)} className="field"/></Field>
                <div className="rounded-xl border border-[#d8cbb8] bg-[#efe5d6] p-4"><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]"><CalendarClock size={13}/> Regla operativa</p><p className="mt-2 text-sm leading-6 text-[#625d55]">Toda oportunidad que no esté perdida debe conservar un próximo paso y una fecha.</p></div>
              </div>
              <Field label="Notas comerciales" wide><textarea name="notes" defaultValue={opportunity.notes || ""} rows={5} className="field resize-y"/></Field>
              <button className="mt-6 rounded-lg bg-[#302d28] px-6 py-3 text-sm font-semibold text-[#fffaf2]">Guardar ficha comercial</button>
            </form>

            <form action={updateB2BScoringSignals} className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
              <input type="hidden" name="opportunity_id" value={opportunity.id}/>
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]"><Target size={14}/> Scoring ICP</p><h2 className="mt-2 font-serif text-2xl">Tier A/B/C basado en señales reales.</h2></div><div className="rounded-xl border border-[#cdbfa9] bg-[#efe5d6] px-4 py-3 text-right"><p className="text-[10px] uppercase tracking-[0.12em] text-[#81796e]">Resultado</p><p className="mt-1 font-serif text-2xl">{opportunity.tier === "UNSCORED" ? "Sin score" : `${opportunity.icp_score}/100 · ${opportunity.tier}`}</p></div></div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#716a61]">Si falta una sola señal, no asignamos tier. A = 75–100, B = 60–74, C = 45–59; menos de 45 queda como bajo encaje.</p>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Tamaño del equipo"><input type="number" name="icp_team_size" min="1" max="500" defaultValue={opportunity.icp_team_size ?? ""} className="field" placeholder="Ej. 10"/></Field>
                <Field label="Consultas por mes"><input type="number" name="icp_monthly_inquiries" min="0" max="1000000" defaultValue={opportunity.icp_monthly_inquiries ?? ""} className="field" placeholder="Ej. 300"/></Field>
                <Field label="Cantidad de fuentes de leads"><input type="number" name="icp_lead_sources" min="1" max="100" defaultValue={opportunity.icp_lead_sources ?? ""} className="field" placeholder="Ej. 3"/></Field>
                <Signal label="WhatsApp diario" name="icp_whatsapp_daily" value={signalValue(opportunity.icp_whatsapp_daily)}/>
                <Signal label="Dolor de seguimiento visible" name="icp_followup_pain" value={signalValue(opportunity.icp_followup_pain)}/>
                <Signal label="Inversión / intención de crecer" name="icp_growth_investment" value={signalValue(opportunity.icp_growth_investment)}/>
                <Signal label="Acceso a owner / manager" name="icp_decision_access" value={signalValue(opportunity.icp_decision_access)}/>
                <Signal label="Geografía prioritaria" name="icp_geography_fit" value={signalValue(opportunity.icp_geography_fit)}/>
              </div>
              <button className="mt-6 rounded-lg bg-[#302d28] px-6 py-3 text-sm font-semibold text-[#fffaf2]">Calcular / actualizar ICP</button>
            </form>

            <form action={markB2BLost} className="mt-6 rounded-2xl border border-[#d7b7aa] bg-[#f3e4dc] p-6 md:p-8">
              <input type="hidden" name="opportunity_id" value={opportunity.id}/>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b5f51]"><Ban size={14}/> Cerrar oportunidad</p>
              <h2 className="mt-2 font-serif text-2xl">Registrar pérdida con motivo.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#765f57]">Una oportunidad solo sale del pipeline si sabemos por qué. Esto convierte el win/loss en información útil para mensaje, precio, ICP y producto.</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Motivo de pérdida"><select name="loss_reason" required defaultValue="" className="field"><option value="" disabled>Seleccionar motivo</option>{Object.entries(lossReasonLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                <Field label="Notas de pérdida"><textarea name="loss_notes" rows={3} className="field resize-y" placeholder="Contexto breve u objeción textual, si aporta información."/></Field>
              </div>
              <button className="mt-6 rounded-lg border border-[#9c6f61] bg-[#7f5145] px-6 py-3 text-sm font-semibold text-[#fffaf2]">Marcar como perdida</button>
            </form>
          </>
        ) : (
          <section className="mt-6 rounded-2xl border border-[#d7b7aa] bg-[#f3e4dc] p-6 md:p-8">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b5f51]"><Ban size={14}/> Oportunidad perdida</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Info icon={<Ban size={14}/>} label="Motivo" value={opportunity.loss_reason ? lossReasonLabels[opportunity.loss_reason as keyof typeof lossReasonLabels] || opportunity.loss_reason : null}/>
              <Info icon={<CalendarClock size={14}/>} label="Fecha" value={opportunity.lost_at ? new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(opportunity.lost_at)) : null}/>
              <Info icon={<Target size={14}/>} label="Tier al cierre" value={opportunity.tier === "UNSCORED" ? "Sin score" : `Tier ${opportunity.tier} · ${opportunity.icp_score}`}/>
            </div>
            {opportunity.loss_notes && <div className="mt-4 rounded-xl border border-[#d5bcb0] bg-[#fff8f4] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8b6c60]">Notas</p><p className="mt-2 text-sm leading-6 text-[#65564f]">{opportunity.loss_notes}</p></div>}
            <p className="mt-5 text-sm leading-6 text-[#765f57]">Para reabrirla, volvé al pipeline y movela a una etapa activa. El sistema limpiará automáticamente el motivo y la fecha de pérdida.</p>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
          <h2 className="font-serif text-2xl">Historial de etapas</h2>
          <div className="mt-4 divide-y divide-[#ded2c1]">{history?.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span><strong>{event.from_stage || "—"}</strong> → <strong>{event.to_stage}</strong></span><span className="text-[#81786d]">{new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(event.changed_at))}</span></div>)}{!history?.length && <p className="py-4 text-sm text-[#81786d]">Todavía no hay cambios manuales de etapa.</p>}</div>
        </section>
      </div>
      <style>{`.field{width:100%;border:1px solid #cfc1ad;background:#fffaf2;border-radius:.5rem;padding:.7rem .8rem;color:#403b34;outline:none}.field:focus{border-color:#9d8767}`}</style>
    </main>
  );
}

function Field({ label, children, wide=false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={wide ? "mt-5 block" : "block"}><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</span>{children}</label> }
function Signal({ label, name, value }: { label: string; name: string; value: string }) { return <Field label={label}><select name={name} defaultValue={value} className="field"><option value="UNKNOWN">Sin dato</option><option value="YES">Sí</option><option value="NO">No</option></select></Field> }
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) { return <div className="rounded-xl border border-[#ddd1c0] bg-[#f7f0e6] p-4"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{icon}{label}</p><p className="mt-2 break-words text-sm font-medium">{value || "—"}</p></div> }
