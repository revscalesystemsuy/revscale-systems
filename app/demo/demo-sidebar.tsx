"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useState } from "react"
import {
  BarChart3,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardList,
  House,
  MessageCircle,
  MessageSquareText,
  Settings,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react"
import { DEMO_COMPANY } from "@/lib/demo-data"
import { DEMO_PLAN_CONFIG, demoHref, normalizeDemoPlan, type DemoPlan } from "@/lib/demo-plan"

type DemoNavItem = {
  href: string
  label: string
  icon: typeof House
  plans: readonly DemoPlan[]
}

const ALL_PLANS: readonly DemoPlan[] = ["starter", "professional", "enterprise"]

const NAV_ITEMS: readonly DemoNavItem[] = [
  { href: "/demo", label: "Resumen", icon: House, plans: ALL_PLANS },
  { href: "/demo/leads", label: "Leads", icon: Users, plans: ALL_PLANS },
  { href: "/demo/pipeline", label: "Pipeline", icon: Workflow, plans: ALL_PLANS },
  { href: "/demo/properties", label: "Propiedades", icon: Building2, plans: ALL_PLANS },
  { href: "/demo/interactions", label: "Interacciones", icon: MessageSquareText, plans: ALL_PLANS },
  { href: "/demo/followups", label: "Seguimientos", icon: ClipboardList, plans: ALL_PLANS },
  { href: "/demo/whatsapp", label: "WhatsApp IA", icon: MessageCircle, plans: ["professional", "enterprise"] },
  { href: "/demo/agents", label: "Agentes", icon: Users, plans: ALL_PLANS },
  { href: "/demo/teams", label: "Equipos", icon: UsersRound, plans: ["enterprise"] },
  { href: "/demo/reports", label: "Reportes", icon: BarChart3, plans: ["professional", "enterprise"] },
  { href: "/demo/analytics", label: "Analítica", icon: ChartNoAxesCombined, plans: ["professional", "enterprise"] },
  { href: "/demo/settings", label: "Configuración", icon: Settings, plans: ALL_PLANS },
]

function isActive(pathname: string, href: string) {
  if (href === "/demo") return pathname === "/demo"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DemoSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const planKey = normalizeDemoPlan(searchParams.get("plan"))
  const config = DEMO_PLAN_CONFIG[planKey]
  const visibleItems = NAV_ITEMS.filter((item) => item.plans.includes(planKey))

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[#d8ccbb] bg-[#f4ecdf]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <span className="font-serif text-lg text-[#2c2923]">RevScale</span>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">PropertyOS</span>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="rounded-md border border-[#cfc1ad] px-3 py-1.5 text-sm text-[#4f4a42]" aria-label="Abrir menú">Menú</button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-[#2e2a24]/35 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside className={`fixed z-50 flex h-screen w-72 flex-col border-r border-[#d7cbb9] bg-[#e8dece] px-5 py-6 transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-2">
          <p className="font-serif text-[1.45rem] leading-none tracking-tight text-[#2e2a24]">RevScale</p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a714d]">PropertyOS</p>
        </div>

        <div className="mx-2 mt-7 border-y border-[#d1c4b1] py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#665f56]">Demo seleccionada</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#37332d]">{config.label}</p>
            <Link href="/demos" className="text-[11px] font-semibold text-[#7a6344] underline-offset-4 hover:underline">Cambiar</Link>
          </div>
          <p className="mt-2 text-xs text-[#665f56]">Hasta {config.maxAgents} agentes</p>
          <p className="mt-3 text-xs font-medium text-[#4b453d]">{DEMO_COMPANY.name}</p>
          <p className="mt-1 text-xs text-[#6b6359]">{DEMO_COMPANY.market}</p>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {visibleItems.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link key={item.href} href={demoHref(item.href, planKey)} onClick={() => setOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-[#d9c9b3] text-[#302b24]" : "text-[#665f56] hover:bg-[#dfd3c2] hover:text-[#302c26]"}`}>
                <Icon size={16} strokeWidth={1.6} className={active ? "text-[#7a6344]" : "text-[#756e64]"} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={14} className="text-[#745f43]" />}
              </Link>
            )
          })}
        </nav>

        <div className="mx-2 mt-6 border-t border-[#d1c4b1] pt-5">
          <Link href={`/pricing?plan=${config.paddlePlan}`} className="text-xs font-semibold text-[#5c5141] transition hover:text-[#2f2b25]">Contratar {config.label}</Link>
          <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#665f56]">RevScale Systems</p>
          <p className="mt-1 text-xs text-[#665f56]">Inteligencia comercial inmobiliaria</p>
        </div>
      </aside>
    </>
  )
}
