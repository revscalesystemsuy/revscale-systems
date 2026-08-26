import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CheckCircle2,
  MapPin,
  Pencil,
  RefreshCw,
  Ruler,
  Send,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { currentPlanHasFeature } from "@/lib/plan-access";
import PropertySendWhatsAppButton from "./PropertySendWhatsAppButton";
import { recalculatePropertyMatches } from "./actions";

function formatDateTime(value?: string | null) {
  if (!value) return "Sin cálculo todavía";
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Montevideo",
  }).format(new Date(value));
}

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

  const [{ data: matchRows }, { count: sentCount }] = await Promise.all([
    hasMatching
      ? supabase
          .from("property_lead_matches")
          .select("lead_id,assigned_to,compatibility,reasons,matched_at")
          .eq("property_id", property.id)
          .order("compatibility", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as { lead_id: string; assigned_to: string | null; compatibility: number; reasons: unknown; matched_at: string }[] }),
    supabase
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .eq("detected_intent", "ENVIAR_PROPIEDAD")
      .eq("property_id", property.id),
  ]);

  const matches = matchRows || [];
  const leadIds = [...new Set(matches.map((match) => match.lead_id))];
  const agentIds = [...new Set(matches.map((match) => match.assigned_to).filter(Boolean))] as string[];

  const [{ data: leadRows }, { data: profileRows }] = await Promise.all([
    leadIds.length
      ? supabase
          .from("leads")
          .select("id,full_name,phone,primary_zone,budget_max,currency,bedrooms_min,lead_score,lead_temperature,assigned_to")
          .in("id", leadIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; phone: string | null; primary_zone: string | null; budget_max: number | null; currency: string | null; bedrooms_min: number | null; lead_score: number | null; lead_temperature: string | null; assigned_to: string | null }[] }),
    agentIds.length
      ? supabase.from("profiles").select("id,full_name").in("id", agentIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const leadsById = new Map((leadRows || []).map((lead) => [lead.id, lead]));
  const agentNames = new Map((profileRows || []).map((profile) => [profile.id, profile.full_name || "Agente"]));
  const visibleMatches = matches
    .map((match) => ({ ...match, lead: leadsById.get(match.lead_id) }))
    .filter((match) => Boolean(match.lead));

  const bestMatch = visibleMatches[0]?.compatibility ?? 0;
  const lastMatchedAt = visibleMatches[0]?.matched_at || null;
  const operationLabel = property.operation === "COMPRA" ? "Venta" : property.operation === "ALQUILER" ? "Alquiler" : property.operation;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/properties" className="inline-flex items-center gap-2 text-sm font-medium text-[#725d40] hover:text-[#3f3529]">
          <ArrowLeft size={15} /> Volver a propiedades
        </Link>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#ccbda7] bg-[#eee4d5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#725d40]">{operationLabel}</span>
              <StatusBadge status={property.status} />
            </div>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">{property.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-[#625d55]"><MapPin size={15} /> {property.zone || "Zona sin definir"}</p>
          </div>
          <Link href={`/protected/properties/${property.id}/edit`} className="inline-flex items-center gap-2 self-start rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">
            <Pencil size={15} /> Editar propiedad
          </Link>
        </div>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Precio" value={property.price ? `${property.currency || ""} ${Number(property.price).toLocaleString("es-UY")}` : "Consultar"} />
          <MetricCard title="Matches automáticos" value={hasMatching ? visibleMatches.length : "Professional+"} />
          <MetricCard title="Mejor afinidad" value={hasMatching && bestMatch ? `${bestMatch}%` : "—"} />
          <MetricCard title="Envíos registrados" value={sentCount ?? 0} />
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5">
            <Card title="Información de la propiedad">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Info icon={<Building2 size={16} />} label="Tipo" value={property.property_type || "Sin definir"} />
                <Info icon={<MapPin size={16} />} label="Dirección" value={property.address || "Sin dirección"} />
                <Info icon={<BedDouble size={16} />} label="Dormitorios" value={property.bedrooms == null ? "—" : String(property.bedrooms)} />
                <Info icon={<Bath size={16} />} label="Baños" value={property.bathrooms == null ? "—" : String(property.bathrooms)} />
                <Info icon={<Ruler size={16} />} label="Área" value={property.area_m2 == null ? "—" : `${property.area_m2} m²`} />
                <Info icon={<Send size={16} />} label="Enviada a clientes" value={`${sentCount ?? 0} veces`} />
              </div>
            </Card>

            {property.description && (
              <Card title="Descripción">
                <p className="text-sm leading-7 text-[#625d55]">{property.description}</p>
              </Card>
            )}
          </div>

          <Card title="Matching automático">
            {!hasMatching ? (
              <div className="rounded-xl border border-[#d2c5b3] bg-[#eee4d5] p-5">
                <p className="font-semibold text-[#37332d]">Disponible desde Professional</p>
                <p className="mt-2 text-sm leading-6 text-[#6f685f]">Cuando una propiedad se crea o cambia precio, zona, operación, dormitorios o disponibilidad, RevScale recalcula automáticamente qué clientes encajan.</p>
                <Link href="/pricing" className="mt-4 inline-block rounded-lg bg-[#302d28] px-4 py-2 text-sm font-semibold !text-[#fffaf2]">Ver Professional</Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 rounded-xl border border-[#cdbfa9] bg-[#eee4d5] p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7a6548]"><CheckCircle2 size={14} /> Motor automático activo</div>
                    <p className="mt-2 font-serif text-2xl text-[#302d28]">{visibleMatches.length} cliente{visibleMatches.length === 1 ? "" : "s"} compatible{visibleMatches.length === 1 ? "" : "s"}</p>
                    <p className="mt-2 text-xs text-[#81796e]">Último cálculo: {formatDateTime(lastMatchedAt)}</p>
                  </div>
                  <form action={recalculatePropertyMatches}>
                    <input type="hidden" name="property_id" value={property.id} />
                    <button className="inline-flex items-center gap-2 rounded-lg border border-[#bca98f] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#554f47] hover:bg-[#f5ecdf]">
                      <RefreshCw size={15} /> Recalcular matches
                    </button>
                  </form>
                </div>

                <div className="mt-5 space-y-3">
                  {visibleMatches.map((match) => {
                    const lead = match.lead!;
                    const reasons = Array.isArray(match.reasons) ? match.reasons.map(String) : [];
                    return (
                      <article key={match.lead_id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <Link href={`/protected/leads/${lead.id}`} className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-[#403b34]">{lead.full_name || "Sin nombre"}</p>
                              {lead.lead_temperature && <span className="rounded-full border border-[#d0c2ad] bg-[#eee4d5] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#6b6258]">{lead.lead_temperature}</span>}
                            </div>
                            <p className="mt-1 text-xs text-[#81796e]">{lead.primary_zone || "Zona sin definir"} · {lead.currency || ""} {lead.budget_max ? Number(lead.budget_max).toLocaleString("es-UY") : "sin presupuesto"}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#81796e]"><UsersRound size={13} /> {match.assigned_to ? agentNames.get(match.assigned_to) || "Agente asignado" : "Sin agente asignado"}</p>
                          </Link>
                          <div className="rounded-lg border border-[#c5b396] bg-[#eee4d5] px-3 py-2 text-center">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">Afinidad</p>
                            <p className="mt-1 font-serif text-xl text-[#6f5c40]">{match.compatibility}%</p>
                          </div>
                        </div>

                        {reasons.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#e0d6c8] pt-3">
                            {reasons.map((reason) => <span key={reason} className="rounded-full border border-[#d8ccbc] bg-[#f7f0e6] px-2.5 py-1 text-[10px] text-[#6c655c]">{reason}</span>)}
                          </div>
                        )}

                        <PropertySendWhatsAppButton propertyId={property.id} leadId={lead.id} phone={lead.phone} />
                      </article>
                    );
                  })}

                  {!visibleMatches.length && (
                    <div className="rounded-xl border border-dashed border-[#cdbfa9] bg-[#fffaf2] p-8 text-center">
                      <p className="font-medium text-[#403b34]">Todavía no hay clientes con afinidad suficiente.</p>
                      <p className="mt-2 text-sm text-[#81796e]">RevScale volverá a calcular automáticamente cuando cambie la propiedad. También podés forzarlo con “Recalcular matches”.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; style: string }> = {
    AVAILABLE: { label: "Disponible", style: "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]" },
    RESERVED: { label: "Reservada", style: "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]" },
    SOLD: { label: "Vendida", style: "border-[#b58d73] bg-[#ead8cb] text-[#6b4433]" },
  };
  const current = config[status] || { label: status, style: "border-[#c8c0b3] bg-[#eee9e0] text-[#625d55]" };
  return <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${current.style}`}>{current.label}</span>;
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-2xl leading-none text-[#2f2c27]">{value}</p></div>;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-[#ded2c2] bg-[#fffaf2] p-4"><div className="flex items-center gap-2 text-[#806d52]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</p></div><p className="mt-2 text-sm text-[#403b34]">{value}</p></div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.05)]"><h2 className="mb-5 font-serif text-xl font-medium text-[#37332d]">{title}</h2>{children}</section>;
}