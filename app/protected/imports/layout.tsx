import { ReactNode } from "react";
import { requireEnterpriseRole } from "@/lib/organization-role";

export default async function ImportsLayout({ children }: { children: ReactNode }) {
  await requireEnterpriseRole(["OWNER", "MANAGER"]);
  return children;
}
