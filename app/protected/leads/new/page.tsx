import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function NewLeadPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/auth/login");

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

    const [{ data: subscription }, { count: leadsCount }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan,max_leads")
        .eq("organization_id", membership.organization_id)
        .single(),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id),
    ]);

    if (subscription?.max_leads && leadsCount !== null && leadsCount >= subscription.max_leads) {
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
    revalidatePath("/protected/today");
    redirect("/protected/leads");
  }

  const input = "mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3.5 py-3 text-sm text-[#37332d] outline-none placeholder:text-[#a3988b] focus:border-[#8d7553]";
  const label = "text-sm font-medium text-[#4f4941]";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/protected/leads" className="inline-flex items-center gap-2 text-sm font-medium text-[#725d40] hover:text-[#3f3529]">
          <ArrowLeft size={15} strokeWidth={1.7} />
          Volver a leads
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Gestión comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Nuevo lead</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55]">
              Cargá los datos disponibles. El sistema calcula una prioridad inicial y respeta las reglas de asignación de tu organización.
            </p>
          </div>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_300px]">
          <form action={createLead} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)] md:p-7">
            <div>
              <p className="font-serif text-2xl font-medium text-[#302d28]">Datos del contacto</p>
              <p className="mt-1 text-xs leading-5 text-[#81796e]">Solo el nombre es obligatorio; completá el resto cuando esté disponible.</p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className={`${label} md:col-span-2`}>
                Nombre completo
                <input name="full_name" placeholder="Ej. Sofía Rodríguez" required className={input} />
              </label>

              <label className={label}>
                Teléfono
                <input name="phone" placeholder="Ej. +598 99 123 456" className={input} />
              </label>

              <label className={label}>
                Email
                <input name="email" type="email" placeholder="sofia@email.com" className={input} />
              </label>
            </div>

            <div className="mt-8 border-t border-[#ddd1c0] pt-6">
              <p className="font-serif text-2xl font-medium text-[#302d28]">Búsqueda inmobiliaria</p>
              <p className="mt-1 text-xs leading-5 text-[#81796e]">Estos datos alimentan la prioridad comercial inicial y el matching.</p>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className={`${label} md:col-span-2`}>
                  Zona buscada
                  <input name="primary_zone" placeholder="Ej. Pocitos, Carrasco, Ciudad de la Costa" className={input} />
                </label>

                <label className={label}>
                  Presupuesto máximo
                  <input name="budget_max" type="number" min="0" step="any" placeholder="Ej. 250000" className={input} />
                </label>

                <label className={label}>
                  Moneda
                  <select name="currency" defaultValue="USD" className={input}>
                    <option value="USD">USD</option>
                    <option value="UYU">UYU</option>
                  </select>
                </label>

                <label className={label}>
                  Dormitorios mínimos
                  <input name="bedrooms_min" type="number" min="0" placeholder="Ej. 2" className={input} />
                </label>

                <label className={label}>
                  Operación
                  <select name="operation" defaultValue="COMPRA" className={input}>
                    <option value="COMPRA">Compra</option>
                    <option value="ALQUILER">Alquiler</option>
                  </select>
                </label>

                <label className={`${label} md:col-span-2`}>
                  Tipo de propiedad
                  <select name="property_type" defaultValue="APARTAMENTO" className={input}>
                    <option value="APARTAMENTO">Apartamento</option>
                    <option value="CASA">Casa</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[#ddd1c0] pt-6">
              <button className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">
                <Plus size={16} strokeWidth={1.7} />
                Crear lead
              </button>
              <Link href="/protected/leads" className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-5 py-3 text-sm font-semibold text-[#5f513e] transition hover:bg-[#f2e9dc]">
                Cancelar
              </Link>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
              <div className="flex items-center gap-2 text-[#806d52]">
                <Sparkles size={17} strokeWidth={1.6} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Prioridad inicial</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#625d55]">
                El sistema pondera zona, presupuesto y dormitorios para clasificar el lead como alta, media o baja prioridad.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#806d52]">Asignación</p>
              <p className="mt-3 text-sm leading-6 text-[#625d55]">
                En Enterprise se respetan las reglas automáticas y el alcance por rol/equipo ya configurados.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
