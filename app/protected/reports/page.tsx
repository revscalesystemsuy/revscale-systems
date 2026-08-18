import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

export default function ReportsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 p-8 text-white">Cargando reportes...</main>}>
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { data: membership } = userId
    ? await supabase
        .from("organization_members")
        .select("organization_id,role,team_id")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .single()
    : { data: null };

  const [{ data: leads }, { data: followups }] = await Promise.all([
    supabase.from("leads").select("id,lead_score,lead_temperature,requires_human,primary_zone,operation"),
    supabase.from("followups").select("id,status,assigned_to"),
  ]);

  let memberIds: string[] = [];

  if (membership?.role === "AGENT" && userId) {
    memberIds = [userId];
  } else if (membership?.role === "MANAGER" && membership.team_id) {
    const { data: teamMembers } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", membership.organization_id)
      .eq("team_id", membership.team_id)
      .eq("status", "ACTIVE");
    memberIds = (teamMembers || []).map((member) => member.user_id);
  } else if (membership?.organization_id) {
    const { data: organizationMembers } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE");
    memberIds = (organizationMembers || []).map((member) => member.user_id);
  }

  const { data: agents } = memberIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", memberIds)
    : { data: [] };

  const totalLeads = leads?.length || 0;
  const hot = leads?.filter((lead) => lead.lead_temperature === "HOT").length || 0;
  const warm = leads?.filter((lead) => lead.lead_temperature === "WARM").length || 0;
  const cold = leads?.filter((lead) => lead.lead_temperature === "COLD").length || 0;
  const scoreAverage = leads?.length
    ? Math.round(leads.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / leads.length)
    : 0;
  const human = leads?.filter((lead) => lead.requires_human).length || 0;

  const zones = Object.entries(
    leads?.reduce<Record<string, number>>((acc, lead) => {
      const zone = lead.primary_zone || "Sin zona";
      acc[zone] = (acc[zone] || 0) + 1;
      return acc;
    }, {}) || {}
  );

  const ranking = (agents || [])
    .map((agent) => ({
      name: agent.full_name || "Sin nombre",
      total: followups?.filter((followup) => followup.assigned_to === agent.id).length || 0,
    }))
    .sort((a, b) => b.total - a.total);

  const pending = followups?.filter((followup) => followup.status === "PENDING").length || 0;
  const completed = followups?.filter((followup) => followup.status === "COMPLETED").length || 0;

  const scopeText = membership?.role === "AGENT"
    ? "Resultados de tu cartera asignada."
    : membership?.role === "MANAGER"
      ? "Resultados comerciales de tu equipo."
      : "Resultados comerciales de toda la organización.";

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="mt-2 text-slate-400">{scopeText}</p>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Card title="Leads" value={totalLeads} />
          <Card title="HOT" value={hot} />
          <Card title="Score promedio" value={scoreAverage} />
          <Card title="Requieren humano" value={human} />
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Panel title="Temperatura">
            <Row label="HOT" value={hot} />
            <Row label="WARM" value={warm} />
            <Row label="COLD" value={cold} />
          </Panel>

          <Panel title="Actividad">
            <Row label="Pendientes" value={pending} />
            <Row label="Completados" value={completed} />
          </Panel>

          <Panel title={membership?.role === "AGENT" ? "Tu actividad" : "Top agente"}>
            {ranking[0] ? <Row label={ranking[0].name} value={ranking[0].total} /> : <p className="text-slate-500">Sin datos</p>}
          </Panel>
        </section>

        <section className="mt-8">
          <Panel title="Zonas más buscadas">
            {zones.map(([zone, count]) => <Row key={zone} label={zone} value={count} />)}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="mb-5 text-xl font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
