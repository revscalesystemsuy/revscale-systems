import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { currentPlanHasFeature, getCurrentSubscription } from "@/lib/plan-access";

export default async function EditDevelopmentUnitPage({ params }: { params: Promise<{ id: string; unitId: string }> }) {
  const { id, unitId } = await params;
  const allowed = await currentPlanHasFeature("development_projects");
  if (!allowed) redirect("/protected/billing");
  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) redirect("/protected");
  const organizationId = subscription.organizationId;
  const supabase = await createClient();

  const [{ data: project }, { data: blocks }, { data: typologies }, { data: unit }] = await Promise.all([
    supabase.from("development_projects").select("id,name").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("development_blocks").select("id,name").eq("project_id", id).eq("organization_id", organizationId).order("sort_order"),
    supabase.from("development_typologies").select("id,name").eq("project_id", id).eq("organization_id", organizationId).order("created_at"),
    supabase.from("development_units").select("id,code,floor,orientation,price,currency,status,property_id,block_id,typology_id,notes").eq("id", unitId).eq("project_id", id).eq("organization_id", organizationId).maybeSingle(),
  ]);

  if (!project || !unit) redirect(`/protected/developments/${id}`);

  async function saveUnit(formData: FormData) {
    "use server";
    const allowed = await currentPlanHasFeature("development_projects");
    if (!allowed) throw new Error("Proyectos en pozo está disponible en Enterprise.");
    const subscription = await getCurrentSubscription();
    if (!subscription?.organizationId) throw new Error("Sin organización activa");
    const supabase = await createClient();

    const code = String(formData.get("code") || "").trim();
    const typologyId = String(formData.get("typology_id") || "").trim();
    const status = String(formData.get("status") || "AVAILABLE").toUpperCase();
    if (!code || !typologyId) throw new Error("Código y tipología son obligatorios.");
    if (!["AVAILABLE", "RESERVED", "BLOCKED", "SOLD"].includes(status)) throw new Error("Estado inválido.");

    const { error } = await supabase
      .from("development_units")
      .update({
        code,
        block_id: String(formData.get("block_id") || "").trim() || null,
        typology_id: typologyId,
        floor: String(formData.get("floor") || "").trim() || null,
        orientation: String(formData.get("orientation") || "").trim() || null,
        price: nullableNumber(formData.get("price")),
        currency: String(formData.get("currency") || "USD").toUpperCase(),
        status,
        notes: String(formData.get("notes") || "").trim() || null,
      })
      .eq("id", unitId)
      .eq("project_id", id)
      .eq("organization_id", subscription.organizationId);

    if (error) throw new Error(error.message);
    revalidatePath(`/protected/developments/${id}`);
    revalidatePath("/protected/properties");
    revalidatePath("/protected/notifications");
    if (unit.property_id) revalidatePath(`/protected/properties/${unit.property_id}`);
    redirect(`/protected/developments/${id}`);
  }

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href={`/protected/developments/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-[#725d40] hover:text-[#3f3529]"><ArrowLeft size={15}/>Volver al proyecto</Link>
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">{project.name}</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722]">Editar unidad {unit.code}</h1>
          <p className="mt-3 text-sm leading-6 text-[#625d55]">Los cambios se sincronizan con Propiedades. Si la unidad queda Disponible, RevScale recalcula automáticamente sus clientes compatibles.</p>
        </div>

        <form action={saveUnit} className="mt-8 grid gap-5 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:grid-cols-2 md:p-8">
          <Field label="Código"><input name="code" required defaultValue={unit.code} className={inputClass}/></Field>
          <Field label="Torre / bloque"><select name="block_id" defaultValue={unit.block_id || ""} className={inputClass}><option value="">Sin bloque</option>{(blocks || []).map((block)=><option key={block.id} value={block.id}>{block.name}</option>)}</select></Field>
          <Field label="Tipología"><select name="typology_id" required defaultValue={unit.typology_id} className={inputClass}>{(typologies || []).map((type)=><option key={type.id} value={type.id}>{type.name}</option>)}</select></Field>
          <Field label="Estado"><select name="status" defaultValue={unit.status} className={inputClass}><option value="AVAILABLE">Disponible</option><option value="RESERVED">Reservada</option><option value="BLOCKED">Bloqueada</option><option value="SOLD">Vendida</option></select></Field>
          <Field label="Piso"><input name="floor" defaultValue={unit.floor || ""} className={inputClass}/></Field>
          <Field label="Orientación"><input name="orientation" defaultValue={unit.orientation || ""} className={inputClass}/></Field>
          <Field label="Precio"><input name="price" type="number" min="0" step="any" defaultValue={unit.price ?? ""} className={inputClass}/></Field>
          <Field label="Moneda"><select name="currency" defaultValue={unit.currency} className={inputClass}><option value="USD">USD</option><option value="UYU">UYU</option></select></Field>
          <div className="md:col-span-2"><Field label="Notas"><textarea name="notes" rows={4} defaultValue={unit.notes || ""} className={inputClass}/></Field></div>
          <div className="md:col-span-2 flex flex-wrap gap-3 border-t border-[#d8ccbb] pt-5"><button className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2]"><Save size={15}/>Guardar cambios</button>{unit.property_id && <Link href={`/protected/properties/${unit.property_id}`} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-5 py-3 text-sm font-semibold text-[#5f513e]">Ver propiedad sincronizada</Link>}</div>
        </form>
      </div>
    </main>
  );
}

function nullableNumber(value: FormDataEntryValue | null) { const raw = String(value || "").trim(); if (!raw) return null; const n = Number(raw); if (!Number.isFinite(n) || n < 0) throw new Error("Valor numérico inválido."); return n; }
const inputClass = "mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#37332d] outline-none transition focus:border-[#8d7553]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-medium text-[#4f4941]">{label}{children}</label>; }
