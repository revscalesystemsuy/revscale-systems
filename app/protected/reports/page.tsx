import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  buildForecastByCurrency,
  formatCommercialAmount,
  formatDuration,
  LOSS_REASON_LABELS,
  PIPELINE_STAGES,
} from "@/lib/pipeline-metrics";

type Lead = {
  id: string;
  lead_score: number | null;
  lead_temperature: string | null;
  requires_human: boolean | null;
  primary_zone: string | null;
  operation: string | null;
  pipeline_stage: string;
  assigned_to: string | null;
  team_id: string | null;
  budget_max: number | null;
  currency: string | null;
  lost_reason: string | null;
};

type StageEvent = {
  from_stage: string | null;
  to_stage: string;
  previous_stage_duration_seconds: number | null;
};

export default function ReportsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#eee5d7] p-8 text-[#292722]">Cargando reportes...</main>}>
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role,team_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) redirect("/protected");

  let leadsQuery = supabase
    .from("leads")
    .select("id,lead_score,lead_temperature,requires_human,primary_zone,operation,pipeline_stage,assigned_to,team_id,budget_max,currency,lost_reason")
    .eq("organization_id", membership.organization_id);

  let eventsQuery = supabase
    .from("lead_stage_events")
    .select("from_stage,to_stage,previous_stage_duration_seconds,assigned_to,team_id")
    .eq("organization_id", membership.organization_id);

  if (membership.role === "AGENT") {
    leadsQuery = leadsQuery.eq("assigned_to", userId);
    eventsQuery = eventsQuery.eq("assigned_to", userId);
  }
  if (membership.role === "MANAGER" && membership.team_id) {
    leadsQuery = leadsQuery.eq("team_id", membership.team_id);
    eventsQuery = eventsQuery.eq("team_id", membership.team_id);
  }

  let memberIds: string[] = [];
  if (membership.role === "AGENT") {
    memberIds = [userId];
  } else if (membership.role === "MANAGER" && membership.team_id) {
    const { data: teamMembers } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", membership.organization_id)
      .eq("team_id", membership.team_id)
      .eq("status", "ACTIVE");
    memberIds = (teamMembers || []).map((member) => member.user_id);
  } else {
    const { data: organizationMembers } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE");
    memberIds = (organizationMembers || []).map((member) => member.user_id);
  }

  let followupsQuery = supabase
    .from("followups")
    .select("id,status,assigned_to")
    .eq("organization_id", membership.organization_id);
  if (memberIds.length) followupsQuery = followupsQuery.in("assigned_to", memberIds);

  const [{ data: leadsData }, { data: stageEvents }, { data: followups }, { data: agents }] = await Promise.all([
    leadsQuery,
    eventsQuery,
    followupsQuery,
    memberIds.length ? supabase.from("profiles").select("id,full_name").in("id", memberIds) : Promise.resolve({ data: [] }),
  ]);

  const leads = (leadsData || []) as Lead[];
  const events = (stageEvents || []) as StageEvent[];
  const totalLeads = leads.length;
  const stageCounts = Object.fromEntries(PIPELINE_STAGES.map(([stage]) => [stage, leads.filter((lead) => lead.pipeline_stage === stage).length])) as Record<string, number>;
  const won = stageCounts.WON || 0;
  const lost = stageCounts.LOST || 0;
  const closed = won + lost;
  const open = Math.max(totalLeads - closed, 0);
  const conversion = totalLeads ? Math.round((won / totalLeads) * 100) : 0;
  const winRate = closed ? Math.round((won / closed) * 100) : 0;
  const hot = leads.filter((lead) => lead.lead_temperature === "HOT").length;
  const warm = leads.filter((lead) => lead.lead_temperature === "WARM").length;
  const cold = leads.filter((lead) => lead.lead_temperature === "COLD").length;
  const scoreAverage = leads.length ? Math.round(leads.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / leads.length) : 0;
  const human = leads.filter((lead) => lead.requires_human).length;
  const pending = followups?.filter((followup) => followup.status === "PENDING").length || 0;
  const completed = followups?.filter((followup) => followup.status === "COMPLETED").length || 0;
  const forecast = buildForecastByCurrency(leads);

  const timedEvents = events.filter((event) => event.from_stage && event.previous_stage_duration_seconds !== null);
  const durationByStage = PIPELINE_STAGES
    .filter(([stage]) => !["WON", "LOST"].includes(stage))
    .map(([stage, label]) => {
      const samples = timedEvents.filter((event) => event.from_stage === stage);
      const average = samples.length ? Math.round(samples.reduce((sum, event) => sum + Number(event.previous_stage_duration_seconds || 0), 0) / samples.length) : null;
      return { stage, label, samples: samples.length, average };
    });

  const lossReasons = Object.entries(leads.reduce<Record<string, number>>((acc, lead) => {
    if (lead.pipeline_stage !== "LOST") return acc;
    const reason = lead.lost_reason || "UNKNOWN";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  const zones = Object.entries(leads.reduce<Record<string, number>>((acc, lead) => {
    const zone = lead.primary_zone || "Sin zona";
    acc[zone] = (acc[zone] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const agentRanking = (agents || [])
    .map((agent) => {
      const assigned = leads.filter((lead) => lead.assigned_to === agent.id);
      const agentWon = assigned.filter((lead) => lead.pipeline_stage === "WON").length;
      const agentLost = assigned.filter((lead) => lead.pipeline_stage === "LOST").length;
      const agentClosed = agentWon + agentLost;
      return {
        id: agent.id,
        name: agent.full_name || "Sin nombre",
        total: assigned.length,
        won: agentWon,
        conversion: assigned.length ? Math.round((agentWon / assigned.length) * 100) : 0,
        winRate: agentClosed ? Math.round((agentWon / agentClosed) * 100) : 0,
      };
    })
    .sort((a, b) => b.won - a.won || b.winRate - a.winRate || b.total - a.total)
    .slice(0, 8);

  const scopeText = membership.role === "AGENT"
    ? "Resultados de tu cartera asignada."
    : membership.role === "MANAGER"
      ? "Resultados comerciales de tu equipo."
      : "Resultados comerciales de toda la organización.";

  return (
    <main className="min-h-screen bg-[#eee5d7] p-6 text-[#292722] md:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#927a58]">Rendimiento</p>
        <h1 className="mt-3 font-serif text-4xl font-medium">Reportes</h1>
        <p className="mt-2 text-[#6f685f]">{scopeText} Las conversiones usan la etapa comercial real de cada lead.</p>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card title="Leads" value={totalLeads} />
          <Card title="Abiertos" value={open} />
          <Card title="Cierres" value={won} />
          <Card title="Perdidos" value={lost} />
          <Card title="Conversión" value={`${conversion}%`} />
          <Card title="Win rate" value={`${winRate}%`} />
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="font-serif text-2xl">Forecast comercial</h2><p className="text-sm text-[#81796e]">Presupuesto abierto ponderado por etapa</p></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {forecast.length ? forecast.map((item) => <div key={item.currency} className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#927a58]">{item.currency}</p><p className="mt-2 text-xs text-[#81796e]">Pipeline</p><p className="font-serif text-2xl">{formatCommercialAmount(item.currency, item.pipeline)}</p><p className="mt-2 text-xs text-[#81796e]">Forecast</p><p className="font-serif text-xl text-[#6f5c40]">{formatCommercialAmount(item.currency, item.weighted)}</p></div>) : <p className="text-sm text-[#81796e]">Sin oportunidades abiertas con presupuesto.</p>}
          </div>
          <p className="mt-4 text-xs text-[#8b8378]">Las monedas no se convierten ni mezclan. Este valor representa volumen potencial del cliente, no facturación de RevScale.</p>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
          <h2 className="font-serif text-2xl">Pipeline actual</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {PIPELINE_STAGES.map(([stage, label]) => <Stage key={stage} label={label} value={stageCounts[stage] || 0} />)}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="font-serif text-2xl">Velocidad por etapa</h2><p className="text-sm text-[#81796e]">{timedEvents.length} transiciones registradas</p></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {durationByStage.map((item) => <div key={item.stage} className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4"><p className="text-xs text-[#746d63]">{item.label}</p><p className="mt-2 font-serif text-2xl">{formatDuration(item.average)}</p><p className="mt-1 text-xs text-[#988e82]">{item.samples ? `${item.samples} muestras` : "Sin muestra"}</p></div>)}
          </div>
          {!timedEvents.length && <p className="mt-4 text-sm text-[#81796e]">Los tiempos empiezan a acumularse desde la activación del historial de pipeline.</p>}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-4">
          <Panel title="Prioridad de leads"><Row label="HOT" value={hot} /><Row label="WARM" value={warm} /><Row label="COLD" value={cold} /><Row label="Score promedio" value={scoreAverage} /></Panel>
          <Panel title="Seguimiento"><Row label="Pendientes" value={pending} /><Row label="Completados" value={completed} /><Row label="Requieren humano" value={human} /></Panel>
          <Panel title="Motivos de pérdida">{lossReasons.length ? lossReasons.map(([reason, count]) => <Row key={reason} label={reason === "UNKNOWN" ? "Sin motivo histórico" : (LOSS_REASON_LABELS[reason] || reason)} value={count} />) : <p className="text-sm text-[#81796e]">Sin pérdidas registradas.</p>}</Panel>
          <Panel title="Zonas más buscadas">{zones.length ? zones.map(([zone, count]) => <Row key={zone} label={zone} value={count} />) : <p className="text-sm text-[#81796e]">Sin datos todavía.</p>}</Panel>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="font-serif text-2xl">Rendimiento comercial</h2><p className="text-sm text-[#81796e]">Ordenado por cierres y win rate</p></div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#d8ccbb] text-xs uppercase tracking-[0.12em] text-[#81796e]"><tr><th className="py-3 pr-4">Agente</th><th className="py-3 pr-4">Leads</th><th className="py-3 pr-4">Cierres</th><th className="py-3 pr-4">Conversión</th><th className="py-3">Win rate</th></tr></thead>
              <tbody>{agentRanking.length ? agentRanking.map((agent) => <tr key={agent.id} className="border-b border-[#e3d8c8]"><td className="py-4 pr-4 font-medium">{agent.name}</td><td className="py-4 pr-4">{agent.total}</td><td className="py-4 pr-4">{agent.won}</td><td className="py-4 pr-4">{agent.conversion}%</td><td className="py-4">{agent.winRate}%</td></tr>) : <tr><td colSpan={5} className="py-5 text-[#81796e]">No hay actividad asignada suficiente para generar ranking.</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return <div className="rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-5"><p className="text-sm text-[#81796e]">{title}</p><p className="mt-2 font-serif text-3xl text-[#342f29]">{value}</p></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6"><h2 className="mb-5 font-serif text-2xl">{title}</h2><div className="space-y-3">{children}</div></div>;
}
function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4 border-b border-[#e3d8c8] pb-2"><span className="text-[#716a61]">{label}</span><span className="font-semibold">{value}</span></div>;
}
function Stage({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4"><p className="text-xs text-[#746d63]">{label}</p><p className="mt-2 font-serif text-2xl">{value}</p></div>;
}
