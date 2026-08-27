import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Activity, Building2, CircleAlert, CircleCheck, PauseCircle, PlayCircle, ShieldCheck, UserRound } from "lucide-react";
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

  const linkedOrganizations = organizationIds.length;
  const activeOrganizations = (subscriptions || []).filter((subscription) => subscription.status === "ACTIVE").length;
  const pendingRequests = (requests || []).filter((request) => request.status === "PENDING").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Operación interna</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Admin RevScale</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Gestión de clientes, activaciones, suspensiones y preparación operativa para pilotos reales.</p>
          </div>
          <Link href="/protected/admin/pilots" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2]">
            <Activity size={16}/> Pilot readiness
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat label="Organizaciones" value={linkedOrganizations} detail="solicitudes ya vinculadas" />
          <Stat label="Activas" value={activeOrganizations} detail="suscripciones operativas" />
          <Stat label="Pendientes" value={pendingRequests} detail="requieren decisión" />
        </section>

        {params.success && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {params.success}
          </div>
        )}

        {params.error && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {params.error}
          </div>
        )}

        <section className="mt-8 space-y-5">
          {requests?.map((request) => {
            const subscription = request.organization_id
              ? subscriptionByOrganization.get(request.organization_id)
              : null;
            const suspended = subscription?.status === "SUSPENDED";

            return (
              <article key={request.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_14px_38px_rgba(72,58,40,0.04)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><Building2 size={18}/></span>
                    <div><h2 className="font-serif text-2xl font-medium">{request.company}</h2><p className="mt-1 text-xs text-[#81786d]">Solicitud {request.status}</p></div>
                  </div>
                  {request.status === "ACTIVE" && (
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${suspended ? "border-[#d7b993] bg-[#efe1ce] text-[#785b37]" : "border-[#aab89b] bg-[#e4e8dc] text-[#536048]"}`}>
                      {suspended ? "Suspendida" : "Activa"}
                    </span>
                  )}
                </div>

                <div className="mt-5 grid gap-3 text-sm text-[#625d55] md:grid-cols-2 lg:grid-cols-4">
                  <Info icon={<UserRound size={15}/>} label="Contacto" value={request.name}/>
                  <Info label="Email" value={request.email}/>
                  <Info label="Teléfono" value={request.phone}/>
                  <Info label="Plan" value={subscription?.plan || request.plan}/>
                </div>

                {!request.organization_id && request.status === "PENDING" && (
                  <p className="mt-4 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] p-3 text-xs leading-5 text-[#665f56]">Al activar, RevScale vincula automáticamente la cuenta y la inmobiliaria usando este email.</p>
                )}

                {request.status === "PENDING" && (
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-[#ded2c1] pt-4">
                    <form action={activatePlan}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <button className="inline-flex items-center gap-2 rounded-lg bg-[#657052] px-5 py-3 text-sm font-semibold text-white"><CircleCheck size={15}/> Activar</button>
                    </form>
                    <form action={rejectPlan}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <button className="inline-flex items-center gap-2 rounded-lg border border-[#d9b7aa] bg-[#f4e4dc] px-5 py-3 text-sm font-semibold text-[#7b4539]"><CircleAlert size={15}/> Rechazar</button>
                    </form>
                  </div>
                )}

                {request.status === "ACTIVE" && request.organization_id && (
                  <div className="mt-6 flex flex-col gap-3 border-t border-[#ded2c1] pt-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#716a61]"><ShieldCheck size={14}/> La cuenta conserva datos e historial ante una suspensión.</div>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/protected/admin/pilots" className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5f513e]">Revisar readiness</Link>
                      {suspended ? (
                        <form action={reactivateOrganization}>
                          <input type="hidden" name="organization_id" value={request.organization_id} />
                          <button className="inline-flex items-center gap-2 rounded-lg bg-[#657052] px-4 py-2.5 text-sm font-semibold text-white"><PlayCircle size={15}/> Reactivar cuenta</button>
                        </form>
                      ) : (
                        <form action={suspendOrganization}>
                          <input type="hidden" name="organization_id" value={request.organization_id} />
                          <button className="inline-flex items-center gap-2 rounded-lg border border-[#d7b993] bg-[#efe1ce] px-4 py-2.5 text-sm font-semibold text-[#785b37]"><PauseCircle size={15}/> Suspender cuenta</button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {!requests?.length && (
            <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">No hay solicitudes todavía.</div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, detail }: { label: string; value: number; detail: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7a67]">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div> }
function Info({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) { return <div className="rounded-lg border border-[#ddd1c0] bg-[#fffaf2] p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{icon}{label}</p><p className="mt-1 break-words font-medium text-[#403b34]">{value || "—"}</p></div> }
