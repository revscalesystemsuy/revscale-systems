import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Check, ChevronRight, Database, UserCheck, Users } from "lucide-react";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { completeOnboarding, assignInitialLeads } from "./actions";

export default async function OnboardingPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.role !== "OWNER") redirect("/protected");

  const { supabase, organizationId, plan } = context;

  const [
    { data: organization },
    { count: leadsCount },
    { count: propertiesCount },
    { count: activeMembersCount },
    { count: assignedLeadsCount },
    { data: members },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("organizations").select("id,name,slug").eq("id", organizationId).single(),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "ACTIVE"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).not("assigned_to", "is", null),
    supabase.from("organization_members").select("user_id,role,team_id").eq("organization_id", organizationId).eq("status", "ACTIVE").order("created_at"),
    supabase.from("profiles").select("id,full_name"),
  ]);

  const leadTotal = leadsCount || 0;
  const propertyTotal = propertiesCount || 0;
  const memberTotal = activeMembersCount || 0;
  const assignedTotal = assignedLeadsCount || 0;
  const multiUser = memberTotal > 1;
  const assignmentComplete = !multiUser || leadTotal === 0 || assignedTotal === leadTotal;

  const profileName = (id: string) => profiles?.find((profile) => profile.id === id)?.full_name || "Miembro del equipo";
  const assignableMembers = (members || []).filter((member) => ["AGENT", "MANAGER", "OWNER"].includes(member.role));

  const steps = [
    {
      title: "Empresa activa",
      description: organization?.name ? `${organization.name} · plan ${plan}` : `Organización activa · plan ${plan}`,
      completed: Boolean(organization?.id),
      href: "/protected/settings",
      action: "Revisar empresa",
      icon: Building2,
    },
    {
      title: "Cargar leads",
      description: leadTotal ? `${leadTotal} leads listos para trabajar.` : "Importá tu cartera inicial o cargá el primer lead.",
      completed: leadTotal > 0,
      href: "/protected/imports?return_to=onboarding",
      action: leadTotal ? "Ver importación" : "Importar leads",
      icon: Database,
    },
    {
      title: "Cargar propiedades",
      description: propertyTotal ? `${propertyTotal} propiedades disponibles para matching.` : "Importá el inventario comercial inicial.",
      completed: propertyTotal > 0,
      href: "/protected/imports?return_to=onboarding",
      action: propertyTotal ? "Ver inventario" : "Importar propiedades",
      icon: Building2,
    },
    {
      title: "Preparar equipo",
      description: multiUser ? `${memberTotal} miembros activos.` : "Podés empezar solo o invitar vendedores cuando lo necesites.",
      completed: true,
      href: "/protected/agents/invite?return_to=onboarding",
      action: multiUser ? "Gestionar equipo" : "Invitar vendedor",
      icon: Users,
    },
    {
      title: "Asignar responsables",
      description: multiUser
        ? assignmentComplete
          ? `${assignedTotal}/${leadTotal} leads con responsable.`
          : `${leadTotal - assignedTotal} leads todavía sin responsable.`
        : "Operación individual: no necesitás asignación inicial.",
      completed: assignmentComplete,
      href: "/protected/leads",
      action: assignmentComplete ? "Ver leads" : "Asignar ahora",
      icon: UserCheck,
    },
  ];

  const completedSteps = steps.filter((step) => step.completed).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const ready = steps.every((step) => step.completed);

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Puesta en marcha</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Configurar RevScale</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Cinco pasos para dejar la operación lista. El progreso se calcula con datos reales de tu organización y no se completa por adelantado.</p>
          </div>
          <Link href="/protected" className="text-sm font-medium text-[#725d40]">Ir al dashboard</Link>
        </div>

        <section className="mt-7 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#81796e]">Progreso</p><p className="mt-2 font-serif text-3xl text-[#302d28]">{progress}%</p></div>
            <p className="text-sm text-[#81796e]">{completedSteps} de {steps.length} pasos listos</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e3d7c6]"><div className="h-full rounded-full bg-[#8e7654]" style={{ width: `${progress}%` }} /></div>
        </section>

        <section className="mt-7 space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="grid gap-4 rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:grid-cols-[48px_1fr_auto] md:items-center">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${step.completed ? "border-[#a9b39b] bg-[#e1e5d9] text-[#4f5d43]" : "border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"}`}>
                  {step.completed ? <Check size={18} strokeWidth={1.8} /> : <Icon size={18} strokeWidth={1.7} />}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">Paso {index + 1}</p>
                  <h2 className="mt-1 font-serif text-xl text-[#37332d]">{step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6f685f]">{step.description}</p>
                </div>
                {step.title === "Asignar responsables" && multiUser && !assignmentComplete ? (
                  <form action={assignInitialLeads} className="flex min-w-[280px] gap-2">
                    <select name="member_user_id" required className="min-w-0 flex-1 rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-3 py-2 text-sm text-[#4f4941]">
                      <option value="">Responsable inicial</option>
                      {assignableMembers.map((member) => <option key={member.user_id} value={member.user_id}>{profileName(member.user_id)}</option>)}
                    </select>
                    <button className="rounded-lg bg-[#302d28] px-4 py-2 text-sm font-semibold !text-[#fffaf2]">Asignar sin dueño</button>
                  </form>
                ) : (
                  <Link href={step.href} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-2 text-sm font-semibold text-[#554f47]">
                    {step.action}<ChevronRight size={15} strokeWidth={1.7} />
                  </Link>
                )}
              </article>
            );
          })}
        </section>

        <section className={`mt-7 rounded-2xl border p-6 ${ready ? "border-[#a9b39b] bg-[#e6e9df]" : "border-[#d2c5b3] bg-[#efe6d9]"}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div><h2 className="font-serif text-2xl text-[#37332d]">{ready ? "Operación lista para empezar" : "Completá los pasos pendientes"}</h2><p className="mt-2 text-sm leading-6 text-[#6f685f]">{ready ? "Al activar la operación, RevScale guardará el onboarding como completo y te llevará al dashboard." : "Leads y propiedades son los mínimos operativos. Si trabajás con equipo, los leads también deben tener responsable."}</p></div>
            <form action={completeOnboarding}><button disabled={!ready} className="rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] disabled:cursor-not-allowed disabled:opacity-40">Activar operación</button></form>
          </div>
        </section>
      </div>
    </main>
  );
}
