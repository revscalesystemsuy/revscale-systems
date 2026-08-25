import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  buildForecastByCurrency,
  formatCommercialAmount,
  formatDuration,
  LOSS_REASON_LABELS,
  PIPELINE_STAGES,
} from "@/lib/pipeline-metrics";

type Lead = {
  id: string;
  full_name: string | null;
  lead_score: number | null;
  lead_temperature: string | null;
  pipeline_stage: string;
  budget_max: number | null;
  currency: string | null;
  lost_reason: string | null;
  created_at: string | null;
};

type StageEvent = {
  from_stage: string | null;
  to_stage: string;
  previous_stage_duration_seconds: number | null;
  event_source: string;
};

export default async function AnalyticsPage() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) redirect("/protected");

  const organizationId = membership.organization_id;
  const [
    { data: leads },
    { data: stageEvents },
    { count: interactions },
    { count: propertiesSent },
    { count: pendingFollowups },
    { data: propertyInteractions },
    { data: properties },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,full_name,lead_score,lead_temperature,pipeline_stage,budget_max,currency,lost_reason,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_stage_events")
      .select("from_stage,to_stage,previous_stage_duration_seconds,event_source")
      .eq("organization_id", organizationId)
      .order("changed_at", { ascending: false }),
    supabase.from("interactions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("interactions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("detected_intent", "ENVIAR_PROPIEDAD"),
    supabase.from("followups").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "PENDING"),
    supabase.from("interactions").select("property_id").eq("organization_id", organizationId).eq("detected_intent", "ENVIAR_PROPIEDAD"),
    supabase.from("properties").select("id,title,zone,price,currency").eq("organization_id", organizationId),
  ]);

  const allLeads = (leads || []) as Lead[];
  const events = (stageEvents || []) as StageEvent[];
  const totalLeads = allLeads.length;
  const stageCounts = Object.fromEntries(PIPELINE_STAGES.map(([stage]) => [stage, allLeads.filter((lead) => lead.pipeline_stage === stage).length])) as Record<string, number>;
  const hotLeads = allLeads.filter((lead) => lead.lead_temperature === "HOT").length;
  const won = stageCounts.WON || 0;
  const lost = stageCounts.LOST || 0;
  const open = Math.max(totalLeads - won - lost, 0);
  const closed = won + lost;
  const leadToCloseRate = totalLeads ? Math.round((won / totalLeads) * 100) : 0;
  const winRate = closed ? Math.round((won / closed) * 100) : 0;
  const interactionAverage = totalLeads ? (Number(interactions || 0) / totalLeads).toFixed(1) : "0.0";
  const forecast = buildForecastByCurrency(allLeads);

  const timedEvents = events.filter((event) => event.previous_stage_duration_seconds !== null && event.from_stage);
  const durationByStage = PIPELINE_STAGES
    .filter(([stage]) => !["WON", "LOST"].includes(stage))
    .map(([stage, label]) => {
      const samples = timedEvents.filter((event) => event.from_stage === stage);
      const average = samples.length
        ? Math.round(samples.reduce((sum, event) => sum + Number(event.previous_stage_duration_seconds || 0), 0) / samples.length)
        : null;
      return { stage, label, samples: samples.length, average };
    });

  const lossReasons = Object.entries(allLeads.reduce<Record<string, number>>((acc, lead) => {
    if (lead.pipeline_stage !== "LOST") return acc;
    const reason = lead.lost_reason || "UNKNOWN";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  const transitionCounts = Object.entries(timedEvents.reduce<Record<string, number>>((acc, event) => {
    const key = `${event.from_stage}>${event.to_stage}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const propertyCount: Record<string, number> = {};
  for (const item of propertyInteractions || []) {
    if (item.property_id) propertyCount[item.property_id] = (propertyCount[item.property_id] || 0) + 1;
  }
  const propertyRanking = Object.entries(propertyCount)
    .map(([id, count]) => {
      const property = properties?.find((candidate) => candidate.id === id);
      return { id, count, title: property?.title || "Propiedad", zone: property?.zone || "Sin zona" };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#eee5d7] p-6 text-[#292722] md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected" className="text-sm font-medium text-[#756246] hover:text-[#3c342b]">Volver al dashboard</Link>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#927a58]">Rendimiento comercial</p>
        <h1 className="mt-3 font-serif text-4xl font-medium">Analytics</h1>
        <p className="mt-2 text-[#6f685f]">Conversión, valor potencial y velocidad calculados sobre las etapas reales del pipeline.</p>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard title="Leads" value={totalLeads} />
          <MetricCard title="Abiertos" value={open} />
          <MetricCard title="HOT" value={hotLeads} />
          <MetricCard title="Cierres" value={won} />
          <MetricCard title="Conversión lead → cierre" value={`${leadToCloseRate}%`} />
          <MetricCard title="Win rate cerrados" value={`${winRate}%`} />
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#927a58]">Forecast</p><h2 className="mt-2 font-serif text-2xl">Valor comercial abierto</h2></div>
            <p className="max-w-xl text-sm text-[#81796e]">El forecast pondera el presupuesto máximo según la etapa. Las monedas se mantienen separadas y no se interpreta como comisión.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {forecast.length ? forecast.map((item) => (
              <div key={item.currency} className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#927a58]">{item.currency}</p>
                <p className="mt-3 text-sm text-[#81796e]">Pipeline abierto</p>
                <p className="font-serif text-2xl">{formatCommercialAmount(item.currency, item.pipeline)}</p>
                <p className="mt-3 text-sm text-[#81796e]">Forecast ponderado</p>
                <p className="font-serif text-2xl text-[#6f5c40]">{formatCommercialAmount(item.currency, item.weighted)}</p>
                <p className="mt-2 text-xs text-[#988e82]">{item.opportunities} oportunidades con presupuesto</p>
              </div>
            )) : <p className="text-sm text-[#81796e]">Todavía no hay oportunidades abiertas con presupuesto.</p>}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#927a58]">Pipeline</p><h2 className="mt-2 font-serif text-2xl">Distribución por etapa</h2></div>
            <p className="text-sm text-[#81796e]">{closed} oportunidades cerradas · {lost} perdidas</p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {PIPELINE_STAGES.map(([stage, label]) => <StageCard key={stage} label={label} value={stageCounts[stage] || 0} total={totalLeads} />)}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#927a58]">Velocidad</p><h2 className="mt-2 font-serif text-2xl">Tiempo medio en etapa</h2></div>
            <p className="text-sm text-[#81796e]">{timedEvents.length} transiciones reales registradas</p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {durationByStage.map((item) => (
              <div key={item.stage} className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4">
                <p className="text-xs text-[#746d63]">{item.label}</p>
                <p className="mt-2 font-serif text-2xl">{formatDuration(item.average)}</p>
                <p className="mt-1 text-xs text-[#988e82]">{item.samples ? `${item.samples} salidas registradas` : "Aún sin muestra"}</p>
              </div>
            ))}
          </div>
          {!timedEvents.length && <p className="mt-5 text-sm text-[#81796e]">El historial empezó a registrarse con esta versión. Los tiempos aparecerán a medida que los leads cambien de etapa.</p>}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <MetricCard title="Interacciones / lead" value={interactionAverage} large />
          <MetricCard title="Propiedades enviadas" value={propertiesSent || 0} large />
          <MetricCard title="Follow-ups pendientes" value={pendingFollowups || 0} large />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Motivos de pérdida">
            {lossReasons.length ? lossReasons.map(([reason, count]) => <DataRow key={reason} label={reason === "UNKNOWN" ? "Sin motivo histórico" : (LOSS_REASON_LABELS[reason] || reason)} value={count} />) : <p className="text-sm text-[#81796e]">Todavía no hay oportunidades perdidas.</p>}
          </Panel>
          <Panel title="Movimientos más frecuentes">
            {transitionCounts.length ? transitionCounts.map(([transition, count]) => {
              const [from, to] = transition.split(">");
              return <DataRow key={transition} label={`${stageLabel(from)} → ${stageLabel(to)}`} value={count} />;
            }) : <p className="text-sm text-[#81796e]">Los movimientos empezarán a aparecer con los próximos cambios de etapa.</p>}
          </Panel>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
            <h2 className="font-serif text-2xl">Propiedades más enviadas</h2>
            <div className="mt-5 space-y-3">
              {propertyRanking.length ? propertyRanking.map((property, index) => (
                <div key={property.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4">
                  <div><p className="font-medium">{index + 1}. {property.title}</p><p className="mt-1 text-sm text-[#81796e]">{property.zone}</p></div>
                  <p className="text-sm font-semibold text-[#6e5c43]">{property.count} envíos</p>
                </div>
              )) : <p className="text-sm text-[#81796e]">Todavía no hay envíos de propiedades registrados.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
            <h2 className="font-serif text-2xl">Últimos leads</h2>
            <div className="mt-5 space-y-3">
              {allLeads.slice(0, 5).map((lead) => (
                <Link key={lead.id} href={`/protected/leads/${lead.id}`} className="block rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4 transition hover:bg-[#f3ebdf]">
                  <div className="flex items-center justify-between gap-4"><p className="font-medium">{lead.full_name || "Sin nombre"}</p><span className="text-xs font-semibold text-[#756246]">{stageLabel(lead.pipeline_stage)}</span></div>
                  <p className="mt-1 text-sm text-[#81796e]">Score {lead.lead_score ?? 0} · {lead.lead_temperature || "Sin prioridad"}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function stageLabel(stage: string) {
  return PIPELINE_STAGES.find(([value]) => value === stage)?.[1] || stage;
}

function MetricCard({ title, value, large = false }: { title: string; value: number | string; large?: boolean }) {
  return <div className={`rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] ${large ? "p-6" : "p-5"}`}><p className="text-sm text-[#81796e]">{title}</p><p className="mt-2 font-serif text-3xl text-[#342f29]">{value}</p></div>;
}

function StageCard({ label, value, total }: { label: string; value: number; total: number }) {
  const share = total ? Math.round((value / total) * 100) : 0;
  return <div className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4"><p className="text-xs font-medium text-[#746d63]">{label}</p><p className="mt-2 font-serif text-2xl">{value}</p><p className="mt-1 text-xs text-[#988e82]">{share}% del total</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6"><h2 className="font-serif text-2xl">{title}</h2><div className="mt-5 space-y-3">{children}</div></section>;
}

function DataRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4 border-b border-[#e3d8c8] pb-2"><span className="text-sm text-[#716a61]">{label}</span><span className="font-semibold">{value}</span></div>;
}
