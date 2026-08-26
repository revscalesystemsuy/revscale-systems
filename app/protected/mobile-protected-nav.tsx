"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, Building2, House, ListChecks, Menu, Settings, Target, Users, Workflow, X,
  ClipboardList, Zap, MessagesSquare, Database, UsersRound, BarChart3,
  ChartNoAxesCombined, MessageCircle, SlidersHorizontal, CreditCard, MapPinned,
} from "lucide-react";
import type { ProductSurfaceIcon } from "@/lib/product-surfaces";

const ICONS = { House, ListChecks, Target, ClipboardList, Bell, Users, Workflow, Zap, Building2, MessagesSquare, Database, UsersRound, BarChart3, ChartNoAxesCombined, MessageCircle, SlidersHorizontal, CreditCard, MapPinned, Settings } satisfies Record<ProductSurfaceIcon, typeof House>;

type Surface = { id: string; label: string; icon: ProductSurfaceIcon; realHref: string; badge?: string };

const QUICK_IDS = ["today", "leads", "pipeline", "properties", "notifications"];

export function MobileProtectedNav({ surfaces, unreadNotifications = 0, plan }: { surfaces: Surface[]; unreadNotifications?: number; plan: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const quick = QUICK_IDS.map((id) => surfaces.find((surface) => surface.id === id)).filter(Boolean) as Surface[];
  const active = (href: string) => href === "/protected" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return <>
    <div className="revscale-mobile-top fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[#d8ccbb] bg-[#f4ecdf]/95 px-4 py-3 backdrop-blur lg:hidden">
      <Link href="/protected" className="flex items-baseline gap-2"><span className="font-serif text-lg">RevScale</span><span className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#8a714d]">PropertyOS</span></Link>
      <button onClick={() => setOpen(true)} className="rounded-lg border border-[#cfc1ad] bg-[#f8f1e7] p-2 text-[#4f4a42]" aria-label="Abrir navegación"><Menu size={20}/></button>
    </div>

    {open && <button className="fixed inset-0 z-40 bg-[#2e2a24]/35 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar navegación"/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-80 flex-col border-r border-[#d7cbb9] bg-[#e8dece] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between"><div><p className="font-serif text-xl">RevScale</p><p className="mt-1 text-[9px] font-semibold uppercase tracking-[.2em] text-[#8a714d]">{plan}</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-2" aria-label="Cerrar menú"><X size={20}/></button></div>
      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">{surfaces.map((surface) => { const Icon = ICONS[surface.icon]; return <Link key={surface.id} href={surface.realHref} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm ${active(surface.realHref) ? "bg-[#d9c9b3] text-[#302b24]" : "text-[#625b52] hover:bg-[#dfd3c2]"}`}><span className="flex items-center gap-3"><Icon size={17} strokeWidth={1.6}/>{surface.label}</span>{surface.badge === "notifications" && unreadNotifications > 0 && <span className="rounded-full bg-[#6f5c40] px-2 py-0.5 text-[10px] font-bold text-[#fffaf2]">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</Link>})}</nav>
    </aside>

    <nav className="revscale-mobile-bottom fixed inset-x-0 bottom-0 z-30 grid border-t border-[#d2c5b3] bg-[#f7f0e6]/95 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" style={{gridTemplateColumns:`repeat(${Math.max(quick.length,1)}, minmax(0,1fr))`}}>
      {quick.map((surface) => { const Icon = ICONS[surface.icon]; const selected = active(surface.realHref); return <Link key={surface.id} href={surface.realHref} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] ${selected ? "text-[#302d28]" : "text-[#756e64]"}`}><span className="relative"><Icon size={20} strokeWidth={selected ? 2 : 1.6}/>{surface.badge === "notifications" && unreadNotifications > 0 && <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#f7f0e6] bg-[#8a5a4b]"/>}</span><span className="max-w-full truncate">{surface.label === "Qué hacer hoy" ? "Hoy" : surface.label}</span></Link>})}
    </nav>
  </>;
}
