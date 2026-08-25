import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { requirePeopleManager } from "@/lib/organization-role";
import { updateAgent } from "../../actions";

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requirePeopleManager();
  const { supabase } = context;

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

  const input = "mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#37332d] outline-none transition focus:border-[#8d7553] focus:ring-2 focus:ring-[#8d7553]/10";
  const canEditRole = context.role === "OWNER" && context.plan === "ENTERPRISE";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/protected/agents" className="inline-flex items-center gap-2 text-sm font-medium text-[#725d40] transition hover:text-[#3f3529]">
          <ArrowLeft size={15} strokeWidth={1.7} />
          Volver a Equipo
        </Link>

        <div className="mt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Equipo comercial</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Editar miembro</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55] md:text-[15px]">Actualizá los datos visibles y, cuando corresponda, el rol comercial del miembro.</p>
        </div>

        <form action={updateAgent} className="mt-8 space-y-5 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)] md:p-7">
          <input type="hidden" name="id" value={id} />

          <label className="block text-sm font-medium text-[#625d55]">
            Nombre completo
            <input name="name" required maxLength={160} defaultValue={profile?.full_name || ""} className={input} />
          </label>

          <label className="block text-sm font-medium text-[#625d55]">
            Teléfono
            <input name="phone" maxLength={60} defaultValue={profile?.phone || ""} placeholder="099123456" className={input} />
          </label>

          {canEditRole ? (
            <label className="block text-sm font-medium text-[#625d55]">
              Rol
              <select name="role" defaultValue={member.role || "AGENT"} className={input}>
                <option value="AGENT">Agente</option>
                <option value="MANAGER">Gerente</option>
                <option value="OWNER">Director</option>
              </select>
              <span className="mt-2 block text-xs leading-5 text-[#81796e]">Si convertís a alguien en Gerente, asignale un equipo desde Equipos y permisos.</span>
            </label>
          ) : (
            <input type="hidden" name="role" value={member.role} />
          )}

          <div className="border-t border-[#ddd1c0] pt-5">
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">
              <Save size={16} strokeWidth={1.7} />
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
