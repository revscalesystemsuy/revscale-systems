import type { ReactNode } from "react"
import { DemoSidebar } from "./demo-sidebar"

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <DemoSidebar />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
