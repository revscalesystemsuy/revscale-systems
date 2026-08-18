import type { ReactNode } from "react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { currentPlanHasFeature } from "@/lib/plan-access";
import { requireEnterpriseRole } from "@/lib/organization-role";

export default async function AnalyticsLayout({ children }: { children: ReactNode }) {
  await requireEnterpriseRole(["OWNER", "MANAGER"]);
  const allowed = await currentPlanHasFeature("analytics");

  if (!allowed) {
    return (
      <UpgradePlanGate
        title="Analytics avanzado"
        description="El análisis avanzado del rendimiento comercial está disponible desde el plan Professional."
        requiredPlan="Professional"
      />
    );
  }

  return children;
}
