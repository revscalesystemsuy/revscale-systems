import Link from "next/link";
import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSubscription, planHasFeature } from "@/lib/plan-access";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const subscription = await getCurrentSubscription();
  const plan = subscription?.plan || "TRIAL";

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="flex w-72 flex-col border-r border-white/10 p-6">
        <h1 className="text-xl font-bold">
          <span className="text-white">RevScale</span>{" "}
          <span className="text-blue-400">PropertyOS</span>
        </h1>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Plan actual</p>
          <p className="mt-1 text-sm font-semibold text-blue-300">{plan}</p>
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          <NavItem href="/protected">Dashboard</NavItem>
          <NavItem href="/protected/leads">Leads</NavItem>
          <NavItem href="/protected/pipeline">Pipeline</NavItem>
          <NavItem href="/protected/properties">Propiedades</NavItem>
          <NavItem href="/protected/interactions">Interacciones</NavItem>
          <NavItem href="/protected/followups">Follow-ups</NavItem>
          <NavItem href="/protected/agents">Agentes</NavItem>
          <NavItem href="/protected/reports" locked={!planHasFeature(plan, "reports")}>
            Reportes
          </NavItem>
          <NavItem href="/protected/analytics" locked={!planHasFeature(plan, "analytics")}>
            Analytics
          </NavItem>
          <NavItem
            href="/protected/settings/integrations"
            locked={!planHasFeature(plan, "integrations")}
          >
            Integraciones
          </NavItem>
          <NavItem href="/protected/settings">Configuración</NavItem>
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
