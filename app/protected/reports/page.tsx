import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const STAGES = [
  ["NEW", "Nuevo lead"],
  ["CONTACTED", "Contactado"],
  ["QUALIFIED", "Calificado"],
  ["VISIT", "Visita"],
  ["NEGOTIATION", "Negociación"],
  ["WON", "Cierre"],
  ["LOST", "Perdido"],
] as const;

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
    .select("id,lead_score,lead_temperature,requires_human,primary_zone,operation,pipeline_stage,assigned_to,team_id")
    .eq("organization_id", membership.organization_id);

  if (membership.role === "AGENT") leadsQuery = leadsQuery.eq("assigned_to", userId);
  if (membership.role === "MANAGER" && membership.team_id) leadsQuery = leadsQuery.eq("team_id", membership.team_id);

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

  const [{ data: leadsData }, { data: followups }, { data: agents }] = await Promise.all([
    leadsQuery,
    followupsQuery,
    memberIds.length ? supabase.from("profiles").select("id,full_name").in("id", memberIds) : Promise.resolve({ data: [] }),
  ]);

  const leads = (leadsData || []) as Lead[];
  const totalLeads = leads.length;
  const stageCounts = Object.fromEntries(STAGES.map(([stage]) => [stage, leads.filter((lead) => lead.pipeline_stage === stage).length])) as Record<string, number>;
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

  const zones = Object.entries(leads.reduce<Record<string, number>>((acc, lead) => {
    const zone = lead.primary_zone || "Sin zona";
    acc[zone] = (acc[zone] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const agentRanking = (agents || [])
    .map((agent) => {
      const assigned = leads.filter((lead) => lead.assigned_to === agent.id);
      const agentWon = assigned.filter((lead) => lead.pipeline_stage === "WON").length;
      return {
        id: agent.id,
        name: agent.full_name || "Sin nombre",
        total: assigned.length,
        won: agentWon,
        conversion: assigned.length ? Math.round((agentWon / assigned.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.won - a.won || b.conversion - a.conversion || b.total - a.total)
    .slice(0, 5);

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
          <h2 className="font-serif text-2xl">Pipeline actual</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {STAGES.map(([stage, label]) => <Stage key={stage} label={label} value={stageCounts[stage] || 0} />)}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <Panel title="Prioridad de leads">
            <Row label="HOT" value={hot} />
            <Row label="WARM" value={warm} />
            <Row label="COLD" value={cold} />
            <Row label="Score promedio" value={scoreAverage} />
          </Panel>

          <Panel title="Seguimiento">
            <Row label="Pendientes" value={pending} />
            <Row label="Completados" value={completed} />
            <Row label="Requieren humano" value={human} />
          </Panel>

          <Panel title="Zonas más buscadas">
            {zones.length ? zones.map(([zone, count]) => <Row key={zone} label={zone} value={count} />) : <p className="text-sm text-[#81796e]">Sin datos todavía.</p>}
          </Panel>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="font-serif text-2xl">Rendimiento comercial</h2><p className="text-sm text-[#81796e]">Ordenado por cierres y conversión</p></div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-[#d8ccbb] text-xs uppercase tracking-[0.12em] text-[#81796e]"><tr><th className="py-3 pr-4">Agente</th><th className="py-3 pr-4">Leads</th><th className="py-3 pr-4">Cierres</th><th className="py-3">Conversión</th></tr></thead>
              <tbody>{agentRanking.length ? agentRanking.map((agent) => <tr key={agent.id} className="border-b border-[#e3d8c8]"><td className="py-4 pr-4 font-medium">{agent.name}</td><td className="py-4 pr-4">{agent.total}</td><td className="py-4 pr-4">{agent.won}</td><td className="py-4">{agent.conversion}%</td></tr>) : <tr><td colSpan={4} className="py-5 text-[#81796e]">No hay actividad asignada suficiente para generar ranking.</td></tr>}</tbody>
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
