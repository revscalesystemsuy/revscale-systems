import type { ReactNode } from "react"
import { DemoSidebar } from "./demo-sidebar"

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#13120f] text-[#f5efe4] lg:flex">
      <DemoSidebar />
      <main className="min-w-0 flex-1 pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
