"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  BarChart3,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardList,
  House,
  MessageSquareText,
  Settings,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react"
import { DEMO_COMPANY } from "@/lib/demo-data"

const NAV_ITEMS = [
  { href: "/demo", label: "Resumen", icon: House },
  { href: "/demo/leads", label: "Leads", icon: Users },
  { href: "/demo/pipeline", label: "Pipeline", icon: Workflow },
  { href: "/demo/properties", label: "Propiedades", icon: Building2 },
  { href: "/demo/interactions", label: "Interacciones", icon: MessageSquareText },
  { href: "/demo/followups", label: "Seguimientos", icon: ClipboardList },
  { href: "/demo/agents", label: "Equipo", icon: Sparkles },
  { href: "/demo/reports", label: "Reportes", icon: BarChart3 },
  { href: "/demo/analytics", label: "Analítica", icon: ChartNoAxesCombined },
  { href: "/demo/settings", label: "Configuración", icon: Settings },
]

function isActive(pathname: string, href: string) {
  if (href === "/demo") return pathname === "/demo"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DemoSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[#302d26] bg-[#171612]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <span className="font-serif text-lg text-[#f5efe4]">RevScale</span>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b49a6b]">
            PropertyOS
          </span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-[#3a362d] px-3 py-1.5 text-sm text-[#c8c1b4]"
          aria-label="Abrir menú"
        >
          Menú
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/65 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-50 flex h-screen w-72 flex-col border-r border-[#302d26] bg-[#171612] px-5 py-6 transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-2">
          <p className="font-serif text-[1.45rem] leading-none tracking-tight text-[#f5efe4]">
            RevScale
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b49a6b]">
            PropertyOS
          </p>
        </div>

        <div className="mx-2 mt-7 border-y border-[#302d26] py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f7a71]">
            Cartera demostración
          </p>
          <p className="mt-2 text-sm font-medium text-[#ede6da]">{DEMO_COMPANY.name}</p>
          <p className="mt-1 text-xs text-[#8f8a80]">{DEMO_COMPANY.market}</p>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[#242119] text-[#f5efe4]"
                    : "text-[#aaa49a] hover:bg-[#1f1d18] hover:text-[#ece5d9]"
                }`}
              >
                <Icon size={16} strokeWidth={1.6} className={active ? "text-[#c7ad7c]" : "text-[#777269]"} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={14} className="text-[#6f685b]" />}
              </Link>
            )
          })}
        </nav>

        <div className="mx-2 mt-6 border-t border-[#302d26] pt-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#68635b]">RevScale Systems</p>
          <p className="mt-1 text-xs text-[#8b867d]">Inteligencia comercial inmobiliaria</p>
        </div>
      </aside>
    </>
  )
}
