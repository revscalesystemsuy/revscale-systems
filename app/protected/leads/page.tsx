import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, Clock3, Flame, Plus, UserRoundCheck, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE_STAGE_LABELS } from "@/lib/commercial-ops";
import { formatResponseMinutes, getSlaStatus, responseMinutes } from "@/lib/sla-metrics";

const ROLE_LABELS: Record<string, string> = { OWNER: "Director", MANAGER: "Gerente", AGENT: "Agente" };
const TEMPERATURE_LABELS: Record<string, string> = { HOT: "Alta prioridad", WARM: "Prioridad media", COLD: "Baja prioridad" };
const STAGE_CLASS: Record<string, string> = {
  NEW: "border-[#d8c9b5] bg-[#eee4d5] text-[#705f48]",
  CONTACTED: "border-[#c9c9b9] bg-[#e9e8dc] text-[#5f6254]",
  QUALIFIED: "border-[#c7cdb8] bg-[#e9ecdf] text-[#596149]",
  VISIT: "border-[#c8c1d0] bg-[#ece8ef] text-[#62566b]",
  NEGOTIATION: "border-[#d2c2aa] bg-[#f0e6d7] text-[#745f42]",
  WON: "border-[#bfcab5] bg-[#e5ebdf] text-[#4f6246]",
  LOST: "border-[#d4bcb4] bg-[#f0e1dc] text-[#7b5549]",
};
const TEMPERATURE_CLASS: Record<string, string> = {
  HOT: "border-[#d5b9ac] bg-[#f2e1da] text-[#7a5044]",
  WARM: "border-[#d6c6a8] bg-[#f0e7d5] text-[#735f3f]",
  COLD: "border-[#c9c8bd] bg-[#ecebe4] text-[#64645a]",
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ agent?: string; source?: string; provider?: string; campaign?: string }> }) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) redirect("/auth/login");

  const userId = claimsData.claims.sub;
  const { data: membership } = await supabase.from("organization_members").select("organization_id,role,team_id").eq("user_id", userId).eq("status", "ACTIVE").single();
  if (!membership) redirect("/protected");

  const filters = await searchParams;
  const canFilterByAgent = ["OWNER", "MANAGER"].includes(membership.role);
  const [{ data: allLeads, error }, { data: slaSettings }] = await Promise.all([
    supabase
      .from("leads")
      .select("id,full_name,phone,primary_zone,operation,budget_max,currency,lead_temperature,lead_score,next_action,requires_human,created_at,assigned_to,pipeline_stage,source_channel,source_provider,source_campaign,assigned_at,first_human_response_at,sla_deadline,sla_breached_at")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_sla_settings")
      .select("warning_minutes_before")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
  ]);

  const warningMinutes = slaSettings?.warning_minutes_before ?? 5;
  const assignedUserIds = Array.from(new Set((allLeads || []).map((lead) => lead.assigned_to).filter(Boolean))) as string[];
  const { data: profiles } = assignedUserIds.length ? await supabase.from("profiles").select("id,full_name").in("id", assignedUserIds) : { data: [] as { id: string; full_name: string | null }[] };
  const profileByUser = new Map((profiles || []).map((profile) => [profile.id, profile.full_name || "Sin nombre"]));

  const sourceOptions = unique((allLeads || []).map((lead) => lead.source_channel));
  const providerOptions = unique((allLeads || []).map((lead) => lead.source_provider));
  const campaignOptions = unique((allLeads || []).map((lead) => lead.source_campaign));
  const leads = (allLeads || []).filter((lead) => {
    if (filters.agent && canFilterByAgent && lead.assigned_to !== filters.agent) return false;
    if (filters.source && lead.source_channel !== filters.source) return false;
    if (filters.provider && lead.source_provider !== filters.provider) return false;
    if (filters.campaign && lead.source_campaign !== filters.campaign) return false;
    return true;
  });

  const total = leads.length;
  const hot = leads.filter((lead) => lead.lead_temperature === "HOT").length;
  const humanAttention = leads.filter((lead) => lead.requires_human).length;
  const unassigned = leads.filter((lead) => !lead.assigned_to).length;
  const breached = leads.filter((lead) => getSlaStatus(lead, new Date(), warningMinutes) === "BREACHED").length;
  const hasFilters = Boolean(filters.agent || filters.source || filters.provider || filters.campaign);

  const scopeText = membership.role === "AGENT" ? "Tus leads asignados." : membership.role === "MANAGER" ? "Leads visibles para tu equipo." : "Todos los leads comerciales de tu organización.";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Gestión comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Leads</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55]">{scopeText}</p>
            <p className="mt-2 text-xs text-[#8a8176]">Alcance: {ROLE_LABELS[membership.role] || membership.role}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasFilters && <Link href="/protected/leads" className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-3 text-sm font-semibold text-[#5b5144]">Limpiar filtros</Link>}
            <Link href="/protected/leads/new" className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2]"><Plus size={16} />Nuevo lead</Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon={<UsersRound size={18} />} label="Leads visibles" value={total} />
          <SummaryCard icon={<Flame size={18} />} label="Alta prioridad" value={hot} note="Temperatura HOT" />
          <SummaryCard icon={<AlertCircle size={18} />} label="Requieren atención" value={humanAttention} note="Intervención humana" />
          <SummaryCard icon={<UserRoundCheck size={18} />} label="Sin responsable" value={unassigned} note={unassigned ? "Conviene asignarlos" : "Cobertura completa"} />
          <SummaryCard icon={<Clock3 size={18} />} label="Fuera de SLA" value={breached} note="Primera respuesta humana" />
        </section>

        <form className="mt-6 grid gap-3 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4 md:grid-cols-2 xl:grid-cols-5">
          {canFilterByAgent && <Filter name="agent" label="Agente" value={filters.agent || ""} options={(profiles || []).map((p) => [p.id, p.full_name || "Sin nombre"])} />}
          <Filter name="source" label="Canal" value={filters.source || ""} options={sourceOptions.map((x) => [x, x])} />
          <Filter name="provider" label="Proveedor" value={filters.provider || ""} options={providerOptions.map((x) => [x, x])} />
          <Filter name="campaign" label="Campaña" value={filters.campaign || ""} options={campaignOptions.map((x) => [x, x])} />
          <button className="self-end rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">Aplicar filtros</button>
        </form>

        {error && <div className="mt-6 rounded-xl border border-[#d3b7ae] bg-[#f1dfd8] p-4 text-sm text-[#704b3d]">No se pudieron cargar los leads.</div>}

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]">
          <div className="border-b border-[#ddd1c0] px-5 py-4 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-serif text-2xl text-[#302d28]">Cartera comercial</h2><p className="mt-1 text-xs text-[#81796e]">Origen, operación, responsable, velocidad y próxima acción en una sola vista.</p></div>
              <Link href="/protected/pipeline" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e604e]">Ver pipeline <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1580px] text-left text-sm">
              <thead><tr className="border-b border-[#ddd1c0] bg-[#f2e9dc] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]"><th className="px-5 py-3.5">Lead</th><th className="px-4">Etapa</th><th className="px-4">Operación</th><th className="px-4">Origen</th><th className="px-4">Zona</th><th className="px-4">Presupuesto</th><th className="px-4">Prioridad</th><th className="px-4">Responsable</th><th className="px-4">SLA</th><th className="px-4 pr-6">Próxima acción</th></tr></thead>
              <tbody>{leads.map((lead) => {
                const stage = lead.pipeline_stage || "NEW";
                const temperature = lead.lead_temperature || "";
                const sla = getSlaStatus(lead, new Date(), warningMinutes);
                const minutes = responseMinutes(lead);
                return <tr key={lead.id} className="border-b border-[#e2d7c8] align-top last:border-b-0 hover:bg-[#fbf6ee]">
                  <td className="px-5 py-4"><Link href={`/protected/leads/${lead.id}`} className="font-serif text-lg font-medium text-[#37312a]">{lead.full_name || "Sin nombre"}</Link><p className="mt-1 text-xs text-[#8a8176]">{lead.phone || "Sin teléfono"}</p>{lead.requires_human && <span className="mt-2 inline-flex rounded-full border border-[#d7bdb4] bg-[#f3e5df] px-2.5 py-1 text-[10px] font-semibold text-[#815448]">ATENCIÓN</span>}</td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${STAGE_CLASS[stage] || STAGE_CLASS.NEW}`}>{PIPELINE_STAGE_LABELS[stage] || stage}</span></td>
                  <td className="px-4 py-4 text-[#5f594f]">{lead.operation || "—"}</td>
                  <td className="px-4 py-4"><p className="font-medium text-[#514a42]">{lead.source_provider || lead.source_channel || "Sin atribuir"}</p><p className="mt-1 text-xs text-[#8a8176]">{lead.source_campaign || lead.source_channel || "—"}</p></td>
                  <td className="px-4 py-4 text-[#5f594f]">{lead.primary_zone || "—"}</td>
                  <td className="px-4 py-4 font-medium text-[#4f493f]">{formatMoney(lead.budget_max, lead.currency)}</td>
                  <td className="px-4 py-4">{temperature ? <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${TEMPERATURE_CLASS[temperature] || TEMPERATURE_CLASS.COLD}`}>{TEMPERATURE_LABELS[temperature] || temperature}</span> : "—"}</td>
                  <td className="px-4 py-4 text-[#5f594f]">{lead.assigned_to ? profileByUser.get(lead.assigned_to) || "Asignado" : <span className="text-[#9a6b59]">Sin responsable</span>}</td>
                  <td className="px-4 py-4"><SlaPill status={sla} /><p className="mt-1.5 text-[11px] text-[#81796e]">{minutes !== null ? formatResponseMinutes(minutes) : sla === "UNASSIGNED" ? "Reloj inactivo" : "Esperando humano"}</p></td>
                  <td className="px-4 py-4 pr-6"><div className="flex gap-3"><span className="max-w-[230px] leading-5 text-[#5f594f]">{lead.next_action || "Sin próxima acción"}</span><Link href={`/protected/leads/${lead.id}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d2c5b3] bg-[#fffaf2] text-[#756246]"><ArrowRight size={14} /></Link></div></td>
                </tr>;
              })}{!leads.length && !error && <tr><td colSpan={10} className="px-6 py-14 text-center"><UserRoundCheck className="mx-auto text-[#a08d72]" /><p className="mt-3 font-serif text-xl text-[#4b443a]">No hay leads con estos filtros.</p></td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function unique(values: Array<string | null>) { return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(); }
function Filter({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) { return <label><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{label}</span><select name={name} defaultValue={value} className="mt-1.5 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#514a42]"><option value="">Todos</option>{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>; }
function SlaPill({ status }: { status: ReturnType<typeof getSlaStatus> }) { const labels = { UNASSIGNED: "Sin SLA", WAITING: "En SLA", WARNING: "Por vencer", WITHIN: "Cumplido", BREACHED: "Incumplido" }; const cls = status === "BREACHED" ? "border-[#b88e75] bg-[#ead3c3] text-[#6b4433]" : status === "WARNING" ? "border-[#c4a86e] bg-[#eee2c8] text-[#6f5a2e]" : status === "WITHIN" ? "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]" : "border-[#d2c5b3] bg-[#eee4d5] text-[#6f6558]"; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${cls}`}>{labels[status]}</span>; }
function SummaryCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note?: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl text-[#302d28]">{value}</p>{note && <p className="mt-1 text-xs text-[#81796e]">{note}</p>}</div>; }
function formatMoney(value: number | string | null, currency: string | null) { if (value == null || value === "") return "—"; const numeric = Number(value); if (Number.isNaN(numeric)) return "—"; return `${currency || ""} ${numeric.toLocaleString("es-UY")}`.trim(); }
