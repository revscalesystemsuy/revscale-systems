import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext, ROLE_LABELS } from "@/lib/organization-role";
import { toggleAgentStatus } from "./actions";

export default function AgentsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 p-8 text-white">Cargando...</main>}>
      <AgentsContent />
    </Suspense>
  );
}

async function AgentsContent() {
  const context = await getCurrentOrganizationContext();
  if (!context) return null;

  const supabase = await createClient();
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
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("followups").select("assigned_to,status").in("assigned_to", userIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("teams")
      .select("id,name")
      .eq("organization_id", context.organizationId),
  ]);

  const agents = (members || []).map((member) => {
    const profile = (profiles || []).find((item) => item.id === member.user_id);
    const memberFollowups = (followups || []).filter((item) => item.assigned_to === member.user_id);
    const team = (teams || []).find((item) => item.id === member.team_id);

    return {
      ...member,
      profile,
      teamName: team?.name || "Sin equipo",
      total: memberFollowups.length,
      pending: memberFollowups.filter((item) => item.status === "PENDING").length,
      completed: memberFollowups.filter((item) => item.status === "COMPLETED").length,
    };
  });

  const isOwner = context.role === "OWNER";

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-400">Gestión comercial</p>
            <h1 className="mt-1 text-3xl font-bold">Agentes</h1>
            <p className="mt-2 text-slate-400">
              {context.plan === "ENTERPRISE" && context.role === "MANAGER"
                ? "Administrás únicamente las personas de tu equipo."
                : "Administración del equipo comercial de la organización."}
            </p>
          </div>
          <Link href="/protected/agents/invite" className="rounded-xl bg-blue-500 px-5 py-3 font-semibold">
            + Invitar agente
          </Link>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-bold">{agent.profile?.full_name || "Sin nombre"}</h2>
              <p className="mt-1 text-slate-400">📞 {agent.profile?.phone || "Sin teléfono"}</p>
              <p className="mt-1 text-xs text-slate-500">{agent.teamName}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-sm ${agent.status === "ACTIVE" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {agent.status === "ACTIVE" ? "🟢 Activo" : "🔴 Suspendido"}
                </span>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-400">
                  {ROLE_LABELS[agent.role as keyof typeof ROLE_LABELS] || agent.role}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <Metric label="Total" value={agent.total} />
                <Metric label="Pend." value={agent.pending} />
                <Metric label="OK" value={agent.completed} />
              </div>

              {(isOwner || agent.role === "AGENT") && (
                <Link href={`/protected/agents/${agent.id}/edit`} className="mt-5 block rounded-xl border border-white/10 px-4 py-2 text-center text-sm hover:bg-white/5">
                  ✏️ Editar
                </Link>
              )}

              {(isOwner || agent.role === "AGENT") && (
                <form action={toggleAgentStatus} className="mt-3">
                  <input type="hidden" name="id" value={agent.id} />
                  <input type="hidden" name="status" value={agent.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                  <button className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
                    {agent.status === "ACTIVE" ? "⏸ Suspender" : "▶ Activar"}
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
