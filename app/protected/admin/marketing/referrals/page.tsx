import { createClient } from "@/lib/supabase/server";
import { approveReferralReward, createReferralCode, markCreditApplied, markNewCustomerBenefitFulfilled, refreshReferral, updateReferralSettings } from "./actions";

export default async function ReferralAdminPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: codes }, { data: referrals }, { data: orgs }] = await Promise.all([
    supabase.from("b2b_referral_program_settings").select("*").eq("program_key", "REVSCALE_NETWORK").maybeSingle(),
    supabase.from("b2b_referral_codes").select("id,code,status,eligibility_basis,eligibility_evidence,eligible_at,referrer_organization_id").order("created_at", { ascending: false }),
    supabase.from("b2b_referrals").select("id,referrer_organization_id,referred_company,referred_contact_name,referred_email,status,new_customer_benefit,new_customer_benefit_fulfilled_at,billing_payment_count,second_payment_completed_at,referrer_credit_amount_usd,reward_approved_at,credit_applied_at,credit_application_reference,created_at").order("created_at", { ascending: false }),
    supabase.from("organizations").select("id,name").order("name"),
  ]);

  const orgName = new Map((orgs || []).map((o) => [o.id, o.name]));
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-10 text-[#292722] md:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#8a714d]">RevScale Network</p>
        <h1 className="mt-3 font-serif text-4xl">Referral program</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6d665d]">Pedí referrals después del primer aha o una business review positiva. El crédito del cliente se aprueba solo después de la segunda mensualidad paga y de validar cap anual + ausencia de descuento permanente.</p>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <form action={updateReferralSettings} className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6">
            <h2 className="font-serif text-2xl">Reglas del programa</h2>
            <p className="mt-2 text-sm text-[#6d665d]">Crédito actual: 50% de una mensualidad. Definí el máximo anual antes de aprobar recompensas.</p>
            <div className="mt-5 grid gap-4">
              <label className="text-sm">Máximo de créditos por cliente/año<input name="annual_credit_cap_count" type="number" min={1} max={24} defaultValue={settings?.annual_credit_cap_count ?? ""} className="mt-2 w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3" required /></label>
              <label className="text-sm">Beneficio por defecto del nuevo cliente<select name="new_customer_benefit_default" defaultValue={settings?.new_customer_benefit_default || "ONBOARDING_COMPED"} className="mt-2 w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3"><option value="ONBOARDING_COMPED">Onboarding estándar bonificado</option><option value="OPTIMIZATION_SESSION">Sesión de optimización adicional</option></select></label>
            </div>
            <button className="mt-5 rounded-xl bg-[#2f2b25] px-5 py-3 text-sm font-semibold text-[#f5eee4]">Guardar reglas</button>
          </form>

          <form action={createReferralCode} className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6">
            <h2 className="font-serif text-2xl">Habilitar cliente para referir</h2>
            <div className="mt-5 grid gap-4">
              <select name="organization_id" required className="rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3"><option value="">Seleccionar organización</option>{(orgs || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
              <select name="eligibility_basis" required className="rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3"><option value="FIRST_AHA">Primer aha</option><option value="POSITIVE_BUSINESS_REVIEW">Business review positiva</option><option value="MANUAL_VERIFIED">Verificación manual</option></select>
              <textarea name="eligibility_evidence" required placeholder="Evidencia concreta de por qué es momento correcto de pedir referral" className="min-h-24 rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3" />
            </div>
            <button className="mt-5 rounded-xl bg-[#2f2b25] px-5 py-3 text-sm font-semibold text-[#f5eee4]">Generar código</button>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6">
          <h2 className="font-serif text-2xl">Códigos activos</h2>
          <div className="mt-4 space-y-3">{(codes || []).length ? (codes || []).map((c) => <div key={c.id} className="rounded-xl border border-[#ddd1c1] p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{c.code}</strong><span>{c.status}</span></div><p className="mt-1 text-sm text-[#6d665d]">{orgName.get(c.referrer_organization_id) || c.referrer_organization_id} · {c.eligibility_basis}</p><p className="mt-2 text-xs text-[#81796e]">{c.eligibility_evidence}</p></div>) : <p className="text-sm text-[#6d665d]">Todavía no hay clientes habilitados para referir.</p>}</div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6">
          <h2 className="font-serif text-2xl">Referidos</h2>
          <div className="mt-4 space-y-4">{(referrals || []).length ? (referrals || []).map((r) => <article key={r.id} className="rounded-xl border border-[#ddd1c1] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{r.referred_company}</strong><p className="text-sm text-[#6d665d]">{r.referred_contact_name} · {r.referred_email}</p><p className="mt-1 text-xs text-[#81796e]">Refiere: {orgName.get(r.referrer_organization_id) || r.referrer_organization_id}</p></div><span className="rounded-full border border-[#cdbfaa] px-3 py-1 text-xs font-semibold">{r.status}</span></div><p className="mt-3 text-sm">Pagos detectados: {r.billing_payment_count} · Crédito estimado: {r.referrer_credit_amount_usd == null ? "pendiente" : `USD ${r.referrer_credit_amount_usd}`}</p><p className="mt-1 text-xs text-[#81796e]">Beneficio nuevo cliente: {r.new_customer_benefit} {r.new_customer_benefit_fulfilled_at ? "· entregado" : "· pendiente"}</p><div className="mt-4 flex flex-wrap gap-2"><form action={refreshReferral}><input type="hidden" name="referral_id" value={r.id}/><button className="rounded-lg border border-[#cdbfaa] px-3 py-2 text-xs font-semibold">Revisar pagos</button></form>{!r.new_customer_benefit_fulfilled_at && <form action={markNewCustomerBenefitFulfilled}><input type="hidden" name="referral_id" value={r.id}/><button className="rounded-lg border border-[#cdbfaa] px-3 py-2 text-xs font-semibold">Marcar beneficio entregado</button></form>}{r.status === "ELIGIBLE_REWARD" && <form action={approveReferralReward} className="flex flex-wrap gap-2"><input type="hidden" name="referral_id" value={r.id}/><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="discount_conflict_cleared" required/> sin descuento permanente conflictivo</label><button className="rounded-lg bg-[#2f2b25] px-3 py-2 text-xs font-semibold text-[#f5eee4]">Aprobar crédito</button></form>}{r.status === "REWARD_APPROVED" && <form action={markCreditApplied} className="flex gap-2"><input type="hidden" name="referral_id" value={r.id}/><input name="reference" required placeholder="Referencia de crédito" className="rounded-lg border border-[#cdbfaa] bg-[#fffaf2] px-3 py-2 text-xs"/><button className="rounded-lg bg-[#2f2b25] px-3 py-2 text-xs font-semibold text-[#f5eee4]">Marcar aplicado</button></form>}</div></article>) : <p className="text-sm text-[#6d665d]">Todavía no hay referidos registrados.</p>}</div>
        </section>
      </div>
    </main>
  );
}
