"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

async function requirePortalOwner() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.role !== "OWNER") throw new Error("Solo Dirección puede conectar credenciales de portales.");
  if (!planHasFeature(context.plan, "integrations")) throw new Error("Las conexiones LIVE con portales requieren Enterprise.");
  return context;
}

export async function startMercadoLibreConnection() {
  const context = await requirePortalOwner();
  const { data, error } = await context.supabase.functions.invoke("portal-connect", {
    body: { provider: "MERCADOLIBRE", action: "start" },
  });
  if (error) throw new Error(error.message || "No se pudo iniciar la conexión con Mercado Libre.");
  if (data?.error) throw new Error(String(data.error));
  const authorizationUrl = String(data?.authorization_url || "");
  if (!authorizationUrl.startsWith("https://auth.mercadolibre.com.uy/")) throw new Error("El proveedor no devolvió una URL de autorización válida.");
  redirect(authorizationUrl);
}

export async function disconnectMercadoLibre() {
  const context = await requirePortalOwner();
  const { data, error } = await context.supabase.functions.invoke("portal-connect", {
    body: { provider: "MERCADOLIBRE", action: "disconnect" },
  });
  if (error) throw new Error(error.message || "No se pudo desconectar Mercado Libre.");
  if (data?.error) throw new Error(String(data.error));
  revalidatePath("/protected/settings/integrations");
  revalidatePath("/protected/distribution");
  revalidatePath("/protected/distribution/mercadolibre");
}
