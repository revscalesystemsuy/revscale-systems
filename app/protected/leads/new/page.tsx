import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function NewLeadPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    redirect("/auth/login");
  }

  async function createLead(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) redirect("/auth/login");

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id,role,team_id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .single();

    if (!membership) throw new Error("Sin organización");

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan,max_leads")
      .eq("organization_id", membership.organization_id)
      .single();

    const { count: leadsCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id);

    if (
      subscription?.max_leads &&
      leadsCount !== null &&
      leadsCount >= subscription.max_leads
    ) {
      throw new Error("Alcanzaste el límite de leads de tu plan.");
    }

    const fullName = String(formData.get("full_name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const zone = String(formData.get("primary_zone") || "").trim();
    const budget = Number(formData.get("budget_max") || 0);
    const currency = String(formData.get("currency") || "USD");
    const bedrooms = Number(formData.get("bedrooms_min") || 0);
    const operation = String(formData.get("operation") || "");
    const propertyType = String(formData.get("property_type") || "");

    let score = 30;
    if (zone) score += 20;
    if (budget) score += 25;
    if (bedrooms) score += 15;

    const temperature = score >= 80 ? "HOT" : score >= 50 ? "WARM" : "COLD";
    const enterprise = String(subscription?.plan || "").toUpperCase() === "ENTERPRISE";

    const roleAssignment = enterprise
      ? membership.role === "AGENT"
        ? {
            team_id: membership.team_id || null,
            assigned_to: userId,
            assigned_at: new Date().toISOString(),
          }
        : membership.role === "MANAGER"
          ? { team_id: membership.team_id || null }
          : {}
      : {};

    const { error } = await supabase.from("leads").insert({
      organization_id: membership.organization_id,
      full_name: fullName,
      phone: phone || null,
      email: email || null,
      operation: operation || null,
      property_type: propertyType || null,
      primary_zone: zone || null,
      budget_max: budget || null,
      currency,
      bedrooms_min: bedrooms || null,
      lead_score: score,
      lead_temperature: temperature,
      next_action: "Contactar cliente",
      ...roleAssignment,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/protected/leads");
    revalidatePath("/protected/pipeline");
    redirect("/protected/leads");
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/protected/leads" className="text-blue-400">
          ← Volver a leads
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Nuevo Lead</h1>
        <p className="mt-2 text-slate-400">
          En Enterprise, la asignación respeta tu equipo y rol automáticamente.
        </p>

        <form action={createLead} className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <input name="full_name" placeholder="Nombre completo" required className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500" />
          <input name="phone" placeholder="Teléfono" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500" />
          <input name="email" placeholder="Email" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500" />
          <input name="primary_zone" placeholder="Zona buscada" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500" />

          <div className="grid gap-4 md:grid-cols-2">
            <input name="budget_max" type="number" placeholder="Presupuesto máximo" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500" />
            <select name="currency" defaultValue="USD" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white">
              <option value="USD">USD</option>
              <option value="UYU">UYU</option>
            </select>
          </div>

          <input name="bedrooms_min" type="number" placeholder="Dormitorios" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500" />

          <select name="operation" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white">
            <option value="COMPRA">Compra</option>
            <option value="ALQUILER">Alquiler</option>
          </select>

          <select name="property_type" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white">
            <option value="APARTAMENTO">Apartamento</option>
            <option value="CASA">Casa</option>
          </select>

          <button className="w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400">
            Crear Lead con IA
          </button>
        </form>
      </div>
    </main>
  );
}
