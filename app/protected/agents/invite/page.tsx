import Link from "next/link";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { createClient } from "@/lib/supabase/server";
import { inviteAgent } from "../actions";

export default async function InviteAgentPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !["OWNER", "MANAGER"].includes(context.role)) return null;

  const supabase = await createClient();
  const { data: teams } = context.role === "OWNER"
    ? await supabase
        .from("teams")
        .select("id,name")
        .eq("organization_id", context.organizationId)
        .eq("is_active", true)
        .order("name")
    : { data: [] as { id: string; name: string }[] };

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/protected/agents" className="text-blue-400 hover:text-blue-300">
          ← Volver a Agentes
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Invitar miembro</h1>
        <p className="mt-2 text-slate-400">
          La persona recibirá un email seguro para activar su cuenta. No se crea ninguna contraseña compartida.
        </p>

        <form action={inviteAgent} className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <label className="text-sm text-slate-400">Nombre completo</label>
            <input name="name" required maxLength={160} placeholder="Ej: Juan Pérez" className="mt-2 w-full rounded-xl border border-white/10 bg-transparent p-3" />
          </div>

          <div>
            <label className="text-sm text-slate-400">Teléfono</label>
            <input name="phone" maxLength={60} placeholder="Ej: 099123456" className="mt-2 w-full rounded-xl border border-white/10 bg-transparent p-3" />
          </div>

          <div>
            <label className="text-sm text-slate-400">Email</label>
            <input name="email" type="email" required maxLength={320} placeholder="agente@email.com" className="mt-2 w-full rounded-xl border border-white/10 bg-transparent p-3" />
          </div>

          <div>
            <label className="text-sm text-slate-400">Rol</label>
            <select name="role" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3">
              <option value="AGENT">Agente</option>
              {context.role === "OWNER" && <option value="MANAGER">Gerente</option>}
              {context.role === "OWNER" && <option value="OWNER">Director</option>}
            </select>
          </div>

          {context.role === "OWNER" && (
            <div>
              <label className="text-sm text-slate-400">Equipo</label>
              <select name="team_id" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3">
                <option value="">Sin equipo</option>
                {(teams || []).map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">Los Gerentes deben tener un equipo asignado.</p>
            </div>
          )}

          <button className="rounded-xl bg-blue-500 px-6 py-3 font-semibold hover:bg-blue-400">
            Enviar invitación segura
          </button>
        </form>
      </div>
    </main>
  );
}
