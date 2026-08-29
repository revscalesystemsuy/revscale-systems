import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { activatePilot, savePilotAgreement } from "../actions";

export default async function PilotAgreementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const qs = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunity } = await supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").eq("id", id).maybeSingle();
  if (!opportunity) redirect("/protected/admin/sales/pilots");
  const { data: proposal } = await supabase.from("b2b_proposals").select("id,status,decision_metrics,plan_name,quoted_price_usd").eq("opportunity_id", id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const { data: agreement } = await supabase.from("b2b_pilot_agreements").select("*").eq("opportunity_id", id).maybeSingle();
  const metrics = agreement?.decision_metrics?.length ? agreement.decision_metrics : proposal?.decision_metrics || [];
  const activation = agreement?.activation_criteria || [
    "80% o más de los leads activos con responsable y próximo paso definido.",
    "Uso de Qué hacer hoy al menos 4 de 5 días laborales por el equipo núcleo.",
    "Revisión sistemática de matches y oportunidades de riesgo o reactivación.",
    "Revisión semanal de SLA y pendientes por parte de dirección o management.",
  ];

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10"><div className="mx-auto max-w-5xl">
      <Link href="/protected/admin/sales/pilots" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a pilotos</Link>
      <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 52 · Revenue Recovery Pilot</p><h1 className="mt-3 font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#716a61]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage}</p></div>
      {qs.error && <div className="mt-5 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] p-4 text-sm">{qs.error}</div>}
      {qs.success && <div className="mt-5 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] p-4 text-sm">{qs.success}</div>}

      <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
        <div className="grid gap-4 md:grid-cols-3"><Info label="Plan" value={proposal?.plan_name || "Professional"}/><Info label="Precio" value={proposal ? `USD ${proposal.quoted_price_usd}` : "Pendiente"}/><Info label="Duración" value="45 días · onboarding 7 días"/></div>
        <form action={savePilotAgreement} className="mt-7 space-y-6">
          <input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="proposal_id" value={proposal?.id || ""}/>
          <Field label="Sponsor"><input name="sponsor_name" defaultValue={agreement?.sponsor_name || ""} className="input" placeholder="Nombre"/><input name="sponsor_role" defaultValue={agreement?.sponsor_role || ""} className="input" placeholder="Rol"/></Field>
          <Field label="Champion operativo"><input name="champion_name" defaultValue={agreement?.champion_name || ""} className="input" placeholder="Nombre"/><input name="champion_role" defaultValue={agreement?.champion_role || ""} className="input" placeholder="Rol"/></Field>
          <Field label="Alcance de datos"><textarea name="data_scope" defaultValue={agreement?.data_scope || ""} className="textarea" placeholder="Qué leads/importaciones entran en el piloto"/></Field>
          <Field label="Alcance de propiedades"><textarea name="property_scope" defaultValue={agreement?.property_scope || ""} className="textarea" placeholder="Inventario prioritario y matching"/></Field>
          <Field label="Integraciones"><textarea name="integration_scope" defaultValue={agreement?.integration_scope || ""} className="textarea" placeholder="WhatsApp, portales u otras integraciones viables"/></Field>
          <Field label="Tres métricas de decisión"><textarea name="decision_metrics" defaultValue={metrics.join("\n")} className="textarea" placeholder="Una métrica por línea. Exactamente 3 para aceptar."/></Field>
          <Field label="Fecha objetivo de inicio"><input type="date" name="target_start_date" defaultValue={agreement?.target_start_date || ""} className="input"/></Field>
          <Field label="Riesgos / dependencias"><textarea name="risks" defaultValue={agreement?.risks || ""} className="textarea"/></Field>
          <Field label="Notas de aceptación"><textarea name="acceptance_notes" defaultValue={agreement?.acceptance_notes || ""} className="textarea"/></Field>
          <div className="rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#81796e]">Criterios de activación</p><ul className="mt-4 space-y-3 text-sm">{activation.map((item: string) => <li key={item} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0"/>{item}</li>)}</ul></div>
          <div className="flex flex-wrap gap-3"><button name="status" value="PREPARED" className="rounded-lg border border-[#b9aa94] px-4 py-2.5 text-sm font-semibold">Guardar preparación</button><button name="status" value="OFFERED" className="rounded-lg border border-[#8f806b] bg-[#efe5d6] px-4 py-2.5 text-sm font-semibold">Registrar piloto ofrecido</button><button name="status" value="ACCEPTED" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Registrar aceptación</button></div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Activación real</h2><p className="mt-2 text-sm leading-6 text-[#716a61]">Este botón se usa solo cuando el acuerdo ya fue aceptado y existe sponsor + exactamente tres métricas. Recién entonces la oportunidad pasa a PILOT_ACTIVE.</p><form action={activatePilot} className="mt-5"><input type="hidden" name="opportunity_id" value={id}/><button disabled={agreement?.status !== "ACCEPTED"} className="rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2] disabled:cursor-not-allowed disabled:opacity-40">Activar piloto</button></form></section>
      <style>{`.input,.textarea{width:100%;border:1px solid #d2c5b3;background:#fffaf2;border-radius:.65rem;padding:.7rem .8rem;font-size:.875rem}.textarea{min-height:90px}.field-grid{display:grid;gap:.75rem}`}</style>
    </div></main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</span><div className="field-grid">{children}</div></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p><p className="mt-2 text-sm text-[#4d4841]">{value}</p></div>; }
