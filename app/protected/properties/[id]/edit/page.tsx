import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Save } from "lucide-react";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
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
    .maybeSingle();
  if (!membership) redirect("/protected");

  const { data: property } = await supabase
    .from("properties")
    .select("id,title,property_type,operation,zone,address,price,currency,bedrooms,bathrooms,area_m2,status,description")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (!property) redirect("/protected/properties");

  async function updateProperty(formData: FormData) {
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
      .maybeSingle();
    if (!membership) throw new Error("No se encontró una organización para este usuario.");

    const title = String(formData.get("title") || "").trim();
    if (!title) throw new Error("El título es obligatorio.");
    const numberOrNull = (name: string) => {
      const value = String(formData.get(name) || "").trim();
      if (!value) return null;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) throw new Error(`Valor inválido en ${name}.`);
      return number;
    };

    const operation = String(formData.get("operation") || "COMPRA").toUpperCase();
    const currency = String(formData.get("currency") || "USD").toUpperCase();
    const status = String(formData.get("status") || "AVAILABLE").toUpperCase();
    if (!["COMPRA", "ALQUILER"].includes(operation)) throw new Error("Operación inválida.");
    if (!["USD", "UYU"].includes(currency)) throw new Error("Moneda inválida.");
    if (!["AVAILABLE", "RESERVED", "SOLD"].includes(status)) throw new Error("Estado inválido.");

    const { error } = await supabase
      .from("properties")
      .update({
        title,
        property_type: String(formData.get("property_type") || "").trim().toUpperCase() || null,
        operation,
        zone: String(formData.get("zone") || "").trim() || null,
        address: String(formData.get("address") || "").trim() || null,
        price: numberOrNull("price"),
        currency,
        bedrooms: numberOrNull("bedrooms"),
        bathrooms: numberOrNull("bathrooms"),
        area_m2: numberOrNull("area_m2"),
        status,
        description: String(formData.get("description") || "").trim() || null,
      })
      .eq("id", id)
      .eq("organization_id", membership.organization_id);
    if (error) throw new Error(error.message);

    revalidatePath("/protected/properties");
    revalidatePath(`/protected/properties/${id}`);
    revalidatePath("/protected/notifications");
    redirect(`/protected/properties/${id}`);
  }

  const inputClass = "mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#37332d] outline-none transition focus:border-[#8d7553]";
  const labelClass = "text-sm font-medium text-[#4f4941]";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href={`/protected/properties/${id}`} className="text-sm font-medium text-[#725d40] hover:text-[#3f3529]">← Volver a la propiedad</Link>
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Inventario inmobiliario</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Editar propiedad</h1>
          <p className="mt-3 text-sm leading-6 text-[#625d55]">Al guardar cambios de tipo, operación, zona, precio, moneda, dormitorios o disponibilidad, RevScale recalcula automáticamente los clientes compatibles en Professional y Enterprise.</p>
        </div>

        <form action={updateProperty} className="mt-8 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <label className={labelClass}>Título<input name="title" required defaultValue={property.title || ""} className={inputClass} /></label>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>Tipo de propiedad<select name="property_type" defaultValue={property.property_type || "APARTAMENTO"} className={inputClass}><option value="APARTAMENTO">Apartamento</option><option value="CASA">Casa</option><option value="TERRENO">Terreno</option><option value="LOCAL">Local comercial</option><option value="OFICINA">Oficina</option></select></label>
            <label className={labelClass}>Operación<select name="operation" defaultValue={property.operation === "VENTA" ? "COMPRA" : property.operation || "COMPRA"} className={inputClass}><option value="COMPRA">Venta / compra</option><option value="ALQUILER">Alquiler</option></select></label>
            <label className={labelClass}>Zona<input name="zone" defaultValue={property.zone || ""} className={inputClass} /></label>
            <label className={labelClass}>Dirección<input name="address" defaultValue={property.address || ""} className={inputClass} /></label>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <label className={labelClass}>Precio<input name="price" type="number" min="0" step="any" defaultValue={property.price ?? ""} className={inputClass} /></label>
            <label className={labelClass}>Moneda<select name="currency" defaultValue={property.currency || "USD"} className={inputClass}><option value="USD">USD</option><option value="UYU">UYU</option></select></label>
            <label className={labelClass}>Estado<select name="status" defaultValue={property.status || "AVAILABLE"} className={inputClass}><option value="AVAILABLE">Disponible</option><option value="RESERVED">Reservada</option><option value="SOLD">Vendida</option></select></label>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <label className={labelClass}>Dormitorios<input name="bedrooms" type="number" min="0" defaultValue={property.bedrooms ?? ""} className={inputClass} /></label>
            <label className={labelClass}>Baños<input name="bathrooms" type="number" min="0" defaultValue={property.bathrooms ?? ""} className={inputClass} /></label>
            <label className={labelClass}>Área m²<input name="area_m2" type="number" min="0" step="any" defaultValue={property.area_m2 ?? ""} className={inputClass} /></label>
          </div>
          <label className={`mt-5 block ${labelClass}`}>Descripción<textarea name="description" rows={6} defaultValue={property.description || ""} className={inputClass} /></label>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]"><Save size={16} /> Guardar cambios</button>
            <Link href={`/protected/properties/${id}`} className="inline-flex items-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-5 py-3 text-sm font-semibold text-[#5f513e] hover:bg-[#efe5d7]">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}