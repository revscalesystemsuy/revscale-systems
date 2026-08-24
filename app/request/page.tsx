import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ALLOWED_PLANS = new Set(["STARTER", "PRO", "PROFESSIONAL", "ENTERPRISE"]);

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ plan?: string; email?: string }> }) {
  const params = await searchParams;
  const requestedPlan = String(params.plan || "STARTER").toUpperCase();
  const selectedPlan = ALLOWED_PLANS.has(requestedPlan) ? requestedPlan : "STARTER";
  const initialEmail = String(params.email || "").trim().toLowerCase();

  async function createRequest(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const planCandidate = String(formData.get("plan") || "STARTER").toUpperCase();
    const plan = ALLOWED_PLANS.has(planCandidate) ? planCandidate : "STARTER";
    if (!name || !company || !email) throw new Error("Completá los datos obligatorios");
    const { error } = await supabase.rpc("submit_plan_request", { p_name: name, p_company: company, p_email: email, p_phone: phone, p_plan: plan });
    if (error) throw new Error(error.message);
    redirect(`/request/success?email=${encodeURIComponent(email)}&plan=${encodeURIComponent(plan)}`);
  }

  const inputClass = "w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3 text-[#292722] outline-none placeholder:text-[#8a8379] focus:border-[#8a714d]";

  return (
    <main className="min-h-screen bg-[#efe6d8] p-6 text-[#292722] md:p-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link>
        <div className="mt-12 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Activación</p>
          <h1 className="mt-3 font-serif text-4xl font-medium">Completá tu solicitud</h1>
          <p className="mt-3 text-sm leading-6 text-[#716a61]">Ya elegiste tu plan. Solo faltan los datos de la inmobiliaria para coordinar la activación.</p>

          <form action={createRequest} className="mt-7 space-y-4">
            <input type="hidden" name="plan" value={selectedPlan} />
            <input name="name" required maxLength={120} placeholder="Nombre completo" className={inputClass} />
            <input name="company" required maxLength={160} placeholder="Empresa inmobiliaria" className={inputClass} />
            <input name="email" required type="email" maxLength={320} defaultValue={initialEmail} placeholder="Email" className={inputClass} />
            <input name="phone" maxLength={50} placeholder="WhatsApp" className={inputClass} />
            <div className="rounded-xl border border-[#d5c8b6] bg-[#eee4d6] p-4"><p className="text-xs uppercase tracking-[0.16em] text-[#81796e]">Plan seleccionado</p><p className="mt-1 font-serif text-2xl text-[#302b25]">{selectedPlan}</p></div>
            <button className="w-full rounded-xl bg-[#2f2b25] px-5 py-3 font-semibold text-[#fffaf2] transition hover:bg-[#1f1c18]">Enviar solicitud</button>
          </form>
        </div>
      </div>
    </main>
  );
}
