import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { planHasFeature } from "@/lib/plan-access";
import { getCurrentOrganizationContext, ROLE_LABELS } from "@/lib/organization-role";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");

  if (context.subscriptionStatus === "SUSPENDED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-amber-400/20 bg-white/[0.03] p-8 text-center">
          <div className="text-5xl">⏸️</div>
          <h1 className="mt-5 text-3xl font-bold">Cuenta suspendida</h1>
          <p className="mt-4 text-slate-400">
            El acceso a RevScale PropertyOS está temporalmente suspendido. Tus leads, propiedades,
            historial, usuarios y configuración se conservan sin cambios.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Cuando la cuenta se reactive, vas a recuperar el acceso con la misma información que tenías antes.
          </p>
          <a
            href="https://wa.me/59892715418"
            target="_blank"
            className="mt-7 inline-block rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
          >
            Contactar a RevScale
          </a>
        </div>
      </div>
    );
  }

  const { plan, role } = context;
  const enterprise = plan === "ENTERPRISE";
  const isDirector = role === "OWNER";
  const isManager = role === "MANAGER";
  const isAgent = role === "AGENT";
  const canManagePeople = !enterprise || isDirector || isManager;
  const canImport = !enterprise || isDirector || isManager;
  const canSeeManagement = !enterprise || isDirector || isManager;
  const canSeeCompanyAdmin = !enterprise || isDirector;

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="flex w-72 flex-col border-r border-white/10 p-6">
        <h1 className="text-xl font-bold">
          <span className="text-white">RevScale</span>{" "}
          <span className="text-blue-400">PropertyOS</span>
        </h1>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Plan actual</p>
          <p className="mt-1 text-sm font-semibold text-blue-300">{plan}</p>
          {enterprise && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Tu rol</p>
              <p className="mt-1 text-sm font-semibold text-white">{ROLE_LABELS[role]}</p>
              {isAgent && <p className="mt-1 text-xs text-slate-500">Vista enfocada en tu trabajo comercial.</p>}
              {isManager && <p className="mt-1 text-xs text-slate-500">Administración de tu equipo.</p>}
              {isDirector && <p className="mt-1 text-xs text-slate-500">Control total de la organización.</p>}
            </div>
          )}
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          <NavItem href="/protected">Dashboard</NavItem>
          <NavItem href="/protected/leads">Leads</NavItem>
          <NavItem href="/protected/pipeline">Pipeline</NavItem>
          <NavItem href="/protected/properties">Propiedades</NavItem>
          <NavItem href="/protected/interactions">Interacciones</NavItem>
          <NavItem href="/protected/followups">Follow-ups</NavItem>

          {canImport && <NavItem href="/protected/imports">Importar datos</NavItem>}
          {canManagePeople && <NavItem href="/protected/agents">Agentes</NavItem>}
          {enterprise && canManagePeople && (
            <NavItem href="/protected/teams">Equipos y permisos</NavItem>
          )}

          {canSeeManagement && (
            <NavItem href="/protected/reports" locked={!planHasFeature(plan, "reports")}>
              Reportes
            </NavItem>
          )}
          {canSeeManagement && (
            <NavItem href="/protected/analytics" locked={!planHasFeature(plan, "analytics")}>
              Analytics
            </NavItem>
          )}

          {canSeeCompanyAdmin && (
            <NavItem
              href="/protected/settings/integrations"
              locked={!planHasFeature(plan, "integrations")}
            >
              Integraciones
            </NavItem>
          )}
          {canSeeCompanyAdmin && <NavItem href="/protected/billing">Mi Plan</NavItem>}
          {canSeeCompanyAdmin && <NavItem href="/protected/settings">Configuración</NavItem>}
        </nav>

        <div className="mt-auto pt-10 text-sm text-slate-500">
          RevScale Systems
          <br />
          PropertyOS
        </div>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  children,
  locked = false,
}: {
  href: string;
  children: ReactNode;
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
    >
      <span>{children}</span>
      {locked && <span className="text-xs text-slate-500">🔒</span>}
    </Link>
  );
}
