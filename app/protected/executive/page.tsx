import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_PROBABILITY, buildForecastByCurrency, formatCommercialAmount } from "@/lib/pipeline-metrics";

const OPEN_STAGES = new Set(["NEW", "CONTACTED", "QUALIFIED", "VISIT", "NEGOTIATION"]);
const STALE_DAYS: Record<string, number> = { NEW: 3, CONTACTED: 3, QUALIFIED: 7, VISIT: 7, NEGOTIATION: 10 };

export default async function ExecutivePage() {
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
  if (!membership) redirect("/protected");
  if (membership.role !== "OWNER") redirect("/protected");

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const periodMonth = monthStart.toISOString().slice(0, 10);
  const monthEndExclusive = nextMonth.toISOString().slice(0, 10);
  const monthLabel = new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "America/Montevideo" }).format(now);

  async function saveGoal(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const actorId = claimsData?.claims?.sub;
    if (!actorId) redirect("/auth/login");

    const { data: owner } = await supabase
      .from("organization_members")
      .select("organization_id,role")
      .eq("user_id", actorId)
      .eq("status", "ACTIVE")
      .single();
    if (!owner || owner.role !== "OWNER") throw new Error("Solo el Director puede definir metas.");

    const scopeType = String(formData.get("scope_type") || "").toUpperCase();
    const scopeId = String(formData.get("scope_id") || "").trim();
    const targetCount = Number(formData.get("target_won_count") || 0);
    const targetValueRaw = String(formData.get("target_value") || "").trim();
    const targetValue = targetValueRaw ? Number(targetValueRaw) : null;
    const currency = targetValue === null ? null : String(formData.get("currency") || "USD").toUpperCase();
    const period = String(formData.get("period_month") || "").trim();

    if (!['ORGANIZATION','TEAM','AGENT'].includes(scopeType)) throw new Error("Alcance inválido.");
    if (!/^\d{4}-\d{2}-01$/.test(period)) throw new Error("Mes inválido.");
    if (!Number.isInteger(targetCount) || targetCount < 0) throw new Error("Meta de cierres inválida.");
    if (targetValue !== null && (!Number.isFinite(targetValue) || targetValue < 0)) throw new Error("Meta de valor inválida.");
    if (targetValue !== null && !['USD','UYU'].includes(currency || '')) throw new Error("Moneda inválida.");
    if (scopeType !== 'ORGANIZATION' && !scopeId) throw new Error("Seleccioná equipo o agente.");

    let query = supabase.from("sales_goals").select("id").eq("organization_id", owner.organization_id).eq("scope_type", scopeType).eq("period_month", period);
    if (scopeType === 'TEAM') query = query.eq("team_id", scopeId);
    if (scopeType === 'AGENT') query = query.eq("agent_id", scopeId);
    const { data: existing } = await query.maybeSingle();

    const payload = {
      organization_id: owner.organization_id,
      scope_type: scopeType,
      team_id: scopeType === 'TEAM' ? scopeId : null,
      agent_id: scopeType === 'AGENT' ? scopeId : null,
      period_month: period,
      target_won_count: targetCount,
      target_value: targetValue,
      currency,
      created_by: actorId,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase.from("sales_goals").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("sales_goals").insert(payload);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/protected/executive");
  }

  const orgId = membership.organization_id;
  const [{ data: leadsData }, { data: wonEventsData }, { data: goalsData }, { data: teamsData }, { data: membersData }, { data: profilesData }] = await Promise.all([
    supabase.from("leads").select("id,full_name,pipeline_stage,budget_max,currency,stage_entered_at,expected_close_date,assigned_to,team_id").eq("organization_id", orgId),
    supabase.from("lead_stage_events").select("lead_id,team_id,assigned_to,changed_at").eq("organization_id", orgId).eq("to_stage", "WON").gte("changed_at", monthStart.toISOString()).lt("changed_at", nextMonth.toISOString()),
    supabase.from("sales_goals").select("id,scope_type,team_id,agent_id,target_won_count,target_value,currency,period_month").eq("organization_id", orgId).eq("period_month", periodMonth),
    supabase.from("teams").select("id,name").eq("organization_id", orgId).eq("is_active", true),
    supabase.from("organization_members").select("user_id,team_id,role").eq("organization_id", orgId).eq("status", "ACTIVE"),
    supabase.from("profiles").select("id,full_name"),
  ]);

  const leads = leadsData || [];
  const wonEvents = wonEventsData || [];
  const goals = goalsData || [];
  const teams = teamsData || [];
  const members = membersData || [];
  const profiles = profilesData || [];
  const profileName = (id: string | null) => profiles.find((p) => p.id === id)?.full_name || "Sin nombre";

  const wonLeadIds = new Set(wonEvents.map((event) => event.lead_id));
  const wonLeads = leads.filter((lead) => wonLeadIds.has(lead.id));
  const orgGoal = goals.find((goal) => goal.scope_type === "ORGANIZATION");
  const orgTarget = Number(orgGoal?.target_won_count || 0);
  const actualWins = wonLeadIds.size;
  const goalProgress = orgTarget ? Math.min(100, Math.round((actualWins / orgTarget) * 100)) : 0;

  const monthForecastLeads = leads.filter((lead) => OPEN_STAGES.has(lead.pipeline_stage || "NEW") && lead.expected_close_date && lead.expected_close_date >= periodMonth && lead.expected_close_date < monthEndExclusive);
  const forecast = buildForecastByCurrency(monthForecastLeads);

  const actualValueByCurrency = new Map<string, number>();
  for (const lead of wonLeads) {
    const value = Number(lead.budget_max || 0);
    if (!Number.isFinite(value) || value <= 0) continue;
    const currency = (lead.currency || "Sin moneda").toUpperCase();
    actualValueByCurrency.set(currency, (actualValueByCurrency.get(currency) || 0) + value);
  }

  const stalled = leads
    .filter((lead) => OPEN_STAGES.has(lead.pipeline_stage || "NEW"))
    .map((lead) => {
      const entered = new Date(lead.stage_entered_at || now.toISOString());
      const days = Math.max(0, Math.floor((now.getTime() - entered.getTime()) / 86400000));
      return { ...lead, days, threshold: STALE_DAYS[lead.pipeline_stage || "NEW"] || 7 };
    })
    .filter((lead) => lead.days >= lead.threshold)
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);

  const missingExpectedDate = leads.filter((lead) => OPEN_STAGES.has(lead.pipeline_stage || "NEW") && !lead.expected_close_date).length;
  const overdueExpected = leads.filter((lead) => OPEN_STAGES.has(lead.pipeline_stage || "NEW") && lead.expected_close_date && lead.expected_close_date < now.toISOString().slice(0, 10)).length;

  const teamPerformance = teams.map((team) => {
    const goal = goals.find((g) => g.scope_type === "TEAM" && g.team_id === team.id);
    const won = wonEvents.filter((event) => event.team_id === team.id).length;
    const target = Number(goal?.target_won_count || 0);
    return { id: team.id, name: team.name, won, target, pct: target ? Math.round((won / target) * 100) : 0 };
  }).sort((a, b) => b.won - a.won);

  const agentPerformance = members.filter((member) => member.role === "AGENT").map((member) => {
    const goal = goals.find((g) => g.scope_type === "AGENT" && g.agent_id === member.user_id);
    const won = wonEvents.filter((event) => event.assigned_to === member.user_id).length;
    const target = Number(goal?.target_won_count || 0);
    return { id: member.user_id, teamId: member.team_id, name: profileName(member.user_id), won, target, pct: target ? Math.round((won / target) * 100) : 0 };
  }).sort((a, b) => b.won - a.won || b.pct - a.pct);

  const input = "w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-sm text-[#37332d] outline-none focus:border-[#8d7553]";

  return (
    <main className="min-h-screen bg-[#eee5d7] p-6 text-[#292722] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected" className="text-sm font-medium text-[#756246]">Volver al dashboard</Link>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#927a58]">Dirección comercial</p>
        <h1 className="mt-3 font-serif text-4xl font-medium md:text-5xl">Dashboard ejecutivo</h1>
        <p className="mt-2 text-[#6f685f]">Metas, forecast del mes, cierres y oportunidades estancadas · {monthLabel}</p>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric title="Meta de cierres" value={orgTarget || "—"} />
          <Metric title="Cierres del mes" value={actualWins} />
          <Metric title="Cumplimiento" value={orgTarget ? `${goalProgress}%` : "Sin meta"} />
          <Metric title="Estancadas" value={stalled.length} />
          <Metric title="Sin fecha de cierre" value={missingExpectedDate} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Forecast del mes">
            <p className="mb-4 text-sm text-[#81796e]">Solo incluye oportunidades abiertas con fecha estimada de cierre dentro de este mes.</p>
            {forecast.length ? forecast.map((item) => (
              <div key={item.currency} className="mb-4 rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4 last:mb-0">
                <div className="flex justify-between gap-4"><span className="font-medium">{item.currency}</span><span>{item.opportunities} oportunidades</span></div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm"><div><p className="text-[#81796e]">Pipeline</p><p className="mt-1 font-serif text-xl">{formatCommercialAmount(item.currency, item.pipeline)}</p></div><div><p className="text-[#81796e]">Ponderado</p><p className="mt-1 font-serif text-xl">{formatCommercialAmount(item.currency, item.weighted)}</p></div></div>
              </div>
            )) : <p className="text-sm text-[#81796e]">Todavía no hay oportunidades con cierre estimado este mes.</p>}
          </Panel>

          <Panel title="Valor cerrado este mes">
            {actualValueByCurrency.size ? [...actualValueByCurrency.entries()].map(([currency, value]) => (
              <div key={currency} className="flex items-center justify-between border-b border-[#ddd1c0] py-3 last:border-0"><span>{currency}</span><span className="font-serif text-xl">{formatCommercialAmount(currency, value)}</span></div>
            )) : <p className="text-sm text-[#81796e]">Todavía no hay cierres con valor registrado este mes.</p>}
            {orgGoal?.target_value && orgGoal.currency && <div className="mt-4 rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4 text-sm"><p className="text-[#81796e]">Meta de volumen</p><p className="mt-1 font-serif text-xl">{formatCommercialAmount(orgGoal.currency, Number(orgGoal.target_value))}</p></div>}
          </Panel>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-2xl">Oportunidades estancadas</h2><p className="mt-1 text-sm text-[#81796e]">{overdueExpected} oportunidades además tienen fecha estimada vencida.</p></div><Link href="/protected/pipeline" className="text-sm font-medium text-[#756246]">Abrir pipeline</Link></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-[#d8ccbb] text-xs uppercase tracking-[0.12em] text-[#81796e]"><tr><th className="py-3">Lead</th><th>Etapa</th><th>Días</th><th>Cierre estimado</th><th></th></tr></thead><tbody>{stalled.length ? stalled.map((lead) => <tr key={lead.id} className="border-b border-[#e3d8c8]"><td className="py-4 font-medium">{lead.full_name || "Sin nombre"}</td><td>{lead.pipeline_stage}</td><td>{lead.days} d</td><td>{lead.expected_close_date || "Sin fecha"}</td><td className="text-right"><Link href={`/protected/leads/${lead.id}`} className="font-medium text-[#756246]">Ver</Link></td></tr>) : <tr><td colSpan={5} className="py-5 text-[#81796e]">No hay oportunidades estancadas según los umbrales actuales.</td></tr>}</tbody></table></div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Metas por equipo"><Performance rows={teamPerformance} /></Panel>
          <Panel title="Metas por agente"><Performance rows={agentPerformance} /></Panel>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
          <h2 className="font-serif text-2xl">Definir metas</h2>
          <p className="mt-2 text-sm text-[#81796e]">El Director puede fijar metas mensuales de cierres y, opcionalmente, volumen por moneda.</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <GoalForm title="Organización" scope="ORGANIZATION" periodMonth={periodMonth} input={input} action={saveGoal} />
            <GoalForm title="Equipo" scope="TEAM" periodMonth={periodMonth} input={input} action={saveGoal} options={teams.map((team) => ({ value: team.id, label: team.name }))} />
            <GoalForm title="Agente" scope="AGENT" periodMonth={periodMonth} input={input} action={saveGoal} options={members.filter((m) => m.role === "AGENT").map((m) => ({ value: m.user_id, label: profileName(m.user_id) }))} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: number | string }) { return <div className="rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-5"><p className="text-sm text-[#81796e]">{title}</p><p className="mt-2 font-serif text-3xl">{value}</p></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6"><h2 className="font-serif text-2xl">{title}</h2><div className="mt-5">{children}</div></section>; }
function Performance({ rows }: { rows: { id: string; name: string; won: number; target: number; pct: number }[] }) { return <div className="space-y-4">{rows.length ? rows.map((row) => <div key={row.id}><div className="flex justify-between gap-4 text-sm"><span className="font-medium">{row.name}</span><span>{row.won}/{row.target || "—"} cierres</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5d9c7]"><div className="h-full rounded-full bg-[#8e7654]" style={{ width: `${Math.min(100, row.pct)}%` }} /></div></div>) : <p className="text-sm text-[#81796e]">Sin datos suficientes.</p>}</div>; }
function GoalForm({ title, scope, periodMonth, input, action, options = [] }: { title: string; scope: string; periodMonth: string; input: string; action: (formData: FormData) => Promise<void>; options?: { value: string; label: string }[] }) { return <form action={action} className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4"><p className="font-medium">{title}</p><input type="hidden" name="scope_type" value={scope} /><input type="hidden" name="period_month" value={periodMonth} />{scope !== "ORGANIZATION" && <select name="scope_id" required className={`mt-3 ${input}`}><option value="">Seleccionar</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}<label className="mt-3 block text-xs text-[#81796e]">Meta de cierres<input name="target_won_count" type="number" min="0" required className={`mt-1 ${input}`} /></label><label className="mt-3 block text-xs text-[#81796e]">Meta de volumen opcional<input name="target_value" type="number" min="0" step="any" className={`mt-1 ${input}`} /></label><label className="mt-3 block text-xs text-[#81796e]">Moneda<select name="currency" className={`mt-1 ${input}`}><option value="USD">USD</option><option value="UYU">UYU</option></select></label><button className="mt-4 w-full rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">Guardar meta</button></form>; }
