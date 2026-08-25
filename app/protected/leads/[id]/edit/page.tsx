import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Save } from "lucide-react";

const STAGES = [
  ["NEW", "Nuevo lead"],
  ["CONTACTED", "Contactado"],
  ["QUALIFIED", "Calificado"],
  ["VISIT", "Visita"],
  ["NEGOTIATION", "Negociación"],
  ["WON", "Cierre"],
  ["LOST", "Perdido"],
] as const;

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) redirect("/protected");

  const { data: lead } = await supabase
    .from("leads")
    .select("id,full_name,phone,email,operation,property_type,primary_zone,budget_max,currency,bedrooms_min,lead_score,lead_temperature,next_action,requires_human,pipeline_stage")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (!lead) redirect("/protected/leads");

  async function updateLead(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) redirect("/auth/login");

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .single();
    if (!membership) throw new Error("Sin organización activa.");

    const fullName = String(formData.get("full_name") || "").trim();
    if (!fullName) throw new Error("El nombre es obligatorio.");

    const budgetRaw = String(formData.get("budget_max") || "").trim();
    const bedroomsRaw = String(formData.get("bedrooms_min") || "").trim();
    const budget = budgetRaw ? Number(budgetRaw) : null;
    const bedrooms = bedroomsRaw ? Number(bedroomsRaw) : null;
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) throw new Error("Presupuesto inválido.");
    if (bedrooms !== null && (!Number.isInteger(bedrooms) || bedrooms < 0)) throw new Error("Dormitorios inválidos.");

    const zone = String(formData.get("primary_zone") || "").trim();
    let score = 30;
    if (zone) score += 20;
    if (budget) score += 25;
    if (bedrooms) score += 15;
    const temperature = score >= 80 ? "HOT" : score >= 50 ? "WARM" : "COLD";

    const { data, error } = await supabase
      .from("leads")
      .update({
        full_name: fullName,
        phone: String(formData.get("phone") || "").trim() || null,
        email: String(formData.get("email") || "").trim().toLowerCase() || null,
        operation: String(formData.get("operation") || "").trim().toUpperCase() || null,
        property_type: String(formData.get("property_type") || "").trim().toUpperCase() || null,
        primary_zone: zone || null,
        budget_max: budget,
        currency: String(formData.get("currency") || "USD").trim().toUpperCase(),
        bedrooms_min: bedrooms,
        lead_score: score,
        lead_temperature: temperature,
        next_action: String(formData.get("next_action") || "").trim() || null,
        pipeline_stage: String(formData.get("pipeline_stage") || "NEW").trim().toUpperCase(),
        requires_human: formData.get("requires_human") === "on",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("No tenés acceso a este lead.");

    revalidatePath("/protected/leads");
    revalidatePath("/protected/pipeline");
    revalidatePath(`/protected/leads/${id}`);
    redirect(`/protected/leads/${id}`);
  }

  const input = "mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#37332d] outline-none focus:border-[#8d7553]";
  const label = "text-sm font-medium text-[#4f4941]";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href={`/protected/leads/${id}`} className="text-sm font-medium text-[#725d40] hover:text-[#3f3529]">← Volver al lead</Link>
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Gestión comercial</p>
          <h1 className="mt-3 font-serif text-4xl font-medium text-[#292722] md:text-5xl">Editar lead</h1>
          <p className="mt-3 text-sm leading-6 text-[#625d55]">Corregí datos, preferencias, próxima acción y etapa comercial desde un solo lugar.</p>
        </div>

        <form action={updateLead} className="mt-8 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <label className={label}>Nombre completo<input name="full_name" required defaultValue={lead.full_name || ""} className={input} /></label>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={label}>Teléfono<input name="phone" defaultValue={lead.phone || ""} className={input} /></label>
            <label className={label}>Email<input name="email" type="email" defaultValue={lead.email || ""} className={input} /></label>
            <label className={label}>Operación<select name="operation" defaultValue={lead.operation || "COMPRA"} className={input}><option value="COMPRA">Compra</option><option value="ALQUILER">Alquiler</option></select></label>
            <label className={label}>Tipo de propiedad<select name="property_type" defaultValue={lead.property_type || "APARTAMENTO"} className={input}><option value="APARTAMENTO">Apartamento</option><option value="CASA">Casa</option></select></label>
            <label className={label}>Zona<input name="primary_zone" defaultValue={lead.primary_zone || ""} className={input} /></label>
            <label className={label}>Dormitorios mínimos<input name="bedrooms_min" type="number" min="0" defaultValue={lead.bedrooms_min ?? ""} className={input} /></label>
            <label className={label}>Presupuesto máximo<input name="budget_max" type="number" min="0" step="any" defaultValue={lead.budget_max ?? ""} className={input} /></label>
            <label className={label}>Moneda<select name="currency" defaultValue={lead.currency || "USD"} className={input}><option value="USD">USD</option><option value="UYU">UYU</option></select></label>
            <label className={label}>Etapa comercial<select name="pipeline_stage" defaultValue={lead.pipeline_stage || "NEW"} className={input}>{STAGES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <label className={label}>Próxima acción<input name="next_action" defaultValue={lead.next_action || ""} className={input} placeholder="Llamar, enviar opciones, coordinar visita..." /></label>
          </div>

          <label className="mt-5 flex items-center gap-3 text-sm text-[#554f47]"><input type="checkbox" name="requires_human" defaultChecked={Boolean(lead.requires_human)} /> Requiere atención humana</label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2]"><Save size={16} /> Guardar cambios</button>
            <Link href={`/protected/leads/${id}`} className="inline-flex items-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-5 py-3 text-sm font-semibold text-[#5f513e]">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
