import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { activatePlan, rejectPlan } from "./actions";

export default async function AdminPage() {
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

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("plan_requests")
    .select("id,name,company,email,phone,plan,status,organization_id,created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">👑 Admin RevScale</h1>
        <p className="mt-2 text-slate-400">Gestión de clientes y activaciones.</p>

        <section className="mt-8 space-y-5">
          {requests?.map((request) => (
            <div key={request.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">🏢 {request.company}</h2>

              <div className="mt-4 space-y-2 text-slate-300">
                <p>👤 {request.name}</p>
                <p>📧 {request.email}</p>
                <p>📱 {request.phone}</p>
                <p>
                  💳 Plan: <span className="text-blue-400">{request.plan}</span>
                </p>
                <p>Estado: {request.status}</p>
                {!request.organization_id && request.status === "PENDING" && (
                  <p className="text-amber-300">
                    Falta vincular esta solicitud a una organización antes de activarla.
                  </p>
                )}
              </div>

              {request.status === "PENDING" && (
                <div className="mt-6 flex gap-3">
                  <form action={activatePlan}>
                    <input type="hidden" name="request_id" value={request.id} />
                    <button
                      disabled={!request.organization_id}
                      className="rounded-xl bg-green-500 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                    >
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
            </div>
          ))}

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
