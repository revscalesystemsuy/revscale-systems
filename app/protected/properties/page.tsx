import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Building2, Eye, Pencil, Plus } from "lucide-react";

export default function PropertiesPage() {
  return (
    <Suspense fallback={<PropertiesSkeleton />}>
      <PropertiesContent />
    </Suspense>
  );
}

async function PropertiesContent() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) redirect("/auth/login");

  const { data: properties, error } = await supabase
    .from("properties")
    .select("id,title,property_type,operation,zone,address,price,currency,bedrooms,bathrooms,area_m2,status,description,created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Inventario inmobiliario</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Propiedades</h1>
            <p className="mt-3 text-sm leading-6 text-[#625d55]">Entrá a cualquier propiedad para revisar sus datos o editarla cuando sea necesario.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7a67]">Total</p>
              <p className="mt-1 font-serif text-2xl text-[#37332d]">{properties?.length ?? 0}</p>
            </div>
            <Link href="/protected/properties/new" className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">
              <Plus size={16} /> Nueva propiedad
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] p-4 text-sm text-[#7b4539]">No se pudieron cargar las propiedades.</div>
        )}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties?.map((property) => (
            <article key={property.id} className="overflow-hidden rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
              <Link href={`/protected/properties/${property.id}`} className="block">
                <div className="flex h-36 items-center justify-center border-b border-[#ded2c1] bg-[#eee4d5] text-[#8a7a67] transition hover:bg-[#e8ddcd]">
                  <Building2 size={32} strokeWidth={1.4} />
                </div>
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8d7553]">{property.operation || "Sin operación"}</p>
                      <h2 className="mt-2 truncate font-serif text-xl font-medium text-[#37332d]">{property.title}</h2>
                    </div>
                    <StatusBadge status={property.status} />
                  </div>
                  <p className="mt-3 text-sm text-[#5f584f]">{property.zone || "Zona sin definir"}</p>
                  {property.address && <p className="mt-1 truncate text-xs text-[#81786d]">{property.address}</p>}

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#6f675d]">
                    <span>{property.bedrooms ?? "—"} dorm.</span>
                    <span>{property.bathrooms ?? "—"} baños</span>
                    <span>{property.area_m2 ? `${property.area_m2} m²` : "— m²"}</span>
                  </div>

                  <div className="mt-5 border-t border-[#ddd1c0] pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7a67]">Precio</p>
                    <p className="mt-1 font-serif text-2xl text-[#37332d]">
                      {property.price ? `${property.currency || ""} ${Number(property.price).toLocaleString()}` : "Consultar"}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="grid grid-cols-2 gap-2 px-5 pb-5 pt-2">
                <Link href={`/protected/properties/${property.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm font-semibold text-[#5f513e] transition hover:bg-[#efe5d7]">
                  <Eye size={15} /> Ver
                </Link>
                <Link href={`/protected/properties/${property.id}/edit`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#302d28] px-3 py-2.5 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">
                  <Pencil size={15} /> Editar
                </Link>
              </div>
            </article>
          ))}
        </section>

        {!properties?.length && !error && (
          <div className="rounded-xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-14 text-center">
            <Building2 className="mx-auto text-[#8d7b63]" size={30} strokeWidth={1.4} />
            <h2 className="mt-4 font-serif text-2xl font-medium text-[#37332d]">Todavía no hay propiedades</h2>
            <p className="mt-2 text-sm text-[#716a61]">Creá la primera propiedad de tu inventario.</p>
            <Link href="/protected/properties/new" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2]">
              <Plus size={16} /> Nueva propiedad
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { AVAILABLE: "Disponible", RESERVED: "Reservada", SOLD: "Vendida" };
  return <span className="shrink-0 rounded-full border border-[#d1c3ae] bg-[#eee4d5] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#665942]">{labels[status] || status}</span>;
}

function PropertiesSkeleton() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-9 w-48 rounded bg-[#ded2c1]" />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-80 rounded-xl bg-[#e5dac9]" />
          <div className="h-80 rounded-xl bg-[#e5dac9]" />
          <div className="h-80 rounded-xl bg-[#e5dac9]" />
        </div>
      </div>
    </main>
  );
}
