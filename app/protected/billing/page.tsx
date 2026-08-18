import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { normalizePlan } from "@/lib/plan-access";

const FEATURES = {
  TRIAL: ["Dashboard comercial", "Gestión básica de leads"],
  STARTER: ["Dashboard comercial", "Gestión de leads", "Follow-ups", "Hasta 3 agentes", "Hasta 500 leads", "Hasta 100 propiedades"],
  PROFESSIONAL: ["Todo Starter", "Hasta 15 agentes", "Leads ilimitados", "Matching IA", "Analytics avanzado", "Reportes comerciales"],
  ENTERPRISE: [
    "Todo Professional",
    "Agentes ilimitados",
    "Equipos y sucursales",
    "Roles Director, Gerente y Agente",
    "Asignación automática de leads",
    "Integraciones avanzadas",
    "Soporte prioritario",
  ],
};

export default async function BillingPage() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!membership) redirect("/protected");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,max_agents,max_leads,max_properties")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  const plan = normalizePlan(subscription?.plan);

  const [{ count: agentsCount }, { count: leadsCount }, { count: propertiesCount }] = await Promise.all([
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("status", "ACTIVE"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
  ]);

  const displayMax = (value?: number | null) => !value || value >= 1000000 ? "Ilimitado" : String(value);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Mi Plan</h1>
        <p className="mt-2 text-slate-400">Administración de tu suscripción y límites de uso.</p>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Plan actual</p>
              <h2 className="mt-2 text-4xl font-bold text-blue-400">{plan}</h2>
            </div>
            <span className="rounded-full bg-green-500/10 px-4 py-2 text-green-400">{subscription?.status || "INACTIVE"}</span>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <UsageCard title="Agentes activos" current={agentsCount || 0} max={displayMax(subscription?.max_agents)} />
            <UsageCard title="Leads" current={leadsCount || 0} max={displayMax(subscription?.max_leads)} />
            <UsageCard title="Propiedades" current={propertiesCount || 0} max={displayMax(subscription?.max_properties)} />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-xl font-semibold">Incluye tu plan</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {FEATURES[plan].map((feature) => (
              <p key={feature} className="text-slate-300">✓ {feature}</p>
            ))}
          </div>
        </section>

        {plan !== "ENTERPRISE" && (
          <Link href="/pricing" className="mt-8 inline-block rounded-xl bg-blue-500 px-6 py-3 font-semibold hover:bg-blue-400">
            Mejorar plan
          </Link>
        )}
      </div>
    </main>
  );
}

function UsageCard({ title, current, max }: { title: string; current: number; max: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-5">
      <p className="text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-bold">{current}</p>
      <p className="mt-1 text-sm text-slate-500">Límite: {max}</p>
    </div>
  );
}
