import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateOpportunityRisk, OPEN_PIPELINE_STAGE_SET } from "@/lib/commercial-ops";

const HISTORY_START = "2026-08-25T00:00:00.000Z";

type AgentRow = {
  id: string;
  name: string;
  won: number;
  lost: number;
  visitEvents: number;
  conversion: number | null;
  open: number;
  highRisk: number;
  stalled: number;
  overdueFollowups: number;
};

export default async function TeamPerformancePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership || membership.role !== "OWNER") redirect("/protected");

  const orgId = membership.organization_id;
  const now = new Date();

  const [
    { data: membersData },
    { data: profilesData },
    { data: leadsData },
    { data: eventsData },
    { data: interactionsData },
    { data: followupsData },
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id,role")
      .eq("organization_id", orgId)
      .eq("status", "ACTIVE")
      .eq("role", "AGENT"),
    supabase.from("profiles").select("id,full_name"),
    supabase
      .from("leads")
      .select("id,assigned_to,pipeline_stage,stage_entered_at,expected_close_date,lead_temperature,requires_human,next_action,created_at")
      .eq("organization_id", orgId),
    supabase
      .from("lead_stage_events")
      .select("lead_id,assigned_to,to_stage,changed_at")
      .eq("organization_id", orgId)
      .gte("changed_at", HISTORY_START),
    supabase
      .from("latest_interaction_by_lead")
      .select("lead_id,last_interaction_at")
      .eq("organization_id", orgId),
    supabase
      .from("followups")
      .select("lead_id,assigned_to,due_at,status")
      .eq("organization_id", orgId)
      .eq("status", "PENDING"),
  ]);

  const members = membersData || [];
  const profiles = profilesData || [];
  const leads = leadsData || [];
  const events = eventsData || [];
  const followups = followupsData || [];
  const profileNameById = new Map(profiles.map((profile) => [profile.id, profile.full_name]));
  const lastInteractionByLead = new Map((interactionsData || []).map((item) => [item.lead_id, item.last_interaction_at]));
  const followupsByLead = new Map<string, typeof followups>();
  const overdueFollowupsByAgent = new Map<string, number>();

  for (const followup of followups) {
    const leadItems = followupsByLead.get(followup.lead_id) || [];
    leadItems.push(followup);
    followupsByLead.set(followup.lead_id, leadItems);

    if (followup.assigned_to && followup.due_at && new Date(followup.due_at).getTime() < now.getTime()) {
      overdueFollowupsByAgent.set(followup.assigned_to, (overdueFollowupsByAgent.get(followup.assigned_to) || 0) + 1);
    }
  }

  const nameFor = (id: string) => profileNameById.get(id) || "Agente sin nombre";

  const rows: AgentRow[] = members.map((member) => {
    const agentId = member.user_id;
    const wonLeadIds = new Set(events.filter((event) => event.assigned_to === agentId && event.to_stage === "WON").map((event) => event.lead_id));
    const lostLeadIds = new Set(events.filter((event) => event.assigned_to === agentId && event.to_stage === "LOST").map((event) => event.lead_id));
    const visitEvents = new Set(events.filter((event) => event.assigned_to === agentId && event.to_stage === "VISIT").map((event) => event.lead_id)).size;
    const closed = wonLeadIds.size + lostLeadIds.size;

    const agentOpen = leads.filter((lead) => lead.assigned_to === agentId && OPEN_PIPELINE_STAGE_SET.has(lead.pipeline_stage || "NEW"));
    let highRisk = 0;
    let stalled = 0;

    for (const lead of agentOpen) {
      const lastInteractionAt = lastInteractionByLead.get(lead.id) || null;
      const leadFollowups = followupsByLead.get(lead.id) || [];
      const hasOverdueFollowup = leadFollowups.some((item) => item.due_at && new Date(item.due_at).getTime() < now.getTime());
      const risk = calculateOpportunityRisk(lead, {
        now,
        lastInteractionAt,
        hasPendingFollowup: leadFollowups.length > 0,
        hasOverdueFollowup,
      });
      if (risk.level === "HIGH") highRisk += 1;
      if (risk.isStalled) stalled += 1;
    }

    return {
      id: agentId,
      name: nameFor(agentId),
      won: wonLeadIds.size,
      lost: lostLeadIds.size,
      visitEvents,
      conversion: closed > 0 ? Math.round((wonLeadIds.size / closed) * 100) : null,
      open: agentOpen.length,
      highRisk,
      stalled,
      overdueFollowups: overdueFollowupsByAgent.get(agentId) || 0,
    };
  });

  rows.sort((a, b) =>
    b.won - a.won ||
    (b.conversion ?? -1) - (a.conversion ?? -1) ||
    a.highRisk - b.highRisk ||
    a.overdueFollowups - b.overdueFollowups ||
    a.name.localeCompare(b.name, "es"),
  );

  const totalWon = rows.reduce((sum, row) => sum + row.won, 0);
  const totalClosed = rows.reduce((sum, row) => sum + row.won + row.lost, 0);
  const orgConversion = totalClosed ? Math.round((totalWon / totalClosed) * 100) : null;
  const totalHighRisk = rows.reduce((sum, row) => sum + row.highRisk, 0);
  const totalOverdue = rows.reduce((sum, row) => sum + row.overdueFollowups, 0);

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/executive" className="text-sm font-medium text-[#725d40]">Volver a Dirección</Link>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Rendimiento comercial</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Rendimiento del equipo</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">Ranking transparente desde el 25/08/2026. Prioriza cierres, luego conversión sobre oportunidades cerradas y usa salud del pipeline como desempate. No reconstruye actividad anterior a la activación del historial.</p>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Cierres registrados" value={String(totalWon)} />
          <Metric title="Conversión registrada" value={orgConversion === null ? "Sin muestra" : `${orgConversion}%`} />
          <Metric title="Oportunidades en riesgo alto" value={String(totalHighRisk)} />
          <Metric title="Seguimientos vencidos" value={String(totalOverdue)} />
        </section>

        <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-[#37332d]">Ranking de agentes</h2>
              <p className="mt-2 text-sm text-[#81796e]">La conversión se calcula únicamente como WON / (WON + LOST) dentro del historial disponible.</p>
            </div>
            <Link href="/protected/executive/monthly" className="text-sm font-medium text-[#725d40]">Ver evolución mensual</Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[#d8ccbb] text-[10px] uppercase tracking-[0.13em] text-[#81796e]">
                <tr>
                  <th className="py-3">Pos.</th>
                  <th>Agente</th>
                  <th>Cierres</th>
                  <th>Conversión</th>
                  <th>Visitas</th>
                  <th>Pipeline abierto</th>
                  <th>Riesgo alto</th>
                  <th>Estancadas</th>
                  <th>Seguimientos vencidos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const closedSample = row.won + row.lost;
                  return (
                    <tr key={row.id} className="border-b border-[#e3d8c8] last:border-0">
                      <td className="py-4 font-serif text-xl text-[#8d7553]">{String(index + 1).padStart(2, "0")}</td>
                      <td><p className="font-medium text-[#403b34]">{row.name}</p><p className="mt-1 text-xs text-[#8a8278]">{closedSample < 3 ? "Muestra todavía pequeña" : `${closedSample} oportunidades cerradas`}</p></td>
                      <td className="font-medium">{row.won}</td>
                      <td>{row.conversion === null ? "—" : `${row.conversion}%`}</td>
                      <td>{row.visitEvents}</td>
                      <td>{row.open}</td>
                      <td><Signal value={row.highRisk} /></td>
                      <td><Signal value={row.stalled} /></td>
                      <td><Signal value={row.overdueFollowups} /></td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={9} className="py-6 text-[#81796e]">No hay agentes activos para comparar.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-[#d2c5b3] bg-[#efe6d9] p-5 text-sm leading-6 text-[#675f55]">
          <p className="font-medium text-[#403b34]">Cómo leer este ranking</p>
          <p className="mt-2">No es un puntaje opaco. Dos agentes con pocos cierres pueden cambiar de posición rápidamente mientras crece la muestra. Por eso RevScale muestra también riesgo alto, estancamiento y seguimientos vencidos: sirven para gestionar, no para fingir precisión estadística.</p>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-3xl text-[#2f2c27]">{value}</p></div>;
}

function Signal({ value }: { value: number }) {
  const className = value > 0 ? "border-[#c6a58e] bg-[#f0ded2] text-[#704b3d]" : "border-[#b9c0ad] bg-[#e6e9df] text-[#536047]";
  return <span className={`inline-flex min-w-8 justify-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>;
}
