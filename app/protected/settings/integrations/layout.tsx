import type { ReactNode } from "react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { currentPlanHasFeature } from "@/lib/plan-access";

export default async function IntegrationsLayout({ children }: { children: ReactNode }) {
  const allowed = await currentPlanHasFeature("integrations");

  if (!allowed) {
    return (
      <UpgradePlanGate
        title="Integraciones"
        description="Las conexiones con canales externos y automatizaciones avanzadas están disponibles en el plan Enterprise."
        requiredPlan="Enterprise"
      />
    );
  }

  return children;
}
