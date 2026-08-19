import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { updateAgent } from "../../actions";

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getCurrentOrganizationContext();
  if (!context || !["OWNER", "MANAGER"].includes(context.role)) return null;

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("organization_members")
    .select("id,user_id,role,team_id")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .single();
  if (!member) return null;

  if (context.role === "MANAGER" && (member.role !== "AGENT" || member.team_id !== context.teamId)) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,phone")
    .eq("id", member.user_id)
    .single();

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/protected/agents" className="text-blue-400 hover:text-blue-300">← Volver a agentes</Link>
        <h1 className="mt-6 text-3xl font-bold">Editar miembro</h1>

        <form action={updateAgent} className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <input type="hidden" name="id" value={id} />

          <div>
            <label className="text-sm text-slate-400">Nombre completo</label>
            <input name="name" required maxLength={160} defaultValue={profile?.full_name || ""} className="mt-2 w-full rounded-xl border border-white/10 bg-transparent p-3" />
          </div>

          <div>
            <label className="text-sm text-slate-400">Teléfono</label>
            <input name="phone" maxLength={60} defaultValue={profile?.phone || ""} placeholder="099123456" className="mt-2 w-full rounded-xl border border-white/10 bg-transparent p-3" />
          </div>

          {context.role === "OWNER" ? (
            <div>
              <label className="text-sm text-slate-400">Rol</label>
              <select name="role" defaultValue={member.role || "AGENT"} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3">
                <option value="AGENT">Agente</option>
                <option value="MANAGER">Gerente</option>
                <option value="OWNER">Director</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">Si convertís a alguien en Gerente, primero asignale un equipo desde Equipos.</p>
            </div>
          ) : (
            <input type="hidden" name="role" value={member.role} />
          )}

          <button className="rounded-xl bg-blue-500 px-6 py-3 font-semibold hover:bg-blue-400">Guardar cambios</button>
        </form>
      </div>
    </main>
  );
}
