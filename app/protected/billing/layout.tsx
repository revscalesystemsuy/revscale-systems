import { ReactNode } from "react";
import { requireEnterpriseRole } from "@/lib/organization-role";

export default async function BillingLayout({ children }: { children: ReactNode }) {
  await requireEnterpriseRole(["OWNER"]);
  return children;
}
