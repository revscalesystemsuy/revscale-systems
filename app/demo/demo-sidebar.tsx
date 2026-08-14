"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { DEMO_COMPANY } from "@/lib/demo-data"

const NAV_ITEMS = [
  { href: "/demo", label: "Dashboard" },
  { href: "/demo/leads", label: "Leads" },
  { href: "/demo/pipeline", label: "Pipeline" },
  { href: "/demo/properties", label: "Propiedades" },
  { href: "/demo/interactions", label: "Interacciones" },
  { href: "/demo/followups", label: "Follow-ups" },
  { href: "/demo/agents", label: "Agentes" },
  { href: "/demo/reports", label: "Reportes" },
  { href: "/demo/analytics", label: "Analytics" },
  { href: "/demo/settings", label: "Configuración" },
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
      {/* Barra superior móvil */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="text-lg font-bold">
          RevScale <span className="text-blue-400">PropertyOS</span>
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
          aria-label="Abrir menú"
        >
          Menú
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-50 flex h-screen w-72 flex-col border-r border-white/10 bg-slate-950 p-6 transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h1 className="text-xl font-bold">
          <span className="text-white">RevScale</span>{" "}
          <span className="text-blue-400">PropertyOS</span>
        </h1>

        <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
            Modo Demo
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {DEMO_COMPANY.name}
          </p>
          <p className="text-xs text-slate-400">{DEMO_COMPANY.market}</p>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-blue-500/15 font-semibold text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6 border-t border-white/10 pt-5 text-sm text-slate-500">
          RevScale Systems
          <br />
          PropertyOS · Demo comercial
        </div>
      </aside>
    </>
  )
}
