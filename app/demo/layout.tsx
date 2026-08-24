import type { ReactNode } from "react"
import { Suspense } from "react"
import { DemoSidebar } from "./demo-sidebar"

function DemoSidebarFallback() {
  return <aside className="hidden h-screen w-72 shrink-0 border-r border-[#d7cbb9] bg-[#e8dece] lg:block" />
}

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eee5d7] text-[#292722] lg:flex">
      <Suspense fallback={<DemoSidebarFallback />}>
        <DemoSidebar />
      </Suspense>
      <main className="min-w-0 flex-1 pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
