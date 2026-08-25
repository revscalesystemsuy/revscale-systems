import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { normalizePlan } from "@/lib/plan-access";

const FEATURES = {
  TRIAL: ["Dashboard comercial", "Gestión básica de leads"],
  STARTER: ["Dashboard comercial", "Gestión de leads", "Follow-ups", "Hasta 3 agentes", "Hasta 500 leads", "Hasta 100 propiedades"],
  PROFESSIONAL: ["Todo Starter", "Hasta 15 agentes", "Leads ilimitados", "Matching IA", "Analytics avanzado", "Reportes comerciales", "WhatsApp IA"],
  ENTERPRISE: ["Todo Professional", "Hasta 30 agentes", "Equipos y sucursales", "Roles Director, Gerente y Agente", "Asignación automática de leads", "Integraciones avanzadas", "WhatsApp IA con operación por equipos", "Soporte prioritario"],
} as const;

const PAID_PLANS = [
  { name: "STARTER", label: "Starter", monthly: 99, annual: 990, maxAgents: 3, maxLeads: 500, maxProperties: 100 },
  { name: "PROFESSIONAL", label: "Professional", monthly: 249, annual: 2490, maxAgents: 15, maxLeads: 1000000, maxProperties: 1000000 },
  { name: "ENTERPRISE", label: "Enterprise", monthly: 499, annual: 4990, maxAgents: 30, maxLeads: 1000000, maxProperties: 1000000 },
] as const;

type BillingCycle = "MONTHLY" | "ANNUAL";

type PageProps = {
  searchParams: Promise<{ change?: string; error?: string }>;
};

export default async function BillingPage({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) redirect("/protected");

  const [{ data: subscription }, { count: agentsCount }, { count: leadsCount }, { count: propertiesCount }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan,status,max_agents,max_leads,max_properties,billing_cycle,billing_provider,current_period_end,cancel_at_period_end,last_payment_status")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("status", "ACTIVE"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
  ]);

  const { data: latestChange } = membership.role === "OWNER"
    ? await supabase
        .from("subscription_change_requests")
        .select("id,from_plan,to_plan,from_billing_cycle,to_billing_cycle,status,error_text,created_at,processed_at")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const plan = normalizePlan(subscription?.plan);
  const currentCycle: BillingCycle = subscription?.billing_cycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const canSelfManage = membership.role === "OWNER" && subscription?.status === "ACTIVE" && subscription?.billing_provider === "PADDLE";
  const changeInProgress = latestChange?.status === "PENDING" || latestChange?.status === "PROCESSING";
  const displayMax = (value?: number | null) => !value || value >= 1000000 ? "Ilimitado" : String(value);
  const cycleLabel = subscription?.billing_cycle === "ANNUAL" ? "Anual" : subscription?.billing_cycle === "MONTHLY" ? "Mensual" : "Manual / sin ciclo";
  const renewalDate = subscription?.current_period_end ? new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(subscription.current_period_end)) : "—";

  async function requestPlanChange(formData: FormData) {
    "use server";
    const serverSupabase = await createClient();
    const targetPlan = String(formData.get("plan") || "").toUpperCase();
    const targetCycle = String(formData.get("billing_cycle") || "MONTHLY").toUpperCase() === "ANNUAL" ? "ANNUAL" : "MONTHLY";

    const { data: requestId, error } = await serverSupabase.rpc("request_subscription_change", {
      p_plan: targetPlan,
      p_billing_cycle: targetCycle,
    });

    if (error || !requestId) {
      redirect(`/protected/billing?error=${encodeURIComponent(error?.message || "No se pudo crear la solicitud de cambio")}`);
    }

    const { error: invokeError } = await serverSupabase.functions.invoke("paddle-change-subscription", {
      body: { request_id: requestId },
    });

    if (invokeError) {
      await serverSupabase.rpc("cancel_pending_subscription_change", { p_request_id: requestId });
      redirect(`/protected/billing?error=${encodeURIComponent("No se pudo iniciar el cambio en Paddle. Podés volver a intentarlo.")}`);
    }

    redirect("/protected/billing?change=processing");
  }

  return (
    <main className="min-h-screen bg-[#eee5d7] p-6 text-[#292722] md:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#927a58]">Suscripción</p>
        <h1 className="mt-3 font-serif text-4xl font-medium">Mi Plan</h1>
        <p className="mt-2 text-[#6f685f]">Administración de tu suscripción, renovación y límites de uso.</p>

        {params.change === "processing" && (
          <div className="mt-6 rounded-xl border border-[#b9aa91] bg-[#e8ddcd] p-4 text-sm text-[#5f5344]">El cambio fue enviado a Paddle. RevScale actualizará el plan cuando llegue la confirmación del proveedor.</div>
        )}
        {params.error && (
          <div className="mt-6 rounded-xl border border-[#d4aaa2] bg-[#f4e4df] p-4 text-sm text-[#874d44]">{params.error}</div>
        )}

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6 shadow-[0_18px_50px_rgba(70,58,42,.05)] md:p-8">
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

        {latestChange && (
          <section className="mt-6 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#927a58]">Último cambio</p>
                <p className="mt-2 font-medium text-[#3d382f]">{latestChange.from_plan} → {latestChange.to_plan} · {latestChange.to_billing_cycle === "ANNUAL" ? "Anual" : "Mensual"}</p>
              </div>
              <span className="rounded-full border border-[#cdbfa9] px-3 py-1.5 text-xs font-semibold text-[#625642]">{latestChange.status}</span>
            </div>
            {latestChange.status === "FAILED" && <p className="mt-3 text-sm text-[#8a5148]">{latestChange.error_text || "El cambio no pudo completarse."}</p>}
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-[#d3c6b3] bg-[#f7f0e6] p-6 md:p-8">
          <h2 className="font-serif text-2xl">Incluye tu plan</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{FEATURES[plan].map((feature) => <p key={feature} className="text-[#5f594f]">{feature}</p>)}</div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#927a58]">Cambiar suscripción</p>
            <h2 className="mt-2 font-serif text-3xl">Planes disponibles</h2>
            <p className="mt-2 text-sm text-[#716a61]">Los cambios conservan la suscripción actual de Paddle. Si bajás de plan, RevScale valida antes que tu uso entre dentro de los nuevos límites.</p>
          </div>

          {!canSelfManage && (
            <div className="mb-5 rounded-xl border border-[#d3c6b3] bg-[#e9dfd1] p-4 text-sm text-[#655e54]">
              {membership.role !== "OWNER" ? "Solo el Director de la organización puede cambiar el plan." : "Esta suscripción no está administrada por Paddle. Los cambios deben gestionarse desde administración."}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            {PAID_PLANS.map((option) => {
              const overLimits = (agentsCount || 0) > option.maxAgents || (leadsCount || 0) > option.maxLeads || (propertiesCount || 0) > option.maxProperties;
              return (
                <article key={option.name} className={`rounded-2xl border p-6 ${option.name === plan ? "border-[#a99270] bg-[#e5d7c3]" : "border-[#d3c6b3] bg-[#f7f0e6]"}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#927a58]">{option.name}</p>
                  <h3 className="mt-3 font-serif text-3xl">{option.label}</h3>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-3"><p className="text-[#81796e]">Mensual</p><p className="mt-1 font-semibold">USD {option.monthly}</p></div>
                    <div className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-3"><p className="text-[#81796e]">Anual</p><p className="mt-1 font-semibold">USD {option.annual}</p></div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-[#746d63]">Hasta {option.maxAgents} agentes · {option.maxLeads >= 1000000 ? "Leads ilimitados" : `${option.maxLeads} leads`} · {option.maxProperties >= 1000000 ? "Propiedades ilimitadas" : `${option.maxProperties} propiedades`}</p>

                  {overLimits && <p className="mt-4 rounded-lg bg-[#efe1d8] p-3 text-xs text-[#87594d]">Tu uso actual supera los límites de este plan.</p>}

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {(["MONTHLY", "ANNUAL"] as BillingCycle[]).map((cycle) => {
                      const isCurrent = option.name === plan && cycle === currentCycle;
                      const disabled = !canSelfManage || changeInProgress || overLimits || isCurrent;
                      return (
                        <form action={requestPlanChange} key={cycle}>
                          <input type="hidden" name="plan" value={option.name} />
                          <input type="hidden" name="billing_cycle" value={cycle} />
                          <button disabled={disabled} className="w-full rounded-lg border border-[#b9aa94] px-3 py-2.5 text-xs font-semibold text-[#403a32] transition hover:bg-[#e9dece] disabled:cursor-not-allowed disabled:opacity-40">
                            {isCurrent ? "Actual" : cycle === "ANNUAL" ? "Elegir anual" : "Elegir mensual"}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
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
