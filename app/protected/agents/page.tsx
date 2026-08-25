import { Suspense } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Edit3,
  Pause,
  Phone,
  Play,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { requirePeopleManager, ROLE_LABELS } from "@/lib/organization-role";
import { toggleAgentStatus } from "./actions";

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-6 md:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl text-sm text-[#746b60]">Cargando equipo...</div>
        </main>
      }
    >
      <AgentsContent />
    </Suspense>
  );
}

async function AgentsContent() {
  const context = await requirePeopleManager();
  const { supabase } = context;

  let membersQuery = supabase
    .from("organization_members")
    .select("id,user_id,role,status,team_id,created_at")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: true });

  if (context.plan === "ENTERPRISE" && context.role === "MANAGER") {
    if (!context.teamId) return null;
    membersQuery = membersQuery.eq("team_id", context.teamId);
  }

  const { data: members } = await membersQuery;
  const userIds = (members || []).map((member) => member.user_id);

  const [{ data: profiles }, { data: followups }, { data: teams }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id,full_name,phone").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; phone: string | null }[] }),
    userIds.length
      ? supabase.from("followups").select("assigned_to,status").in("assigned_to", userIds)
      : Promise.resolve({ data: [] as { assigned_to: string | null; status: string }[] }),
    supabase.from("teams").select("id,name").eq("organization_id", context.organizationId),
  ]);

  const profileByUser = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const teamById = new Map((teams || []).map((team) => [team.id, team.name]));
  const followupStats = new Map<string, { total: number; pending: number; completed: number }>();

  for (const followup of followups || []) {
    if (!followup.assigned_to) continue;
    const current = followupStats.get(followup.assigned_to) || { total: 0, pending: 0, completed: 0 };
    current.total += 1;
    if (followup.status === "PENDING") current.pending += 1;
    if (followup.status === "COMPLETED") current.completed += 1;
    followupStats.set(followup.assigned_to, current);
  }

  const agents = (members || []).map((member) => {
    const stats = followupStats.get(member.user_id) || { total: 0, pending: 0, completed: 0 };
    return {
      ...member,
      profile: profileByUser.get(member.user_id),
      teamName: member.team_id ? teamById.get(member.team_id) || "Sin equipo" : "Sin equipo",
      ...stats,
    };
  });

  const isOwner = context.role === "OWNER";
  const activeCount = agents.filter((agent) => agent.status === "ACTIVE").length;
  const pendingCount = agents.reduce((sum, agent) => sum + agent.pending, 0);
  const activeTeamCount = new Set(agents.map((agent) => agent.team_id).filter(Boolean)).size;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Gestión comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Equipo comercial</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55] md:text-[15px]">
              {context.plan === "ENTERPRISE" && context.role === "MANAGER"
                ? "Administrás las personas, actividad y carga de trabajo de tu equipo."
                : "Administrá miembros, roles y carga de trabajo de la organización desde un solo lugar."}
            </p>
          </div>

          <Link
            href="/protected/agents/invite"
            className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]"
          >
            <UserPlus size={16} strokeWidth={1.7} />
            Invitar miembro
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard icon={<UsersRound size={18} strokeWidth={1.7} />} label="Miembros visibles" value={agents.length} />
          <SummaryCard icon={<CheckCircle2 size={18} strokeWidth={1.7} />} label="Activos" value={activeCount} />
          <SummaryCard icon={<Clock3 size={18} strokeWidth={1.7} />} label="Seguimientos pendientes" value={pendingCount} note={activeTeamCount ? `${activeTeamCount} equipos representados` : "Sin equipos asignados"} />
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const canManageAgent = isOwner || agent.role === "AGENT";
            const isActive = agent.status === "ACTIVE";

            return (
              <article key={agent.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-2xl font-medium text-[#302d28]">{agent.profile?.full_name || "Sin nombre"}</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#70685e]">
                      <Phone size={14} strokeWidth={1.7} className="shrink-0 text-[#907b60]" />
                      <span className="truncate">{agent.profile?.phone || "Sin teléfono"}</span>
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${isActive ? "border-[#c8cfb3] bg-[#edf0e3] text-[#596146]" : "border-[#d7bdb4] bg-[#f3e5df] text-[#815448]"}`}>
                    {isActive ? "Activo" : "Suspendido"}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#d5c8b7] bg-[#eee4d5] px-3 py-1 text-xs font-medium text-[#625846]">
                    {ROLE_LABELS[agent.role as keyof typeof ROLE_LABELS] || agent.role}
                  </span>
                  <span className="rounded-full border border-[#ddd1c0] bg-[#fffaf2] px-3 py-1 text-xs text-[#746b60]">{agent.teamName}</span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 border-y border-[#ddd1c0] py-4">
                  <Metric label="Total" value={agent.total} />
                  <Metric label="Pendientes" value={agent.pending} />
                  <Metric label="Completados" value={agent.completed} />
                </div>

                {canManageAgent && (
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/protected/agents/${agent.id}/edit`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#4b4338] transition hover:bg-[#f2e9dc]"
                    >
                      <Edit3 size={14} strokeWidth={1.7} />
                      Editar
                    </Link>

                    <form action={toggleAgentStatus}>
                      <input type="hidden" name="id" value={agent.id} />
                      <input type="hidden" name="status" value={isActive ? "SUSPENDED" : "ACTIVE"} />
                      <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#cdbfa9] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#685d4e] transition hover:bg-[#eee4d5]">
                        {isActive ? <Pause size={14} strokeWidth={1.7} /> : <Play size={14} strokeWidth={1.7} />}
                        {isActive ? "Suspender" : "Activar"}
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
      <div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div>
      <p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p>
      {note && <p className="mt-1 text-xs text-[#81796e]">{note}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8176]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#37332d]">{value}</p>
    </div>
  );
}
