import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Check, Clock3 } from "lucide-react";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) redirect("/auth/login");

  const [
    { count: totalLeads },
    { count: hotLeads },
    { count: humanLeads },
    { count: totalInteractions },
    { data: hotOpportunities },
    { data: recentLeads },
    { data: followups },
    { data: urgentLeads },
    { data: activeAgents },
    { data: profiles },
    { data: propertyInteractions },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("lead_temperature", "HOT"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("requires_human", true),
    supabase.from("interactions").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id,full_name,primary_zone,lead_score,next_action")
      .eq("lead_temperature", "HOT")
      .order("lead_score", { ascending: false })
      .limit(5),
    supabase
      .from("leads")
      .select("id,full_name,primary_zone,lead_score")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("followups").select("id,assigned_to,status"),
    supabase
      .from("leads")
      .select("id,full_name,lead_score,next_action,primary_zone,budget_max,lead_temperature")
      .gte("lead_score", 80)
      .order("lead_score", { ascending: false })
      .limit(5),
    supabase
      .from("organization_members")
      .select("id,user_id,role,status")
      .eq("status", "ACTIVE"),
    supabase.from("profiles").select("id,full_name"),
    supabase
      .from("interactions")
      .select("id,property_id,detected_intent")
      .eq("detected_intent", "ENVIAR_PROPIEDAD"),
  ]);

  const pendingFollowups = followups?.filter((f) => f.status === "PENDING").length || 0;

  const recommendations =
    urgentLeads?.map((lead) => {
      let recommendation = "Contactar cliente";
      let reason = "Lead con alta puntuación";

      if (lead.primary_zone && lead.budget_max) {
        recommendation = "Enviar propiedades";
        reason = "Tiene zona y presupuesto definidos";
      }

      if (lead.lead_temperature === "HOT") {
        recommendation = "Priorizar seguimiento";
        reason = "Alta intención comercial detectada";
      }

      return { ...lead, recommendation, reason };
    }) || [];

  const topProperties = propertyInteractions?.reduce((acc: Record<string, number>, item: { property_id: string | null }) => {
    if (item.property_id) acc[item.property_id] = (acc[item.property_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const propertyRanking = Object.entries(topProperties || {})
    .map(([propertyId, count]) => ({ propertyId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const ranking =
    activeAgents
      ?.map((agent) => {
        const agentFollowups = followups?.filter((f) => f.assigned_to === agent.user_id) || [];
        const profile = profiles?.find((p) => p.id === agent.user_id);
        return {
          id: agent.id,
          name: profile?.full_name || "Sin nombre",
          total: agentFollowups.length,
          completed: agentFollowups.filter((f) => f.status === "COMPLETED").length,
        };
      })
      .sort((a, b) => b.completed - a.completed) || [];

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d7553]">
            Resumen comercial
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">
            Dashboard comercial
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55] md:text-[15px]">
            Prioridades, oportunidades activas y rendimiento del equipo en una sola vista.
          </p>
        </div>

        <section className="relative overflow-hidden rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] p-6 md:p-7">
          <div className="absolute inset-y-0 left-0 w-1 bg-[#9b815d]" />
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Prioridad del día</p>
              <p className="mt-3 font-serif text-2xl leading-snug text-[#2f2c27]">
                {hotLeads ?? 0} oportunidades de alta intención requieren atención comercial.
              </p>
              <p className="mt-3 text-sm leading-6 text-[#6d665d]">
                RevScale ordena la actividad por intención, urgencia y valor potencial para ayudar al equipo a actuar primero donde más importa.
              </p>
            </div>
            <Link
              href="/protected/leads"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-medium !text-[#fffaf2] transition hover:bg-[#3b3731] md:self-auto"
            >
              Ver oportunidades <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Leads" value={totalLeads ?? 0} />
          <MetricCard title="Alta intención" value={hotLeads ?? 0} />
          <MetricCard title="Requieren atención" value={humanLeads ?? 0} />
          <MetricCard title="Interacciones" value={totalInteractions ?? 0} />
          <MetricCard title="Seguimientos" value={pendingFollowups} />
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-3">
          <Panel title="Siguientes acciones" className="lg:col-span-2">
            <div className="divide-y divide-[#ddd1c0]">
              {recommendations.map((lead) => (
                <Link key={lead.id} href={`/protected/leads/${lead.id}`} className="group flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="flex gap-3">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#cdbfa9] bg-[#eee4d5] text-[#7a6548]">
                      <ArrowUpRight size={13} />
                    </span>
                    <div>
                      <p className="font-medium text-[#37332d]">{lead.full_name || "Sin nombre"}</p>
                      <p className="mt-1 text-sm text-[#665f56]">{lead.recommendation}</p>
                      <p className="mt-1 text-xs text-[#8b8378]">{lead.reason}</p>
                    </div>
                  </div>
                  <span className="font-serif text-xl text-[#6f5b40]">{lead.lead_score ?? "—"}</span>
                </Link>
              ))}
              {!recommendations.length && <p className="text-sm text-[#81796e]">No hay acciones urgentes en este momento.</p>}
            </div>
          </Panel>

          <Panel title="Oportunidades activas">
            <div className="divide-y divide-[#ddd1c0]">
              {hotOpportunities?.map((lead) => (
                <Link key={lead.id} href={`/protected/leads/${lead.id}`} className="block py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#37332d]">{lead.full_name || "Sin nombre"}</p>
                      <p className="mt-1 text-xs text-[#81796e]">{lead.primary_zone || "Zona sin definir"}</p>
                    </div>
                    <span className="font-serif text-xl text-[#6f5b40]">{lead.lead_score ?? "—"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[#625d55]">{lead.next_action || "Sin acción definida"}</p>
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Propiedades con mayor movimiento">
            <div className="divide-y divide-[#ddd1c0]">
              {propertyRanking.map((property, index) => (
                <div key={property.propertyId} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <span className="font-serif text-lg text-[#918678]">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-sm font-medium text-[#403b34]">Propiedad {property.propertyId.slice(0, 8)}</p>
                  </div>
                  <span className="text-sm text-[#6a635a]">{property.count} envíos</span>
                </div>
              ))}
              {!propertyRanking.length && <p className="text-sm text-[#81796e]">Todavía no hay envíos de propiedades.</p>}
            </div>
          </Panel>

          <Panel title="Desempeño del equipo">
            <div className="space-y-5">
              {ranking.map((agent) => {
                const pct = agent.total ? Math.round((agent.completed / agent.total) * 100) : 0;
                return (
                  <div key={agent.id}>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-[#403b34]">{agent.name}</span>
                      <span className="text-xs text-[#7c7469]">{agent.completed}/{agent.total} completados</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e6dac8]">
                      <div className="h-full rounded-full bg-[#8e7654]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Leads recientes">
            <div className="divide-y divide-[#ddd1c0]">
              {recentLeads?.map((lead) => (
                <Link key={lead.id} href={`/protected/leads/${lead.id}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-[#403b34]">{lead.full_name || "Sin nombre"}</p>
                    <p className="mt-1 text-xs text-[#81796e]">{lead.primary_zone || "Zona sin definir"}</p>
                  </div>
                  <span className="font-serif text-xl text-[#6f5b40]">{lead.lead_score ?? "—"}</span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Estado comercial">
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-[#ddd1c0] pb-4">
                <span className="flex items-center gap-2 text-[#625d55]"><Check size={14} /> Leads visibles</span>
                <span className="font-medium text-[#38342f]">{totalLeads ?? 0}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#ddd1c0] pb-4">
                <span className="flex items-center gap-2 text-[#625d55]"><Clock3 size={14} /> Seguimientos pendientes</span>
                <span className="font-medium text-[#38342f]">{pendingFollowups}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#625d55]">Interacciones registradas</span>
                <span className="font-medium text-[#38342f]">{totalInteractions ?? 0}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p>
      <p className="mt-3 font-serif text-[2rem] font-medium leading-none tracking-tight text-[#2f2c27] tabular-nums">{value}</p>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.05)] ${className}`}>
      <h2 className="mb-5 font-serif text-xl font-medium tracking-tight text-[#37332d]">{title}</h2>
      {children}
    </section>
  );
}
