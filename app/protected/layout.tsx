import Link from "next/link";
import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="flex w-72 flex-col border-r border-white/10 p-6">
        <h1 className="text-xl font-bold">
          <span className="text-white">RevScale</span>{" "}
          <span className="text-blue-400">PropertyOS</span>
        </h1>

        <nav className="mt-10 flex flex-col gap-2">
          <NavItem href="/protected">Dashboard</NavItem>
          <NavItem href="/protected/leads">Leads</NavItem>
          <NavItem href="/protected/pipeline">Pipeline</NavItem>
          <NavItem href="/protected/properties">Propiedades</NavItem>
          <NavItem href="/protected/interactions">Interacciones</NavItem>
          <NavItem href="/protected/followups">Follow-ups</NavItem>
          <NavItem href="/protected/agents">Agentes</NavItem>
          <NavItem href="/protected/reports">Reportes</NavItem>
          <NavItem href="/protected/analytics">Analytics</NavItem>
          <NavItem href="/protected/settings/integrations">Integraciones</NavItem>
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
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}
