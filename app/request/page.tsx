import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const selectedPlan = params.plan || "STARTER";

  async function createRequest(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const name = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const plan = String(formData.get("plan") || "STARTER").toUpperCase();

    if (!name || !company || !email) {
      throw new Error("Completá los datos obligatorios");
    }

    const { error } = await supabase.from("plan_requests").insert({
      name,
      company,
      email,
      phone,
      plan,
      status: "PENDING",
    });

    if (error) throw new Error(error.message);

    redirect(`/request/success?email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-xl">
        <p className="font-semibold text-blue-400">RevScale PropertyOS</p>
        <h1 className="mt-3 text-4xl font-bold">Solicitar acceso</h1>
        <p className="mt-3 text-slate-400">
          Completá tus datos y nos ponemos en contacto para activar tu cuenta.
        </p>

        <form
          action={createRequest}
          className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
        >
          <input type="hidden" name="plan" value={selectedPlan} />
          <input name="name" required placeholder="Nombre completo" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" />
          <input name="company" required placeholder="Empresa inmobiliaria" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" />
          <input name="email" required type="email" placeholder="Email" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" />
          <input name="phone" placeholder="WhatsApp" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" />

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">Plan seleccionado</p>
            <p className="mt-1 text-xl font-bold text-blue-400">{selectedPlan}</p>
          </div>

          <button className="w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400">
            🚀 Solicitar acceso
          </button>
        </form>
      </div>
    </main>
  );
}
