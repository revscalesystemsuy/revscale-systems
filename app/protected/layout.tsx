import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Database,
  House,
  ListChecks,
  LogOut,
  MapPinned,
  MessageCircle,
  MessagesSquare,
  Settings,
  SlidersHorizontal,
  Target,
  Users,
  UsersRound,
  Workflow,
  Zap,
} from "lucide-react";
import { planHasFeature } from "@/lib/plan-access";
import { buildNavigationEntries } from "@/lib/navigation-structure";
import { getCurrentOrganizationContext, ROLE_LABELS } from "@/lib/organization-role";
import { canAccessRealSurface, PRODUCT_SURFACES, type ProductSurfaceIcon } from "@/lib/product-surfaces";
import { createClient } from "@/lib/supabase/server";
import { MobileProtectedNav } from "./mobile-protected-nav";

const ICONS = {
  House, ListChecks, Target, ClipboardList, Bell, Users, Workflow, Zap, Building2,
  MessagesSquare, Database, UsersRound, BarChart3, ChartNoAxesCombined,
  MessageCircle, SlidersHorizontal, CreditCard, MapPinned, Settings,
} satisfies Record<ProductSurfaceIcon, typeof House>;

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#927a58]">RevScale PropertyOS</p>
          <h1 className="mt-4 font-serif text-3xl font-medium">Cuenta suspendida</h1>
          <p className="mt-4 leading-6 text-[#625d55]">El acceso a RevScale PropertyOS está temporalmente suspendido. Tus leads, propiedades, historial, usuarios y configuración se conservan sin cambios.</p>
          <p className="mt-3 text-sm leading-6 text-[#81796e]">Cuando la cuenta se reactive, vas a recuperar el acceso con la misma información que tenías antes.</p>
          <a href="https://wa.me/59892715418" target="_blank" className="mt-7 inline-block rounded-lg bg-[#292722] px-5 py-3 font-semibold text-[#f8f1e7] transition hover:bg-[#3a3731]">Contactar a RevScale</a>
        </div>
      </div>
    );
  }

  const { plan, role, supabase, userId, organizationId } = context;
  const enterprise = plan === "ENTERPRISE";
  const isDirector = role === "OWNER";
  const isManager = role === "MANAGER";
  const isAgent = role === "AGENT";

  const [{ count: unreadNotifications }, onboardingResult] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    isDirector
      ? supabase.from("organization_onboarding").select("completed").eq("organization_id", organizationId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const showOnboarding = isDirector && onboardingResult.data?.completed !== true;
  const visibleSurfaces = PRODUCT_SURFACES.filter((surface) => canAccessRealSurface(surface, { plan, role, onboardingIncomplete: showOnboarding }));
  const navigationEntries = buildNavigationEntries(visibleSurfaces);

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/auth/login");
  }

  return (
    <div className="revscale-real-app flex min-h-screen bg-[#eee5d7] text-[#292722]">
      <MobileProtectedNav surfaces={visibleSurfaces} unreadNotifications={unreadNotifications || 0} plan={plan} />
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[#d2c6b5] bg-[#e5dac9] px-5 py-6 lg:flex">
        <div className="px-2"><p className="font-serif text-[1.45rem] leading-none tracking-tight text-[#292722]">RevScale</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#927a58]">PropertyOS</p></div>
        <div className="mx-2 mt-7 border-y border-[#d1c4b1] py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#81796e]">Plan actual</p><p className="mt-2 text-sm font-semibold text-[#4b453d]">{plan}</p>
          {enterprise && <div className="mt-3 border-t border-[#d1c4b1] pt-3"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#81796e]">Tu rol</p><p className="mt-1 text-sm font-semibold text-[#302d28]">{ROLE_LABELS[role]}</p>{isAgent && <p className="mt-1 text-xs leading-5 text-[#7b746a]">Vista enfocada en tu trabajo comercial.</p>}{isManager && <p className="mt-1 text-xs leading-5 text-[#7b746a]">Administración de tu equipo.</p>}{isDirector && <p className="mt-1 text-xs leading-5 text-[#7b746a]">Control total de la organización.</p>}</div>}
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {navigationEntries.map((entry) => {
            if (entry.kind === "item") {
              const surface = entry.item;
              const Icon = ICONS[surface.icon];
              const locked = Boolean(surface.feature && !planHasFeature(plan, surface.feature));
              const badge = surface.badge === "notifications" ? unreadNotifications || 0 : 0;
              return <NavItem key={surface.id} href={surface.realHref} icon={<Icon size={16} strokeWidth={1.6} />} locked={locked} badge={badge}>{surface.label}</NavItem>;
            }

            const Icon = ICONS[entry.icon];
            const groupBadge = entry.items.some((item) => item.badge === "notifications") ? unreadNotifications || 0 : 0;
            return (
              <details key={entry.id} className="group/nav rounded-lg open:bg-[#eaddcc]">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2.5 text-sm text-[#5f594f] transition hover:bg-[#f0e8dc] hover:text-[#292722] [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-3"><Icon size={16} strokeWidth={1.6} className="text-[#8b7d69]" /><span>{entry.label}</span></span>
                  <span className="flex items-center gap-2">{groupBadge > 0 && <span className="min-w-5 rounded-full bg-[#6f5c40] px-1.5 py-0.5 text-center text-[10px] font-bold text-[#fffaf2]">{groupBadge > 99 ? "99+" : groupBadge}</span>}<ChevronDown size={14} className="text-[#8b7d69] transition-transform group-open/nav:rotate-180" /></span>
                </summary>
                <div className="mb-1 ml-5 mt-1 border-l border-[#cfc1ad] pl-2">
                  {entry.items.map((surface) => {
                    const IconChild = ICONS[surface.icon];
                    const locked = Boolean(surface.feature && !planHasFeature(plan, surface.feature));
                    const badge = surface.badge === "notifications" ? unreadNotifications || 0 : 0;
                    return <NavItem key={surface.id} href={surface.realHref} icon={<IconChild size={15} strokeWidth={1.5} />} locked={locked} badge={badge} nested>{surface.label}</NavItem>;
                  })}
                </div>
              </details>
            );
          })}
        </nav>
        <div className="mx-2 mt-4 border-t border-[#d1c4b1] pt-4"><form action={signOut}><button type="submit" className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#675e53] transition hover:bg-[#f0e8dc] hover:text-[#292722]"><LogOut size={16} strokeWidth={1.6} className="text-[#8b7d69] group-hover:text-[#6d5b43]" />Cerrar sesión</button></form><div className="mt-4 border-t border-[#d1c4b1] pt-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#8c8377]">RevScale Systems</p><p className="mt-1 text-xs text-[#716a61]">Inteligencia comercial inmobiliaria</p></div></div>
      </aside>
      <main className="min-w-0 flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-[calc(3.75rem+env(safe-area-inset-top))] lg:pb-0 lg:pt-0">{children}</main>
    </div>
  );
}

function NavItem({ href, children, icon, locked = false, badge = 0, nested = false }: { href: string; children: ReactNode; icon?: ReactNode; locked?: boolean; badge?: number; nested?: boolean }) {
  return <Link href={href} className={`group flex items-center justify-between rounded-lg ${nested ? "px-2.5 py-2 text-[13px]" : "px-3 py-2.5 text-sm"} text-[#5f594f] transition hover:bg-[#f0e8dc] hover:text-[#292722]`}><span className="flex min-w-0 items-center gap-3"><span className="text-[#8b7d69] transition group-hover:text-[#6d5b43]">{icon}</span><span>{children}</span></span><span className="flex items-center gap-2">{badge > 0 && <span className="min-w-5 rounded-full bg-[#6f5c40] px-1.5 py-0.5 text-center text-[10px] font-bold text-[#fffaf2]">{badge > 99 ? "99+" : badge}</span>}{locked && <span className="text-xs text-[#8c8377]">•</span>}</span></Link>;
}
