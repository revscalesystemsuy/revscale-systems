"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { demoHref, normalizeDemoPlan, type DemoPlan } from "@/lib/demo-plan"

const STORAGE_KEY = "revscale-demo-plan"

const ROUTE_PLANS: Array<{ prefix: string; plans: readonly DemoPlan[] }> = [
  { prefix: "/demo/whatsapp", plans: ["professional", "enterprise"] },
  { prefix: "/demo/reports", plans: ["professional", "enterprise"] },
  { prefix: "/demo/analytics", plans: ["professional", "enterprise"] },
  { prefix: "/demo/teams", plans: ["enterprise"] },
  { prefix: "/demo/integrations", plans: ["enterprise"] },
]

function routeAllowed(pathname: string, plan: DemoPlan) {
  const restriction = ROUTE_PLANS.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`))
  return !restriction || restriction.plans.includes(plan)
}

export function DemoPlanGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawPlan = searchParams.get("plan")

  useEffect(() => {
    if (rawPlan === "starter" || rawPlan === "professional" || rawPlan === "enterprise") {
      sessionStorage.setItem(STORAGE_KEY, rawPlan)
      if (!routeAllowed(pathname, rawPlan)) router.replace(demoHref("/demo", rawPlan))
      return
    }

    const remembered = sessionStorage.getItem(STORAGE_KEY)
    const plan = remembered === "starter" || remembered === "enterprise" || remembered === "professional"
      ? remembered
      : normalizeDemoPlan(rawPlan)

    if (remembered) {
      router.replace(demoHref(pathname, plan))
      return
    }

    if (!routeAllowed(pathname, plan)) router.replace(demoHref("/demo", plan))
  }, [pathname, rawPlan, router])

  return null
}
