import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createLeadFollowup } from "./actions";
import WhatsAppButton from "./WhatsAppButton";
import { getMatchingProperties } from "./match-actions";
import PropertyWhatsAppButton from "./PropertyWhatsAppButton";
import { currentPlanHasFeature } from "@/lib/plan-access";
import Link from "next/link";
import { Pencil } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  NEW: "Nuevo lead",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  VISIT: "Visita",
  NEGOTIATION: "Negociación",
  WON: "Cierre",
  LOST: "Perdido",
};

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select(`
      id,
      full_name,
      phone,
      email,
      operation,
      property_type,
      primary_zone,
      budget_max,
      currency,
      bedrooms_min,
      lead_score,
      lead_temperature,
      next_action,
      requires_human,
      pipeline_stage
    `)
    .eq("id", id)
    .maybeSingle();

  if (!lead) redirect("/protected/leads");

  const hasAdvancedAI = await currentPlanHasFeature("ai_assistant");
  const matches = hasAdvancedAI ? await getMatchingProperties(lead.id) : [];
  const aiLevel = lead.lead_score >= 80 ? "Alta" : lead.lead_score >= 50 ? "Media" : "Baja";

  const { data: interactions } = await supabase
    .from("interactions")
    .select(`id,channel,direction,actor,message,detected_intent,created_at`)
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Lead comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium text-[#292722] md:text-5xl">{lead.full_name || "Sin nombre"}</h1>
            <p className="mt-2 text-sm text-[#6c655c]">Detalle del cliente potencial</p>
          </div>
          <Link href={`/protected/leads/${lead.id}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">
            <Pencil size={15} /> Editar lead
          </Link>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title="Información">
            <p>Teléfono: {lead.phone || "Sin teléfono"}</p>
            <p className="mt-2">Email: {lead.email || "Sin email"}</p>
            <p className="mt-2">Operación: {lead.operation || "Sin definir"}</p>
          </Card>

          <Card title="Resumen comercial">
            <p>Etapa: <b className="text-[#6f5c40]">{STAGE_LABELS[lead.pipeline_stage || "NEW"] || lead.pipeline_stage}</b></p>
            <p className="mt-2">Prioridad: <b className="text-[#6f5c40]">{lead.lead_temperature || "—"}</b></p>
            <p className="mt-2">Score: {lead.lead_score ?? "—"}</p>
            <p className="mt-2 text-[#7b746a]">{hasAdvancedAI ? `Probabilidad estimada: ${aiLevel}` : "Clasificación comercial incluida en tu plan"}</p>
          </Card>

          <Card title="Preferencias">
            <p>Tipo: {lead.property_type || "Sin definir"}</p>
            <p className="mt-2">Zona: {lead.primary_zone || "Sin definir"}</p>
            <p className="mt-2">Presupuesto: {lead.budget_max ? `${lead.currency || "USD"} ${Number(lead.budget_max).toLocaleString("es-UY")}` : "Sin definir"}</p>
            <p className="mt-2">Dormitorios: {lead.bedrooms_min ?? "Sin definir"}</p>
          </Card>

          {hasAdvancedAI ? (
            <Card title="AI Sales Assistant">
              <p>Probabilidad: <b className="text-[#6f5c40]">{aiLevel}</b></p>
              <div className="mt-4 space-y-2 text-[#625d55]">
                {lead.lead_score >= 80 && <p>✓ Score alto de oportunidad</p>}
                {lead.primary_zone && <p>✓ Zona definida</p>}
                {lead.budget_max && <p>✓ Presupuesto informado</p>}
                <p className="text-[#6f5c40]">Próxima acción: {lead.next_action || "Contactar cliente"}</p>
              </div>
              <form action={createLeadFollowup}>
                <input type="hidden" name="lead_id" value={lead.id} />
                <button className="mt-5 w-full rounded-lg bg-[#302d28] px-5 py-2.5 font-semibold !text-[#fffaf2]">Agendar visita</button>
              </form>
              <WhatsAppButton leadId={lead.id} phone={lead.phone} />
              {matches.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-serif text-xl font-medium text-[#37332d]">Matching de propiedades</h3>
                  <div className="mt-4 space-y-3">
                    {matches.map((property: any) => (
                      <div key={property.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
                        <p className="font-semibold">{property.title}</p>
                        <p className="mt-1 text-[#6f5c40]">Compatibilidad: {property.compatibility}%</p>
                        <p className="mt-1 text-sm text-[#756e64]">{property.zone}</p>
                        <p className="mt-1 text-sm text-[#756e64]">{property.currency} {Number(property.price).toLocaleString("es-UY")}</p>
                        <div className="mt-3 text-sm text-[#756e64]">{property.reasons.map((reason: string) => <p key={reason}>{reason}</p>)}</div>
                        <PropertyWhatsAppButton leadId={lead.id} propertyId={property.id} phone={lead.phone} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card title="Inteligencia comercial avanzada">
              <div className="rounded-xl border border-[#d2c5b3] bg-[#eee4d5] p-4">
                <p className="font-semibold text-[#37332d]">Disponible en Professional</p>
                <p className="mt-2 text-sm leading-6 text-[#6f685f]">Desbloqueá recomendaciones de próxima acción, probabilidad comercial y matching avanzado con propiedades.</p>
                <Link href="/pricing" className="mt-4 inline-block rounded-lg bg-[#302d28] px-4 py-2 text-sm font-semibold !text-[#fffaf2]">Ver Professional</Link>
              </div>
              <form action={createLeadFollowup}>
                <input type="hidden" name="lead_id" value={lead.id} />
                <button className="mt-5 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-5 py-2.5 font-semibold text-[#554f47]">Agendar seguimiento</button>
              </form>
              <WhatsAppButton leadId={lead.id} phone={lead.phone} />
            </Card>
          )}

          <Card title="Historial comercial">
            {!interactions?.length && <p className="text-[#7b746a]">Todavía no hay interacciones.</p>}
            <div className="space-y-4">
              {interactions?.map((interaction: any) => (
                <div key={interaction.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-[#6f5c40]">{interaction.detected_intent === "ENVIAR_PROPIEDAD" ? "Propiedad enviada" : interaction.detected_intent === "CONTACTAR_LEAD" ? "Contacto realizado" : interaction.channel}</span>
                    <span className="text-xs text-[#92897d]">{new Date(interaction.created_at).toLocaleString("es-UY")}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#5f594f]">{interaction.message}</p>
                  <p className="mt-2 text-xs text-[#8b8378]">Realizado por: {interaction.actor}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><h2 className="mb-4 font-serif text-xl font-medium text-[#37332d]">{title}</h2>{children}</div>;
}
