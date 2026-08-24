import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { normalizePlan } from "@/lib/plan-access";

const FEATURES = {
  TRIAL: ["Dashboard comercial", "Gestión básica de leads"],
  STARTER: ["Dashboard comercial", "Gestión de leads", "Follow-ups", "Hasta 3 agentes", "Hasta 500 leads", "Hasta 100 propiedades"],
  PROFESSIONAL: ["Todo Starter", "Hasta 15 agentes", "Leads ilimitados", "Matching IA", "Analytics avanzado", "Reportes comerciales", "WhatsApp IA"],
  ENTERPRISE: ["Todo Professional", "Hasta 30 agentes", "Equipos y sucursales", "Roles Director, Gerente y Agente", "Asignación automática de leads", "Integraciones avanzadas", "WhatsApp IA con operación por equipos", "Soporte prioritario"],
};

export default async function BillingPage() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", userId).single();
  if (!membership) redirect("/protected");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,max_agents,max_leads,max_properties,billing_cycle,billing_provider,current_period_end,cancel_at_period_end,last_payment_status")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  const plan = normalizePlan(subscription?.plan);
  const [{ count: agentsCount }, { count: leadsCount }, { count: propertiesCount }] = await Promise.all([
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("status", "ACTIVE"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
  ]);

  const displayMax = (value?: number | null) => !value || value >= 1000000 ? "Ilimitado" : String(value);
  const cycleLabel = subscription?.billing_cycle === "ANNUAL" ? "Anual" : subscription?.billing_cycle === "MONTHLY" ? "Mensual" : "Manual / sin ciclo";
  const renewalDate = subscription?.current_period_end ? new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(subscription.current_period_end)) : "—";

  return (
    <main className="min-h-screen bg-[#eee5d7] p-8 text-[#292722]">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#927a58]">Suscripción</p>
        <h1 className="mt-3 font-serif text-4xl font-medium">Mi Plan</h1>
        <p className="mt-2 text-[#6f685f]">Administración de tu suscripción, renovación y límites de uso.</p>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-8 shadow-[0_18px_50px_rgba(70,58,42,.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm text-[#81796e]">Plan actual</p><h2 className="mt-2 font-serif text-4xl text-[#3c342b]">{plan}</h2></div>
            <span className="rounded-full border border-[#cdbfa9] bg-[#eee4d5] px-4 py-2 text-sm font-semibold text-[#625642]">{subscription?.status || "INACTIVE"}</span>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-4">
            <InfoCard title="Facturación" value={cycleLabel} />
            <InfoCard title="Proveedor" value={subscription?.billing_provider || "Manual"} />
            <InfoCard title={subscription?.cancel_at_period_end ? "Finaliza" : "Próxima renovación"} value={renewalDate} />
            <InfoCard title="Último pago" value={subscription?.last_payment_status || "—"} />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <UsageCard title="Agentes activos" current={agentsCount || 0} max={displayMax(subscription?.max_agents)} />
            <UsageCard title="Leads" current={leadsCount || 0} max={displayMax(subscription?.max_leads)} />
            <UsageCard title="Propiedades" current={propertiesCount || 0} max={displayMax(subscription?.max_properties)} />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-8">
          <h2 className="font-serif text-2xl">Incluye tu plan</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{FEATURES[plan].map((feature) => <p key={feature} className="text-[#5f594f]">✓ {feature}</p>)}</div>
        </section>

        {plan === "STARTER" && <div className="mt-6 rounded-xl border border-[#d5c7ad] bg-[#eee2cf] p-5 text-sm text-[#655842]">WhatsApp IA se habilita desde Professional de USD 249/mes o USD 2.490/año.</div>}
        {plan !== "ENTERPRISE" && <Link href="/pricing" className="mt-8 inline-block rounded-xl bg-[#2f2b25] px-6 py-3 font-semibold text-[#fffaf2] hover:bg-[#1f1c18]">Mejorar plan</Link>}
      </div>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4"><p className="text-xs uppercase tracking-[0.12em] text-[#81796e]">{title}</p><p className="mt-2 font-medium text-[#3f3931]">{value}</p></div>;
}

function UsageCard({ title, current, max }: { title: string; current: number; max: string }) {
  return <div className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-5"><p className="text-[#716a61]">{title}</p><p className="mt-3 font-serif text-3xl">{current}</p><p className="mt-1 text-sm text-[#8a8379]">Límite: {max}</p></div>;
}
