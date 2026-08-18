import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentPlanHasFeature } from "@/lib/plan-access";
import { createTeam, updateMemberRole, updateMemberTeam } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Director",
  MANAGER: "Gerente",
  AGENT: "Agente",
};

export default async function TeamsPage() {
  const enterprise = await currentPlanHasFeature("enterprise_operations");

  if (!enterprise) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">Enterprise</div>
          <h1 className="mt-3 text-3xl font-bold">Equipos y sucursales</h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Organizá sucursales, definí Director, Gerentes y Agentes, y distribuí automáticamente los leads entre el equipo correcto.
          </p>
          <Link href="/pricing" className="mt-6 inline-block rounded-xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400">
            Ver Enterprise
          </Link>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { data: currentMembership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!currentMembership) return null;

  const [{ data: teams }, { data: members }, { data: profiles }, { data: leads }] = await Promise.all([
    supabase
      .from("teams")
      .select("id,name,description,zones,auto_assign,is_active,created_at")
      .eq("organization_id", currentMembership.organization_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_members")
      .select("id,user_id,role,status,team_id,created_at")
      .eq("organization_id", currentMembership.organization_id)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id,full_name,phone"),
    supabase
      .from("leads")
      .select("id,team_id,assigned_to")
      .eq("organization_id", currentMembership.organization_id),
  ]);

  const canManage = ["OWNER", "MANAGER"].includes(currentMembership.role);
  const isOwner = currentMembership.role === "OWNER";

  const teamRows = (teams || []).map((team) => {
    const teamMembers = (members || []).filter((member) => member.team_id === team.id);
    const teamLeads = (leads || []).filter((lead) => lead.team_id === team.id);

    return {
      ...team,
      members: teamMembers.length,
      agents: teamMembers.filter((member) => member.role === "AGENT" && member.status === "ACTIVE").length,
      leads: teamLeads.length,
      unassigned: teamLeads.filter((lead) => !lead.assigned_to).length,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">Enterprise</div>
            <h1 className="mt-2 text-3xl font-bold">Equipos y sucursales</h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Cada lead entra al equipo correspondiente por zona y se asigna al agente activo con menor carga.
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
            Tu rol: <b>{ROLE_LABELS[currentMembership.role] || currentMembership.role}</b>
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teamRows.map((team) => (
            <div key={team.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{team.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{team.description || "Sin descripción"}</p>
                </div>
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  {team.auto_assign ? "Auto" : "Manual"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Metric label="Agentes" value={team.agents} />
                <Metric label="Leads" value={team.leads} />
                <Metric label="Sin asignar" value={team.unassigned} />
              </div>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Zonas</p>
                <p className="mt-2 text-sm text-slate-300">
                  {team.zones?.length ? team.zones.join(", ") : "General / todas las zonas"}
                </p>
              </div>
            </div>
          ))}
        </section>

        {canManage && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Crear equipo o sucursal</h2>
            <form action={createTeam} className="mt-5 grid gap-4 lg:grid-cols-4">
              <input name="name" required placeholder="Ej. Punta del Este" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="description" placeholder="Descripción" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="zones" placeholder="Zonas: Pocitos, Carrasco" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3" />
              <button className="rounded-xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400">+ Crear equipo</button>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Personas y permisos</h2>
          <div className="mt-5 space-y-3">
            {(members || []).map((member) => {
              const profile = (profiles || []).find((item) => item.id === member.user_id);
              const assignedLeads = (leads || []).filter((lead) => lead.assigned_to === member.user_id).length;

              return (
                <div key={member.id} className="grid gap-4 rounded-xl border border-white/10 p-4 lg:grid-cols-[1.4fr_0.8fr_1fr_1fr] lg:items-center">
                  <div>
                    <p className="font-semibold">{profile?.full_name || "Sin nombre"}</p>
                    <p className="mt-1 text-xs text-slate-500">{assignedLeads} leads asignados</p>
                  </div>

                  <div>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </div>

                  {canManage ? (
                    <form action={updateMemberTeam} className="flex gap-2">
                      <input type="hidden" name="member_id" value={member.id} />
                      <select name="team_id" defaultValue={member.team_id || ""} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm">
                        <option value="">Sin equipo</option>
                        {(teams || []).map((team) => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Guardar</button>
                    </form>
                  ) : (
                    <p className="text-sm text-slate-400">Solo lectura</p>
                  )}

                  {isOwner ? (
                    <form action={updateMemberRole} className="flex gap-2">
                      <input type="hidden" name="member_id" value={member.id} />
                      <select name="role" defaultValue={member.role} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm">
                        <option value="OWNER">Director</option>
                        <option value="MANAGER">Gerente</option>
                        <option value="AGENT">Agente</option>
                      </select>
                      <button className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Aplicar</button>
                    </form>
                  ) : (
                    <p className="text-sm text-slate-500">Rol administrado por Director</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
