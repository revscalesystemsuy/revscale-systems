import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDollarSign, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { confirmCommercialAcceptance, confirmPayment, saveClosing } from "../actions";

export default async function ClosingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunity }, { data: proposal }, { data: pilot }, { data: negotiation }, { data: closing }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,plan_interest,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_proposals").select("id,plan_name,billing_cycle,quoted_price_usd,pilot_days,status").eq("opportunity_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("b2b_pilot_agreements").select("id,status,pilot_days,sponsor_name,sponsor_role,champion_name,champion_role,decision_metrics,data_scope,property_scope,integration_scope,risks").eq("opportunity_id", id).maybeSingle(),
    supabase.from("b2b_negotiations").select("id,status,revised_price_usd,revised_pilot_days,revised_scope,give_get,agreed_at,created_at").eq("opportunity_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("b2b_closings").select("*").eq("opportunity_id", id).maybeSingle(),
  ]);
  if (!opportunity) notFound();

  const finalPrice = closing?.final_price_usd ?? negotiation?.revised_price_usd ?? proposal?.quoted_price_usd ?? 249;
  const finalPilotDays = closing?.final_pilot_days ?? negotiation?.revised_pilot_days ?? pilot?.pilot_days ?? proposal?.pilot_days ?? 45;
  const finalPlan = closing?.final_plan_name ?? proposal?.plan_name ?? "PROFESSIONAL";
  const billingCycle = closing?.final_billing_cycle ?? proposal?.billing_cycle ?? "MONTHLY";
  const agreed = negotiation?.status === "AGREED";

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/protected/admin/sales/closing" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a cierre</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 54 · Cierre</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#6d665d]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage}</p></div>
        {messages.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Card label="Negociación" value={agreed ? "AGREED" : negotiation?.status || "SIN REGISTRO"}/>
          <Card label="Piloto" value={pilot ? `${pilot.status} · ${finalPilotDays} días` : `${finalPilotDays} días`}/>
          <Card label="Precio final" value={`USD ${finalPrice} · ${billingCycle}`}/>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
          <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#756247]"/><h2 className="font-serif text-2xl">Condiciones finales</h2></div>
          <p className="mt-2 text-sm leading-6 text-[#716a61]">El cierre solo puede prepararse cuando la última negociación está acordada. Esto no marca pago.</p>
          <form action={saveClosing} className="mt-6 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="proposal_id" value={proposal?.id || ""}/><input type="hidden" name="pilot_agreement_id" value={pilot?.id || ""}/>
            <Field label="Plan final"><select name="final_plan_name" defaultValue={finalPlan} className="field"><option>STARTER</option><option>PROFESSIONAL</option><option>ENTERPRISE</option></select></Field>
            <Field label="Ciclo"><select name="final_billing_cycle" defaultValue={billingCycle} className="field"><option value="MONTHLY">Mensual</option><option value="ANNUAL">Anual</option></select></Field>
            <Field label="Precio final USD"><input name="final_price_usd" type="number" min="0" defaultValue={finalPrice} className="field"/></Field>
            <Field label="Duración piloto"><input name="final_pilot_days" type="number" min="1" defaultValue={finalPilotDays} className="field"/></Field>
            <Field label="Acepta comercialmente"><input name="accepted_by_name" defaultValue={closing?.accepted_by_name || pilot?.sponsor_name || ""} className="field" placeholder="Nombre"/></Field>
            <Field label="Rol"><input name="accepted_by_role" defaultValue={closing?.accepted_by_role || pilot?.sponsor_role || ""} className="field" placeholder="Owner / Director / Manager"/></Field>
            <Field label="Notas de aceptación" wide><textarea name="acceptance_notes" defaultValue={closing?.acceptance_notes || ""} className="field min-h-24"/></Field>
            <Field label="Notas para handoff" wide><textarea name="handoff_notes" defaultValue={closing?.handoff_notes || ""} className="field min-h-24" placeholder="Sponsor, champion, datos, integraciones, riesgos, calendario..."/></Field>
            <button disabled={!agreed} className="rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2] disabled:cursor-not-allowed disabled:opacity-40 md:col-span-2">Guardar cierre preparado</button>
          </form>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-[#756247]"/><h2 className="font-serif text-2xl">1. Aceptación comercial</h2></div><p className="mt-3 text-sm leading-6 text-[#716a61]">Confirma que la persona con autoridad aceptó las condiciones finales. Todavía no cambia la oportunidad a PAID.</p>{closing?.status === "COMMERCIAL_ACCEPTED" || closing?.status === "PAYMENT_CONFIRMED" ? <p className="mt-5 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] p-4 text-sm">Aceptación confirmada.</p> : <form action={confirmCommercialAcceptance} className="mt-5"><input type="hidden" name="opportunity_id" value={id}/><button disabled={!closing || !closing.accepted_by_name} className="w-full rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2] disabled:opacity-40">Confirmar aceptación comercial</button></form>}</article>
          <article className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><div className="flex items-center gap-2"><CircleDollarSign size={18} className="text-[#756247]"/><h2 className="font-serif text-2xl">2. Pago real</h2></div><p className="mt-3 text-sm leading-6 text-[#716a61]">Solo una referencia verificable permite marcar PAID y crear `paid_at`.</p>{closing?.status === "PAYMENT_CONFIRMED" ? <p className="mt-5 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] p-4 text-sm">Pago confirmado · {closing.payment_reference}</p> : <form action={confirmPayment} className="mt-5 space-y-3"><input type="hidden" name="opportunity_id" value={id}/><input name="payment_reference" className="field" placeholder="Referencia, recibo, invoice o identificador" required/><textarea name="payment_notes" className="field min-h-20" placeholder="Notas opcionales"/><button disabled={closing?.status !== "COMMERCIAL_ACCEPTED"} className="w-full rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2] disabled:opacity-40">Confirmar pago y marcar PAID</button></form>}</article>
        </section>
      </div>
      <style>{`.field{width:100%;border:1px solid #cfc1ad;background:#fffaf2;border-radius:.5rem;padding:.7rem .8rem;color:#403b34;outline:none}.field:focus{border-color:#9d8767}`}</style>
    </main>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`text-xs font-semibold text-[#665f56] ${wide ? "md:col-span-2" : ""}`}><span className="mb-2 block">{label}</span>{children}</label>; }
function Card({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 text-sm font-semibold text-[#403b34]">{value}</p></div>; }
