import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  Clock3,
  CreditCard,
  LockKeyhole,
  MessageSquareText,
  Settings2,
  Users,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/organization-role";

function SectionTitle({ icon: Icon, children }: { icon: typeof Building2; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]">
        <Icon size={16} strokeWidth={1.7} />
      </span>
      <span>{children}</span>
    </span>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role,status")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) redirect("/protected");

  const organizationId = membership.organization_id;

  const [{ data: organization }, { count: membersCount }, { data: subscription }, { count: leadsCount }, { count: propertiesCount }] = await Promise.all([
    supabase.from("organizations").select("id,name,slug,created_at").eq("id", organizationId).single(),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "ACTIVE"),
    supabase.from("subscriptions").select("plan,status,max_agents,max_leads,max_properties").eq("organization_id", organizationId).single(),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);

  const roleLabel = ROLE_LABELS[membership.role as keyof typeof ROLE_LABELS] || membership.role;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Administración</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Configuración</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55] md:text-[15px]">Información de la organización, uso del plan y accesos principales de la plataforma.</p>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title={<SectionTitle icon={Building2}>Organización</SectionTitle>}>
            <p className="font-serif text-2xl font-medium text-[#302d28]">{organization?.name || "Sin nombre"}</p>
            <p className="mt-3 text-sm text-[#70685e]">Identificador: <span className="font-medium text-[#514a42]">{organization?.slug || "—"}</span></p>
            <p className="mt-2 text-sm text-[#70685e]">Creada: {organization?.created_at ? new Date(organization.created_at).toLocaleDateString("es-UY") : "—"}</p>
          </Card>

          <Card title={<SectionTitle icon={UserRound}>Usuario actual</SectionTitle>}>
            <p className="text-sm text-[#70685e]">Rol</p>
            <p className="mt-1 text-lg font-semibold text-[#37332d]">{roleLabel}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[#90877c]">Sesión</p>
            <p className="mt-1 break-all text-sm text-[#625d55]">{userId}</p>
          </Card>

          <Card title={<SectionTitle icon={Users}>Equipo</SectionTitle>}>
            <div className="flex items-end justify-between gap-4">
              <div><p className="font-serif text-4xl font-medium text-[#302d28]">{membersCount ?? 0}</p><p className="mt-1 text-sm text-[#70685e]">miembros activos</p></div>
              <p className="text-sm text-[#81796e]">Límite: {subscription?.max_agents ?? 0}</p>
            </div>
            <Link href="/protected/agents" className="mt-5 inline-flex rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#4b4338] transition hover:bg-[#f2e9dc]">Administrar equipo</Link>
          </Card>

          <Card title={<SectionTitle icon={CreditCard}>Suscripción</SectionTitle>}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[#70685e]">Plan actual</p><p className="mt-1 text-lg font-semibold text-[#37332d]">{subscription?.plan || "TRIAL"}</p></div><span className="rounded-full border border-[#d5c8b7] bg-[#eee4d5] px-3 py-1 text-xs font-semibold text-[#625846]">{subscription?.status || "INACTIVE"}</span></div>
            <div className="mt-5 border-t border-[#ddd1c0] pt-5"><h3 className="text-sm font-semibold text-[#514a42]">Uso actual</h3><div className="mt-4 space-y-3 text-sm text-[#70685e]"><UsageRow icon={<Users size={14} strokeWidth={1.7} />} label="Agentes" value={`${membersCount ?? 0}/${subscription?.max_agents ?? 0}`} /><UsageRow icon={<UserRound size={14} strokeWidth={1.7} />} label="Leads" value={`${leadsCount ?? 0}/${subscription?.max_leads ?? 0}`} /><UsageRow icon={<Building2 size={14} strokeWidth={1.7} />} label="Propiedades" value={`${propertiesCount ?? 0}/${subscription?.max_properties ?? 0}`} /></div></div>
            <Link href="/protected/billing" className="mt-6 block rounded-lg bg-[#302d28] px-5 py-3 text-center text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">Gestionar plan</Link>
          </Card>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-7">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><Settings2 size={17} strokeWidth={1.7} /></span><div><h2 className="font-serif text-2xl font-medium text-[#37332d]">Capacidades de administración</h2><p className="mt-2 text-sm leading-6 text-[#665f56]">Accesos disponibles según tu plan y rol. Las funciones bloqueadas siguen gestionándose desde Mi Plan.</p></div></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Capability icon={<Clock3 size={16} strokeWidth={1.7} />} label="SLA y velocidad de primera respuesta" href="/protected/settings/sla" />
            <Capability icon={<MessageSquareText size={16} strokeWidth={1.7} />} label="WhatsApp IA y asistente comercial" href="/protected/settings/whatsapp" />
            <Capability icon={<CreditCard size={16} strokeWidth={1.7} />} label="Facturación y límites de uso" href="/protected/billing" />
            <Capability icon={<LockKeyhole size={16} strokeWidth={1.7} />} label="Roles y permisos" href="/protected/agents" />
            <Capability icon={<BarChart3 size={16} strokeWidth={1.7} />} label="Métricas y evolución comercial" href="/protected/executive" />
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) { return <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)]"><h2 className="mb-5 text-lg font-semibold text-[#37332d]">{title}</h2>{children}</div>; }
function UsageRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2">{icon}{label}</span><span className="font-semibold text-[#4b4338]">{value}</span></div>; }
function Capability({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) { return <Link href={href} className="flex items-center justify-between gap-4 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] px-4 py-3 text-sm font-medium text-[#514a42] transition hover:bg-[#f2e9dc]"><span className="flex items-center gap-2">{icon}{label}</span><span className="text-[#9a8e7d]">→</span></Link>; }
