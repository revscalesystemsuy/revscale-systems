import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  Database,
  House,
  MessagesSquare,
  Settings,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";
import { planHasFeature } from "@/lib/plan-access";
import { getCurrentOrganizationContext, ROLE_LABELS } from "@/lib/organization-role";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await getCurrentOrganizationContext();

  if (!context) {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    if (claimsData?.claims?.sub) redirect("/auth/pending-activation");
    redirect("/auth/login");
  }

  if (context.subscriptionStatus === "SUSPENDED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eee5d7] p-6 text-[#292722]">
        <div className="w-full max-w-xl rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-8 text-center shadow-[0_24px_70px_rgba(71,58,40,0.08)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#927a58]">
            RevScale PropertyOS
          </p>
          <h1 className="mt-4 font-serif text-3xl font-medium">Cuenta suspendida</h1>
          <p className="mt-4 leading-6 text-[#625d55]">
            El acceso a RevScale PropertyOS está temporalmente suspendido. Tus leads, propiedades,
            historial, usuarios y configuración se conservan sin cambios.
          </p>
          <p className="mt-3 text-sm leading-6 text-[#81796e]">
            Cuando la cuenta se reactive, vas a recuperar el acceso con la misma información que tenías antes.
          </p>
          <a
            href="https://wa.me/59892715418"
            target="_blank"
            className="mt-7 inline-block rounded-lg bg-[#292722] px-5 py-3 font-semibold text-[#f8f1e7] transition hover:bg-[#3a3731]"
          >
            Contactar a RevScale
          </a>
        </div>
      </div>
    );
  }

  const { plan, role, supabase, userId } = context;
  const enterprise = plan === "ENTERPRISE";
  const isDirector = role === "OWNER";
  const isManager = role === "MANAGER";
  const isAgent = role === "AGENT";
  const canManagePeople = !enterprise || isDirector || isManager;
  const canImport = !enterprise || isDirector || isManager;
  const canSeeManagement = !enterprise || isDirector || isManager;
  const canSeeCompanyAdmin = !enterprise || isDirector;

  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return (
    <div className="revscale-real-app flex min-h-screen bg-[#eee5d7] text-[#292722]">
      <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-[#d2c6b5] bg-[#e5dac9] px-5 py-6">
        <div className="px-2">
          <p className="font-serif text-[1.45rem] leading-none tracking-tight text-[#292722]">
            RevScale
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#927a58]">
            PropertyOS
          </p>
        </div>

        <div className="mx-2 mt-7 border-y border-[#d1c4b1] py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#81796e]">
            Plan actual
          </p>
          <p className="mt-2 text-sm font-semibold text-[#4b453d]">{plan}</p>
          {enterprise && (
            <div className="mt-3 border-t border-[#d1c4b1] pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#81796e]">
                Tu rol
              </p>
              <p className="mt-1 text-sm font-semibold text-[#302d28]">{ROLE_LABELS[role]}</p>
              {isAgent && <p className="mt-1 text-xs leading-5 text-[#7b746a]">Vista enfocada en tu trabajo comercial.</p>}
              {isManager && <p className="mt-1 text-xs leading-5 text-[#7b746a]">Administración de tu equipo.</p>}
              {isDirector && <p className="mt-1 text-xs leading-5 text-[#7b746a]">Control total de la organización.</p>}
            </div>
          )}
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          <NavItem href="/protected" icon={<House size={16} strokeWidth={1.6} />}>Resumen</NavItem>
          <NavItem href="/protected/notifications" icon={<Bell size={16} strokeWidth={1.6} />} badge={unreadNotifications || 0}>Notificaciones</NavItem>
          <NavItem href="/protected/leads" icon={<Users size={16} strokeWidth={1.6} />}>Leads</NavItem>
          <NavItem href="/protected/pipeline" icon={<Workflow size={16} strokeWidth={1.6} />}>Pipeline</NavItem>
          <NavItem href="/protected/properties" icon={<Building2 size={16} strokeWidth={1.6} />}>Propiedades</NavItem>
          <NavItem href="/protected/interactions" icon={<MessagesSquare size={16} strokeWidth={1.6} />}>Interacciones</NavItem>
          <NavItem href="/protected/followups" icon={<ClipboardList size={16} strokeWidth={1.6} />}>Seguimientos</NavItem>

          {canImport && <NavItem href="/protected/imports" icon={<Database size={16} strokeWidth={1.6} />}>Importar datos</NavItem>}
          {canManagePeople && <NavItem href="/protected/agents" icon={<Users size={16} strokeWidth={1.6} />}>Equipo</NavItem>}
          {enterprise && canManagePeople && (
            <NavItem href="/protected/teams" icon={<SlidersHorizontal size={16} strokeWidth={1.6} />}>Equipos y permisos</NavItem>
          )}

          {canSeeManagement && (
            <NavItem href="/protected/reports" icon={<BarChart3 size={16} strokeWidth={1.6} />} locked={!planHasFeature(plan, "reports")}>
              Reportes
            </NavItem>
          )}
          {canSeeManagement && (
            <NavItem href="/protected/analytics" icon={<ChartNoAxesCombined size={16} strokeWidth={1.6} />} locked={!planHasFeature(plan, "analytics")}>
              Analítica
            </NavItem>
          )}

          {canSeeCompanyAdmin && (
            <NavItem
              href="/protected/settings/integrations"
              icon={<SlidersHorizontal size={16} strokeWidth={1.6} />}
              locked={!planHasFeature(plan, "integrations")}
            >
              Integraciones
            </NavItem>
          )}
          {canSeeCompanyAdmin && <NavItem href="/protected/billing" icon={<CreditCard size={16} strokeWidth={1.6} />}>Mi Plan</NavItem>}
          {canSeeCompanyAdmin && <NavItem href="/protected/settings" icon={<Settings size={16} strokeWidth={1.6} />}>Configuración</NavItem>}
        </nav>

        <div className="mx-2 mt-6 border-t border-[#d1c4b1] pt-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8c8377]">RevScale Systems</p>
          <p className="mt-1 text-xs text-[#716a61]">Inteligencia comercial inmobiliaria</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  children,
  icon,
  locked = false,
  badge = 0,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  locked?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-[#5f594f] transition hover:bg-[#f0e8dc] hover:text-[#292722]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="text-[#8b7d69] transition group-hover:text-[#6d5b43]">{icon}</span>
        <span>{children}</span>
      </span>
      <span className="flex items-center gap-2">
        {badge > 0 && (
          <span className="min-w-5 rounded-full bg-[#6f5c40] px-1.5 py-0.5 text-center text-[10px] font-bold text-[#fffaf2]">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {locked && <span className="text-xs text-[#8c8377]">•</span>}
      </span>
    </Link>
  );
}
