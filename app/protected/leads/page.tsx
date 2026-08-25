import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Flame,
  Plus,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE_STAGE_LABELS } from "@/lib/commercial-ops";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Director",
  MANAGER: "Gerente",
  AGENT: "Agente",
};

const TEMPERATURE_LABELS: Record<string, string> = {
  HOT: "Alta prioridad",
  WARM: "Prioridad media",
  COLD: "Baja prioridad",
};

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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) redirect("/auth/login");

  const userId = claimsData.claims.sub;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role,team_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) redirect("/protected");

  const { agent } = await searchParams;
  const canFilterByAgent = ["OWNER", "MANAGER"].includes(membership.role);

  let query = supabase
    .from("leads")
    .select(
      "id,full_name,phone,primary_zone,operation,budget_max,currency,lead_temperature,lead_score,next_action,requires_human,created_at,assigned_to,pipeline_stage",
    )
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (agent && canFilterByAgent) query = query.eq("assigned_to", agent);

  const { data: leads, error } = await query;
  const assignedUserIds = Array.from(new Set((leads || []).map((lead) => lead.assigned_to).filter(Boolean))) as string[];
  const { data: profiles } = assignedUserIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", assignedUserIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const profileByUser = new Map((profiles || []).map((profile) => [profile.id, profile.full_name || "Sin nombre"]));
  const total = leads?.length || 0;
  const hot = (leads || []).filter((lead) => lead.lead_temperature === "HOT").length;
  const humanAttention = (leads || []).filter((lead) => lead.requires_human).length;
  const unassigned = (leads || []).filter((lead) => !lead.assigned_to).length;

  let scopeText = "Todos los leads comerciales de tu organización.";
  if (membership.role === "MANAGER") scopeText = "Leads visibles para tu equipo.";
  if (membership.role === "AGENT") scopeText = "Tus leads asignados.";
  if (agent && canFilterByAgent) {
    scopeText = `Leads asignados a ${profileByUser.get(agent) || "la persona seleccionada"}.`;
  }

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Gestión comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Leads</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55] md:text-[15px]">{scopeText}</p>
            <p className="mt-2 text-xs text-[#8a8176]">Alcance actual: {ROLE_LABELS[membership.role] || membership.role}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {agent && canFilterByAgent && (
              <Link
                href="/protected/leads"
                className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-3 text-sm font-semibold text-[#5b5144] transition hover:bg-[#f2e9dc]"
              >
                Ver todo mi alcance
              </Link>
            )}
            <Link
              href="/protected/leads/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]"
            >
              <Plus size={16} strokeWidth={1.7} />
              Nuevo lead
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<UsersRound size={18} strokeWidth={1.7} />} label="Leads visibles" value={total} />
          <SummaryCard icon={<Flame size={18} strokeWidth={1.7} />} label="Alta prioridad" value={hot} note="Temperatura HOT" />
          <SummaryCard icon={<AlertCircle size={18} strokeWidth={1.7} />} label="Requieren atención" value={humanAttention} note="Intervención humana" />
          <SummaryCard icon={<UserRoundCheck size={18} strokeWidth={1.7} />} label="Sin responsable" value={unassigned} note={unassigned ? "Conviene asignarlos" : "Cobertura completa"} />
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-[#d3b7ae] bg-[#f1dfd8] p-4 text-sm text-[#704b3d]">
            No se pudieron cargar los leads.
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <div className="border-b border-[#ddd1c0] px-5 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-medium text-[#302d28]">Cartera comercial</h2>
                <p className="mt-1 text-xs leading-5 text-[#81796e]">Priorizá por etapa, temperatura, responsable y próxima acción.</p>
              </div>
              <Link href="/protected/pipeline" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e604e] hover:text-[#443c31]">
                Ver pipeline
                <ArrowRight size={15} strokeWidth={1.7} />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#ddd1c0] bg-[#f2e9dc] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">
                  <th className="px-5 py-3.5 md:px-6">Lead</th>
                  <th className="px-4 py-3.5">Etapa</th>
                  <th className="px-4 py-3.5">Operación</th>
                  <th className="px-4 py-3.5">Zona</th>
                  <th className="px-4 py-3.5">Presupuesto</th>
                  <th className="px-4 py-3.5">Prioridad</th>
                  <th className="px-4 py-3.5">Responsable</th>
                  <th className="px-4 py-3.5 pr-6">Próxima acción</th>
                </tr>
              </thead>
              <tbody>
                {(leads || []).map((lead) => {
                  const stage = lead.pipeline_stage || "NEW";
                  const temperature = lead.lead_temperature || "";
                  return (
                    <tr key={lead.id} className="border-b border-[#e2d7c8] align-top transition last:border-b-0 hover:bg-[#fbf6ee]">
                      <td className="px-5 py-4 md:px-6">
                        <Link href={`/protected/leads/${lead.id}`} className="font-serif text-lg font-medium text-[#37312a] hover:text-[#6c5941]">
                          {lead.full_name || "Sin nombre"}
                        </Link>
                        <p className="mt-1 text-xs text-[#8a8176]">{lead.phone || "Sin teléfono"}</p>
                        {lead.requires_human && (
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#d7bdb4] bg-[#f3e5df] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#815448]">
                            <AlertCircle size={11} strokeWidth={1.8} />
                            Atención
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STAGE_CLASS[stage] || STAGE_CLASS.NEW}`}>
                          {PIPELINE_STAGE_LABELS[stage] || stage}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#5f594f]">{lead.operation || "—"}</td>
                      <td className="px-4 py-4 text-[#5f594f]">{lead.primary_zone || "—"}</td>
                      <td className="px-4 py-4 font-medium text-[#4f493f]">{formatMoney(lead.budget_max, lead.currency)}</td>
                      <td className="px-4 py-4">
                        {temperature ? (
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${TEMPERATURE_CLASS[temperature] || TEMPERATURE_CLASS.COLD}`}>
                            {TEMPERATURE_LABELS[temperature] || temperature}
                          </span>
                        ) : (
                          <span className="text-xs text-[#9a9186]">Sin clasificar</span>
                        )}
                        {lead.lead_score != null && <p className="mt-1.5 text-[11px] text-[#8a8176]">Score {lead.lead_score}</p>}
                      </td>
                      <td className="px-4 py-4 text-[#5f594f]">
                        {lead.assigned_to ? profileByUser.get(lead.assigned_to) || "Asignado" : <span className="text-[#9a6b59]">Sin responsable</span>}
                      </td>
                      <td className="px-4 py-4 pr-6">
                        <div className="flex items-start justify-between gap-3">
                          <span className="max-w-[240px] leading-5 text-[#5f594f]">{lead.next_action || "Sin próxima acción definida"}</span>
                          <Link
                            href={`/protected/leads/${lead.id}`}
                            aria-label={`Abrir ${lead.full_name || "lead"}`}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d2c5b3] bg-[#fffaf2] text-[#756246] transition hover:bg-[#eee4d5]"
                          >
                            <ArrowRight size={14} strokeWidth={1.7} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!leads?.length && !error && (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center">
                      <UsersRound size={24} strokeWidth={1.5} className="mx-auto text-[#a08d72]" />
                      <p className="mt-3 font-serif text-xl text-[#4b443a]">No hay leads dentro de tu alcance actual.</p>
                      <p className="mt-1 text-sm text-[#81796e]">Cuando ingresen nuevas oportunidades van a aparecer acá.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
      <div className="flex items-center gap-2 text-[#806d52]">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p>
      {note && <p className="mt-1 text-xs text-[#81796e]">{note}</p>}
    </div>
  );
}

function formatMoney(value: number | string | null, currency: string | null) {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "—";
  return `${currency || ""} ${numeric.toLocaleString("es-UY")}`.trim();
}
