import type { ReactNode } from "react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { currentPlanHasFeature } from "@/lib/plan-access";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  const allowed = await currentPlanHasFeature("reports");

  if (!allowed) {
    return (
      <UpgradePlanGate
        title="Reportes comerciales"
        description="Los reportes comerciales están disponibles desde el plan Professional para analizar oportunidades, actividad y resultados del equipo."
        requiredPlan="Professional"
      />
    );
  }

  return children;
}
