import type { ProductSurface, ProductSurfaceIcon } from "@/lib/product-surfaces"

type NavigationStructureItem =
  | { kind: "item"; id: string }
  | { kind: "group"; id: string; label: string; icon: ProductSurfaceIcon; items: string[] }

export type NavigationEntry =
  | { kind: "item"; item: ProductSurface }
  | { kind: "group"; id: string; label: string; icon: ProductSurfaceIcon; items: ProductSurface[] }

const NAVIGATION_STRUCTURE: NavigationStructureItem[] = [
  { kind: "item", id: "dashboard" },
  { kind: "item", id: "onboarding" },
  { kind: "item", id: "today" },
  { kind: "item", id: "leads" },
  { kind: "item", id: "pipeline" },
  { kind: "item", id: "properties" },
  {
    kind: "group",
    id: "commercial-activity",
    label: "Actividad comercial",
    icon: "ClipboardList",
    items: ["calendar", "notifications", "interactions", "followups"],
  },
  {
    kind: "group",
    id: "whatsapp-business",
    label: "WhatsApp Business",
    icon: "MessageCircle",
    items: ["inbox", "whatsapp"],
  },
  {
    kind: "group",
    id: "commercial-operations",
    label: "Operación comercial",
    icon: "Workflow",
    items: ["automations", "nurturing", "reactivation", "commissions"],
  },
  {
    kind: "group",
    id: "portfolio-acquisition",
    label: "Cartera y captación",
    icon: "Building2",
    items: ["distribution", "territories", "developments"],
  },
  {
    kind: "group",
    id: "documents-legal",
    label: "Documentos y legal",
    icon: "ClipboardList",
    items: ["documents", "legal-automations"],
  },
  {
    kind: "group",
    id: "team",
    label: "Equipo",
    icon: "UsersRound",
    items: ["agents", "teams"],
  },
  {
    kind: "group",
    id: "direction-analysis",
    label: "Dirección y análisis",
    icon: "BarChart3",
    items: ["executive", "performance", "monthly", "marketing-roi", "reports", "analytics"],
  },
  {
    kind: "group",
    id: "administration",
    label: "Administración",
    icon: "Settings",
    items: ["imports", "integrations", "billing", "settings"],
  },
]

export function buildNavigationEntries(surfaces: ProductSurface[]): NavigationEntry[] {
  const byId = new Map(surfaces.map((surface) => [surface.id, surface]))
  const used = new Set<string>()
  const entries: NavigationEntry[] = []

  for (const entry of NAVIGATION_STRUCTURE) {
    if (entry.kind === "item") {
      const item = byId.get(entry.id)
      if (!item) continue
      used.add(item.id)
      entries.push({ kind: "item", item })
      continue
    }

    const items = entry.items
      .map((id) => byId.get(id))
      .filter((item): item is ProductSurface => Boolean(item))

    if (items.length === 0) continue
    for (const item of items) used.add(item.id)

    if (items.length === 1) {
      entries.push({ kind: "item", item: items[0] })
      continue
    }

    entries.push({ kind: "group", id: entry.id, label: entry.label, icon: entry.icon, items })
  }

  for (const surface of surfaces) {
    if (!used.has(surface.id)) entries.push({ kind: "item", item: surface })
  }

  return entries
}
