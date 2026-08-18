import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createLeadFollowup } from "./actions";
import WhatsAppButton from "./WhatsAppButton";
import { getMatchingProperties } from "./match-actions";
import PropertyWhatsAppButton from "./PropertyWhatsAppButton";
import { currentPlanHasFeature } from "@/lib/plan-access";
import Link from "next/link";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      requires_human
    `)
    .eq("id", id)
    .maybeSingle();

  if (!lead) {
    redirect("/protected/leads");
  }

  const hasAdvancedAI = await currentPlanHasFeature("ai_assistant");
  const matches = hasAdvancedAI ? await getMatchingProperties(lead.id) : [];

  const aiLevel =
    lead.lead_score >= 80 ? "Alta" : lead.lead_score >= 50 ? "Media" : "Baja";

  const { data: interactions } = await supabase
    .from("interactions")
    .select(`
      id,
      channel,
      direction,
      actor,
      message,
      detected_intent,
      created_at
    `)
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">{lead.full_name || "Sin nombre"}</h1>
        <p className="mt-2 text-slate-400">Detalle del cliente potencial</p>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title="👤 Información">
            <p>📞 {lead.phone || "Sin teléfono"}</p>
            <p className="mt-2">✉️ {lead.email || "Sin email"}</p>
            <p className="mt-2">Operación: {lead.operation}</p>
          </Card>

          <Card title="📊 Resumen comercial">
            <p>
              Estado:{" "}
              <b className="text-blue-400">{lead.lead_temperature}</b>
            </p>
            <p className="mt-2">Score: {lead.lead_score}</p>
            <p className="mt-2 text-slate-400">
              {hasAdvancedAI
                ? `Probabilidad estimada: ${aiLevel}`
                : "Clasificación comercial incluida en tu plan"}
            </p>
          </Card>

          <Card title="🏠 Preferencias">
            <p>Tipo: {lead.property_type}</p>
            <p className="mt-2">Zona: {lead.primary_zone}</p>
            <p className="mt-2">
              Presupuesto: {lead.budget_max} {lead.currency}
            </p>
            <p className="mt-2">Dormitorios: {lead.bedrooms_min}</p>
          </Card>

          {hasAdvancedAI ? (
            <Card title="🤖 AI Sales Assistant">
              <p>
                Probabilidad:{" "}
                <b className="text-blue-400">{aiLevel}</b>
              </p>

              <div className="mt-4 space-y-2 text-slate-300">
                {lead.lead_score >= 80 && <p>✓ Score alto de oportunidad</p>}
                {lead.primary_zone && <p>✓ Zona definida</p>}
                {lead.budget_max && <p>✓ Presupuesto informado</p>}
                <p className="text-blue-300">
                  Próxima acción: {lead.next_action || "Contactar cliente"}
                </p>
              </div>

              <form action={createLeadFollowup}>
                <input type="hidden" name="lead_id" value={lead.id} />
                <button className="mt-5 w-full rounded-xl bg-blue-500 px-5 py-2 font-semibold">
                  📅 Agendar visita
                </button>
              </form>

              <WhatsAppButton leadId={lead.id} phone={lead.phone} />

              {matches.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold">🏠 Matching IA</h3>
                  <div className="mt-4 space-y-3">
                    {matches.map((property: any) => (
                      <div
                        key={property.id}
                        className="rounded-xl border border-white/10 p-4"
                      >
                        <p className="font-semibold">{property.title}</p>
                        <p className="mt-1 text-blue-400">
                          Compatibilidad: {property.compatibility}%
                        </p>
                        <p className="mt-1 text-sm text-slate-400">📍 {property.zone}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          💰 {property.currency} {Number(property.price).toLocaleString()}
                        </p>
                        <div className="mt-3 text-sm text-slate-400">
                          {property.reasons.map((reason: string) => (
                            <p key={reason}>{reason}</p>
                          ))}
                        </div>
                        <PropertyWhatsAppButton
                          leadId={lead.id}
                          propertyId={property.id}
                          phone={lead.phone}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card title="🤖 Inteligencia comercial avanzada">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <p className="font-semibold text-white">Disponible en Professional</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Desbloqueá recomendaciones de próxima acción, probabilidad comercial,
                  Matching IA con propiedades y asistencia avanzada para cada lead.
                </p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-block rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
                >
                  Ver Professional
                </Link>
              </div>

              <form action={createLeadFollowup}>
                <input type="hidden" name="lead_id" value={lead.id} />
                <button className="mt-5 w-full rounded-xl border border-white/10 px-5 py-2 font-semibold text-slate-200 hover:bg-white/5">
                  📅 Agendar seguimiento
                </button>
              </form>

              <WhatsAppButton leadId={lead.id} phone={lead.phone} />
            </Card>
          )}

          <Card title="📞 Historial comercial">
            {!interactions?.length && (
              <p className="text-slate-400">Todavía no hay interacciones.</p>
            )}

            <div className="space-y-4">
              {interactions?.map((interaction: any) => (
                <div
                  key={interaction.id}
                  className="rounded-xl border border-white/10 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-blue-400">
                      {interaction.detected_intent === "ENVIAR_PROPIEDAD"
                        ? "🏠 Propiedad enviada"
                        : interaction.detected_intent === "CONTACTAR_LEAD"
                          ? "💬 Contacto realizado"
                          : `📞 ${interaction.channel}`}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(interaction.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{interaction.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Realizado por: {interaction.actor}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}
