import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentPlanHasFeature } from "@/lib/plan-access";
import PropertySendWhatsAppButton from "./PropertySendWhatsAppButton";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id,title,property_type,operation,zone,address,price,currency,bedrooms,bathrooms,area_m2,status,description")
    .eq("id", id)
    .maybeSingle();

  if (!property) redirect("/protected/properties");

  const hasMatching = await currentPlanHasFeature("matching");
  const { data: compatibleLeads } = hasMatching
    ? await supabase
        .from("leads")
        .select("id,full_name,phone,primary_zone,budget_max,bedrooms_min,lead_score")
        .eq("property_type", property.property_type)
        .eq("operation", property.operation)
        .order("lead_score", { ascending: false })
        .limit(5)
    : { data: [] };

  const { count: sentCount } = await supabase
    .from("interactions")
    .select("id", { count: "exact", head: true })
    .eq("detected_intent", "ENVIAR_PROPIEDAD")
    .eq("property_id", property.id);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected/properties" className="text-blue-400">← Volver a propiedades</Link>

        <div className="mt-6">
          <p className="text-sm text-blue-400">{property.operation === "COMPRA" ? "VENTA" : property.operation}</p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">{property.title}</h1>
            <StatusBadge status={property.status} />
          </div>
          <p className="mt-2 text-slate-400">{property.zone}</p>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title="🏠 Información">
            <p>Tipo: {property.property_type}</p>
            <p className="mt-2">Dirección: {property.address || "Sin dirección"}</p>
          </Card>

          <Card title="💰 Precio">
            <p className="text-3xl font-bold">
              {property.price ? `${property.currency || ""} ${Number(property.price).toLocaleString()}` : "Consultar"}
            </p>
          </Card>

          <Card title="📐 Características">
            <p>🛏 Dormitorios: {property.bedrooms ?? "—"}</p>
            <p className="mt-2">🚿 Baños: {property.bathrooms ?? "—"}</p>
            <p className="mt-2">📏 Área: {property.area_m2 ?? "—"} m²</p>
          </Card>

          <Card title="📊 Rendimiento comercial">
            <p>Propiedad enviada: <b className="text-blue-400">{sentCount ?? 0}</b> veces</p>
            <p className="mt-2 text-sm text-slate-400">Métrica de esta propiedad únicamente.</p>
          </Card>

          <Card title="🤖 Leads compatibles">
            {!hasMatching ? (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <p className="font-semibold">Disponible desde Professional</p>
                <p className="mt-2 text-sm text-slate-400">El matching automático entre propiedades y leads requiere Professional o Enterprise.</p>
                <Link href="/pricing" className="mt-4 inline-block rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white">Ver planes</Link>
              </div>
            ) : !compatibleLeads?.length ? (
              <p className="text-slate-400">No hay leads compatibles todavía.</p>
            ) : (
              <div className="space-y-3">
                {compatibleLeads.map((lead) => (
                  <div key={lead.id} className="rounded-xl border border-white/10 p-4">
                    <Link href={`/protected/leads/${lead.id}`} className="block hover:text-blue-400">
                      <p className="font-semibold">{lead.full_name || "Sin nombre"}</p>
                      <p className="text-sm text-blue-400">Score: {lead.lead_score ?? "—"}</p>
                      <p className="text-sm text-slate-400">{lead.primary_zone || "Zona sin definir"}</p>
                    </Link>
                    <PropertySendWhatsAppButton propertyId={property.id} leadId={lead.id} phone={lead.phone} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {property.description && (
          <section className="mt-5">
            <Card title="📝 Descripción"><p className="text-slate-300">{property.description}</p></Card>
          </section>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; style: string }> = {
    AVAILABLE: { label: "🟢 Disponible", style: "bg-green-500/10 text-green-400" },
    RESERVED: { label: "🟡 Reservada", style: "bg-yellow-500/10 text-yellow-400" },
    SOLD: { label: "🔴 Vendida", style: "bg-red-500/10 text-red-400" },
  };
  const current = config[status] || { label: status, style: "bg-white/5 text-slate-300" };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${current.style}`}>{current.label}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}
