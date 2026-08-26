import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  async function createProperty(formData: FormData) {
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

    const [{ data: subscription }, { count: propertiesCount }] = await Promise.all([
      supabase.from("subscriptions").select("max_properties").eq("organization_id", membership.organization_id).single(),
      supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
    ]);

    if (subscription?.max_properties && propertiesCount !== null && propertiesCount >= subscription.max_properties) {
      throw new Error("Alcanzaste el límite de propiedades de tu plan. Actualizá tu suscripción.");
    }

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

    const { data: createdProperty, error } = await supabase
      .from("properties")
      .insert({
        organization_id: membership.organization_id,
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
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    if (!createdProperty) throw new Error("No se pudo crear la propiedad.");

    revalidatePath("/protected/properties");
    revalidatePath(`/protected/properties/${createdProperty.id}`);
    revalidatePath("/protected/notifications");
    redirect(`/protected/properties/${createdProperty.id}`);
  }

  const inputClass = "mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#37332d] outline-none transition focus:border-[#8d7553]";
  const labelClass = "text-sm font-medium text-[#4f4941]";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/protected/properties" className="text-sm font-medium text-[#725d40] hover:text-[#3f3529]">← Volver a propiedades</Link>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Inventario inmobiliario</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Nueva propiedad</h1>
          <p className="mt-3 text-sm leading-6 text-[#625d55]">Cargá los datos comerciales completos. En Professional y Enterprise, RevScale calcula automáticamente los clientes compatibles apenas guardás la propiedad.</p>
        </div>

        <form action={createProperty} className="mt-8 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <label className={labelClass}>Título
            <input name="title" required maxLength={180} placeholder="Apartamento en Punta Carretas" className={inputClass} />
          </label>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>Tipo de propiedad
              <select name="property_type" defaultValue="APARTAMENTO" className={inputClass}>
                <option value="APARTAMENTO">Apartamento</option>
                <option value="CASA">Casa</option>
                <option value="TERRENO">Terreno</option>
                <option value="LOCAL">Local comercial</option>
                <option value="OFICINA">Oficina</option>
              </select>
            </label>
            <label className={labelClass}>Operación
              <select name="operation" defaultValue="COMPRA" className={inputClass}>
                <option value="COMPRA">Venta / compra</option>
                <option value="ALQUILER">Alquiler</option>
              </select>
            </label>
            <label className={labelClass}>Zona
              <input name="zone" maxLength={160} className={inputClass} placeholder="Pocitos" />
            </label>
            <label className={labelClass}>Dirección
              <input name="address" maxLength={220} className={inputClass} />
            </label>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <label className={labelClass}>Precio
              <input name="price" type="number" min="0" step="any" className={inputClass} placeholder="350000" />
            </label>
            <label className={labelClass}>Moneda
              <select name="currency" defaultValue="USD" className={inputClass}>
                <option value="USD">USD</option>
                <option value="UYU">UYU</option>
              </select>
            </label>
            <label className={labelClass}>Estado
              <select name="status" defaultValue="AVAILABLE" className={inputClass}>
                <option value="AVAILABLE">Disponible</option>
                <option value="RESERVED">Reservada</option>
                <option value="SOLD">Vendida</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <label className={labelClass}>Dormitorios
              <input name="bedrooms" type="number" min="0" className={inputClass} />
            </label>
            <label className={labelClass}>Baños
              <input name="bathrooms" type="number" min="0" className={inputClass} />
            </label>
            <label className={labelClass}>Área m²
              <input name="area_m2" type="number" min="0" step="any" className={inputClass} />
            </label>
          </div>

          <label className={`mt-5 block ${labelClass}`}>Descripción
            <textarea name="description" rows={6} maxLength={4000} className={inputClass} />
          </label>

          <button type="submit" className="mt-6 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">Guardar propiedad</button>
        </form>
      </div>
    </main>
  );
}