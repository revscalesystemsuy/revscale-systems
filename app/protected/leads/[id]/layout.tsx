import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatResponseMinutes, getSlaStatus, responseMinutes } from "@/lib/sla-metrics";

export default async function LeadDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("source_channel,source_provider,source_campaign,source_ad,source_listing,source_property_id,external_lead_id,utm_source,utm_medium,utm_campaign,utm_content,received_at,assigned_at,first_response_at,first_human_response_at,sla_deadline,sla_breached_at")
    .eq("id", id)
    .maybeSingle();

  let propertyTitle: string | null = null;
  if (lead?.source_property_id) {
    const { data: property } = await supabase.from("properties").select("title,zone").eq("id", lead.source_property_id).maybeSingle();
    if (property) propertyTitle = [property.title, property.zone].filter(Boolean).join(" · ");
  }

  const sla = lead ? getSlaStatus(lead) : "UNASSIGNED";
  const humanMinutes = lead ? responseMinutes(lead) : null;
  const automaticMinutes = lead?.received_at && lead.first_response_at
    ? Math.max(0, (new Date(lead.first_response_at).getTime() - new Date(lead.received_at).getTime()) / 60_000)
    : null;

  return (
    <>
      {lead && (
        <section className="mx-auto mt-6 max-w-7xl px-6 md:px-8 lg:px-10">
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Origen y velocidad</p>
                <h2 className="mt-2 font-serif text-2xl text-[#302d28]">Atribución del lead</h2>
              </div>
              <SlaBadge status={sla} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Canal" value={lead.source_channel || "Sin atribuir"} />
              <Info label="Proveedor" value={lead.source_provider || "Sin proveedor"} />
              <Info label="Campaña" value={lead.source_campaign || "Sin campaña"} />
              <Info label="Anuncio / publicación" value={lead.source_ad || lead.source_listing || "Sin referencia"} />
              <Info label="Propiedad de origen" value={propertyTitle || "Sin propiedad vinculada"} />
              <Info label="ID externo" value={lead.external_lead_id || "Sin ID externo"} />
              <Info label="UTM" value={[lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content].filter(Boolean).join(" · ") || "Sin UTM"} />
              <Info label="Recibido" value={formatDateTime(lead.received_at)} />
            </div>

            <div className="mt-5 grid gap-3 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Asignado" value={formatDateTime(lead.assigned_at)} />
              <Info label="Primera respuesta automática" value={automaticMinutes === null ? "Sin respuesta automática" : formatResponseMinutes(automaticMinutes)} />
              <Info label="Primera respuesta humana" value={humanMinutes === null ? "Sin respuesta humana" : formatResponseMinutes(humanMinutes)} />
              <Info label="Deadline SLA" value={formatDateTime(lead.sla_deadline)} />
            </div>
          </div>
        </section>
      )}
      {children}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{label}</p><p className="mt-1 text-sm leading-5 text-[#403b34]">{value}</p></div>;
}

function SlaBadge({ status }: { status: ReturnType<typeof getSlaStatus> }) {
  const labels = { UNASSIGNED: "Sin SLA", WAITING: "En SLA", WARNING: "Por vencer", WITHIN: "Cumplido", BREACHED: "Incumplido" };
  const cls = status === "BREACHED" ? "border-[#b88e75] bg-[#ead3c3] text-[#6b4433]" : status === "WARNING" ? "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]" : status === "WITHIN" ? "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]" : "border-[#d2c5b3] bg-[#eee4d5] text-[#6f6558]";
  return <span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${cls}`}>{labels[status]}</span>;
}

function formatDateTime(value: string | null) {
  if (!value) return "Sin registrar";
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value));
}
