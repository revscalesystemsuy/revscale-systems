import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_CATALOG, getPlanPrice, normalizePaidPlan, type BillingCycle } from "@/lib/plan-catalog";

const ALLOWED_PLANS = new Set(["STARTER", "PRO", "PROFESSIONAL", "ENTERPRISE"]);

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ plan?: string; email?: string; cycle?: string }> }) {
  const params = await searchParams;
  const requestedPlan = String(params.plan || "STARTER").toUpperCase();
  const selectedPlan = normalizePaidPlan(ALLOWED_PLANS.has(requestedPlan) ? requestedPlan : "STARTER");
  const billingCycle: BillingCycle = String(params.cycle || "MONTHLY").toUpperCase() === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const initialEmail = String(params.email || "").trim().toLowerCase();
  const selectedPrice = getPlanPrice(selectedPlan, billingCycle);
  const selectedPlanMeta = PLAN_CATALOG[selectedPlan];

  async function createRequest(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const planCandidate = String(formData.get("plan") || "STARTER").toUpperCase();
    const cycleCandidate = String(formData.get("billing_cycle") || "MONTHLY").toUpperCase();
    const plan = normalizePaidPlan(ALLOWED_PLANS.has(planCandidate) ? planCandidate : "STARTER");
    const cycle: BillingCycle = cycleCandidate === "ANNUAL" ? "ANNUAL" : "MONTHLY";

    if (!name || !company || !email) throw new Error("Completá los datos obligatorios");

    const { data: requestId, error } = await supabase.rpc("submit_billing_plan_request", {
      p_name: name,
      p_company: company,
      p_email: email,
      p_phone: phone,
      p_plan: plan,
      p_billing_cycle: cycle,
    });
    if (error || !requestId) throw new Error(error?.message || "No se pudo crear la solicitud");

    redirect(`/request/checkout?id=${encodeURIComponent(String(requestId))}&plan=${encodeURIComponent(plan)}&cycle=${cycle}`);
  }

  const inputClass = "w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3 text-[#292722] outline-none placeholder:text-[#8a8379] focus:border-[#8a714d]";

  return (
    <main className="min-h-screen bg-[#efe6d8] p-6 text-[#292722] md:p-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link>
        <div className="mt-12 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Suscripción · {selectedPlanMeta.stage}</p>
          <h1 className="mt-3 font-serif text-4xl font-medium">Completá los datos de tu inmobiliaria</h1>
          <p className="mt-3 text-sm leading-6 text-[#716a61]">Elegiste {selectedPlanMeta.title}. {selectedPlanMeta.description}</p>

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-[#d5c8b6] bg-[#eee4d6] p-4">
            <div><p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Plan</p><p className="mt-1 font-serif text-xl text-[#302b25]">{selectedPlanMeta.title}</p></div>
            <div className="text-right"><p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Facturación</p><p className="mt-1 font-serif text-xl text-[#302b25]">USD {selectedPrice.toLocaleString("en-US")} {billingCycle === "ANNUAL" ? "/ año" : "/ mes"}</p></div>
          </div>

          <form action={createRequest} className="mt-7 space-y-4">
            <input type="hidden" name="plan" value={selectedPlan} />
            <input type="hidden" name="billing_cycle" value={billingCycle} />
            <input name="name" required maxLength={120} placeholder="Nombre completo" className={inputClass} />
            <input name="company" required maxLength={160} placeholder="Empresa inmobiliaria" className={inputClass} />
            <input name="email" required type="email" maxLength={320} defaultValue={initialEmail} placeholder="Email" className={inputClass} />
            <input name="phone" maxLength={50} placeholder="WhatsApp" className={inputClass} />
            <button className="w-full rounded-xl bg-[#2f2b25] px-5 py-3 font-semibold text-[#fffaf2] transition hover:bg-[#1f1c18]">Continuar al pago</button>
          </form>

          <p className="mt-4 text-center text-xs leading-5 text-[#81796e]">El acceso se activa únicamente cuando el procesador confirma el pago.</p>
          <Link href={`/pricing?cycle=${billingCycle}${initialEmail ? `&email=${encodeURIComponent(initialEmail)}` : ""}`} className="mt-5 block text-center text-sm text-[#78674e] hover:text-[#4a4238]">Cambiar plan o modalidad</Link>
        </div>
      </div>
    </main>
  );
}
