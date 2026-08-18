import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  activatePlan,
  rejectPlan,
  suspendOrganization,
  reactivateOrganization,
} from "./actions";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/auth/login");

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!platformAdmin) redirect("/protected");

  const { data: requests } = await supabase
    .from("plan_requests")
    .select("id,name,company,email,phone,plan,status,organization_id,created_at")
    .order("created_at", { ascending: false });

  const organizationIds = Array.from(
    new Set((requests || []).map((request) => request.organization_id).filter(Boolean))
  ) as string[];

  const { data: subscriptions } = organizationIds.length
    ? await supabase
        .from("subscriptions")
        .select("organization_id,plan,status")
        .in("organization_id", organizationIds)
    : { data: [] as Array<{ organization_id: string; plan: string; status: string }> };

  const subscriptionByOrganization = new Map(
    (subscriptions || []).map((subscription) => [subscription.organization_id, subscription])
  );

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">👑 Admin RevScale</h1>
        <p className="mt-2 text-slate-400">Gestión de clientes, activaciones y suspensiones.</p>

        {params.success && (
          <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-emerald-200">
            ✅ {params.success}
          </div>
        )}

        {params.error && (
          <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-200">
            ⚠️ {params.error}
          </div>
        )}

        <section className="mt-8 space-y-5">
          {requests?.map((request) => {
            const subscription = request.organization_id
              ? subscriptionByOrganization.get(request.organization_id)
              : null;
            const suspended = subscription?.status === "SUSPENDED";

            return (
              <div key={request.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold">🏢 {request.company}</h2>
                  {request.status === "ACTIVE" && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        suspended
                          ? "bg-amber-400/10 text-amber-300"
                          : "bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      {suspended ? "SUSPENDIDA" : "ACTIVA"}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-slate-300">
                  <p>👤 {request.name}</p>
                  <p>📧 {request.email}</p>
                  <p>📱 {request.phone}</p>
                  <p>
                    💳 Plan: <span className="text-blue-400">{subscription?.plan || request.plan}</span>
                  </p>
                  <p>Solicitud: {request.status}</p>
                  {subscription && <p>Cuenta: {subscription.status}</p>}
                  {!request.organization_id && request.status === "PENDING" && (
                    <p className="text-blue-300">
                      Al activar, RevScale vincula automáticamente la cuenta y la inmobiliaria usando este email.
                    </p>
                  )}
                </div>

                {request.status === "PENDING" && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <form action={activatePlan}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <button className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-white hover:bg-green-400">
                        ✅ Activar
                      </button>
                    </form>

                    <form action={rejectPlan}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <button className="rounded-xl bg-red-500/20 px-5 py-3 font-semibold text-red-300">
                        ❌ Rechazar
                      </button>
                    </form>
                  </div>
                )}

                {request.status === "ACTIVE" && request.organization_id && (
                  <div className="mt-6">
                    {suspended ? (
                      <form action={reactivateOrganization}>
                        <input type="hidden" name="organization_id" value={request.organization_id} />
                        <button className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-400">
                          ▶️ Reactivar cuenta
                        </button>
                      </form>
                    ) : (
                      <form action={suspendOrganization}>
                        <input type="hidden" name="organization_id" value={request.organization_id} />
                        <button className="rounded-xl bg-amber-500/20 px-5 py-3 font-semibold text-amber-300 hover:bg-amber-500/30">
                          ⏸️ Suspender cuenta
                        </button>
                        <p className="mt-2 text-xs text-slate-500">
                          Conserva usuarios, leads, propiedades, historial y configuración para una futura reactivación.
                        </p>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!requests?.length && (
            <div className="rounded-2xl border border-white/10 p-8 text-center text-slate-400">
              No hay solicitudes todavía.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
