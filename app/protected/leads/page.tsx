import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Director",
  MANAGER: "Gerente",
  AGENT: "Agente",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role,team_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) redirect("/protected");

  const { agent } = await searchParams;

  let query = supabase
    .from("leads")
    .select("id, full_name, phone, primary_zone, operation, budget_max, currency, lead_temperature, lead_score, next_action, requires_human, created_at, assigned_to")
    .order("created_at", { ascending: false });

  if (agent && ["OWNER", "MANAGER"].includes(membership.role)) {
    query = query.eq("assigned_to", agent);
  }

  const { data: leads, error } = await query;

  let scopeText = "Todos los leads comerciales de tu organización.";
  if (membership.role === "MANAGER") scopeText = "Leads visibles para tu equipo.";
  if (membership.role === "AGENT") scopeText = "Tus leads asignados.";
  if (agent && ["OWNER", "MANAGER"].includes(membership.role)) scopeText = "Leads asignados al agente seleccionado.";

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-5">
          <div>
            <Link href="/protected" className="text-sm font-medium text-blue-400">
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Leads</h1>
            <p className="mt-2 text-slate-400">{scopeText}</p>
            <p className="mt-2 text-xs text-slate-500">
              Rol actual: {ROLE_LABELS[membership.role] || membership.role}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 px-5 py-3">
              <p className="text-xs text-slate-400">Total visible</p>
              <p className="text-2xl font-bold">{leads?.length ?? 0}</p>
            </div>

            {agent && ["OWNER", "MANAGER"].includes(membership.role) && (
              <Link href="/protected/leads" className="rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5">
                Ver todo mi alcance
              </Link>
            )}

            <Link href="/protected/leads/new" className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">
              + Nuevo Lead
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            No se pudieron cargar los leads.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-4">Lead</th>
                  <th className="p-4">Operación</th>
                  <th className="p-4">Zona</th>
                  <th className="p-4">Presupuesto</th>
                  <th className="p-4">Temperatura</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Próxima acción</th>
                </tr>
              </thead>
              <tbody>
                {leads?.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/5">
                    <td className="p-4">
                      <Link href={`/protected/leads/${lead.id}`} className="font-semibold hover:text-blue-300">
                        {lead.full_name || "Sin nombre"}
                      </Link>
                      <p className="text-xs text-slate-500">{lead.phone}</p>
                    </td>
                    <td className="p-4">{lead.operation || "—"}</td>
                    <td className="p-4">{lead.primary_zone || "—"}</td>
                    <td className="p-4">
                      {lead.budget_max ? `${lead.currency || ""} ${Number(lead.budget_max).toLocaleString()}` : "—"}
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                        {lead.lead_temperature || "SIN CLASIFICAR"}
                      </span>
                    </td>
                    <td className="p-4 font-bold">{lead.lead_score ?? "—"}</td>
                    <td className="p-4">{lead.next_action || "—"}</td>
                  </tr>
                ))}

                {!leads?.length && !error && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500">
                      No hay leads dentro de tu alcance actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
