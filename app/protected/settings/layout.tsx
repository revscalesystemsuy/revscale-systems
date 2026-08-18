import { ReactNode } from "react";
import { requireEnterpriseRole } from "@/lib/organization-role";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireEnterpriseRole(["OWNER"]);
  return children;
}
