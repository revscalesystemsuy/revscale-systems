import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { requirePeopleManager } from "@/lib/organization-role";
import { inviteAgent } from "../actions";

export default async function InviteAgentPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const context = await requirePeopleManager();

  const { return_to: returnToRaw } = await searchParams;
  const returnTo = returnToRaw === "onboarding" ? "onboarding" : "";
  const backHref = returnTo ? "/protected/onboarding" : "/protected/agents";
  const backLabel = returnTo ? "Volver a puesta en marcha" : "Volver a Equipo";

  const { data: teams } = context.role === "OWNER" && context.plan === "ENTERPRISE"
    ? await context.supabase
        .from("teams")
        .select("id,name")
        .eq("organization_id", context.organizationId)
        .eq("is_active", true)
        .order("name")
    : { data: [] as { id: string; name: string }[] };

  const input = "mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#37332d] outline-none transition placeholder:text-[#a09688] focus:border-[#8d7553] focus:ring-2 focus:ring-[#8d7553]/10";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#725d40] transition hover:text-[#3f3529]">
          <ArrowLeft size={15} strokeWidth={1.7} />
          {backLabel}
        </Link>

        <div className="mt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Equipo comercial</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Invitar miembro</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55] md:text-[15px]">
            La persona recibirá un email seguro para activar su cuenta. RevScale no crea ni comparte contraseñas.
          </p>
        </div>

        <form action={inviteAgent} className="mt-8 space-y-5 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)] md:p-7">
          {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

          <label className="block text-sm font-medium text-[#625d55]">
            Nombre completo
            <input name="name" required maxLength={160} placeholder="Ej: Juan Pérez" className={input} />
          </label>

          <label className="block text-sm font-medium text-[#625d55]">
            Teléfono
            <input name="phone" maxLength={60} placeholder="Ej: 099123456" className={input} />
          </label>

          <label className="block text-sm font-medium text-[#625d55]">
            Email
            <input name="email" type="email" required maxLength={320} placeholder="agente@email.com" className={input} />
          </label>

          <label className="block text-sm font-medium text-[#625d55]">
            Rol
            <select name="role" className={input} defaultValue="AGENT">
              <option value="AGENT">Agente</option>
              {context.plan === "ENTERPRISE" && context.role === "OWNER" && <option value="MANAGER">Gerente</option>}
              {context.plan === "ENTERPRISE" && context.role === "OWNER" && <option value="OWNER">Director</option>}
            </select>
          </label>

          {context.plan === "ENTERPRISE" && context.role === "OWNER" && (
            <label className="block text-sm font-medium text-[#625d55]">
              Equipo
              <select name="team_id" className={input} defaultValue="">
                <option value="">Sin equipo</option>
                {(teams || []).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <span className="mt-2 block text-xs leading-5 text-[#81796e]">Los Gerentes deben tener un equipo asignado.</span>
            </label>
          )}

          <div className="border-t border-[#ddd1c0] pt-5">
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">
              <UserPlus size={16} strokeWidth={1.7} />
              Enviar invitación segura
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
