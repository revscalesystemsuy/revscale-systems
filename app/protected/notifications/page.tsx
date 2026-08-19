import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  await supabase.rpc("refresh_my_commercial_notifications");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,type,priority,title,body,action_url,read_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const unread = (notifications || []).filter((item) => !item.read_at).length;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">Prioridades comerciales</p>
            <h1 className="mt-2 text-3xl font-bold">Notificaciones</h1>
            <p className="mt-2 text-slate-400">
              RevScale reúne asignaciones, leads HOT, follow-ups vencidos y oportunidades sin actividad.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Las alertas comerciales se actualizan automáticamente cada 15 minutos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-center">
              <p className="text-xs text-slate-500">Sin leer</p>
              <p className="mt-1 text-2xl font-bold text-blue-300">{unread}</p>
            </div>
            {unread > 0 && (
              <form action={markAllNotificationsRead}>
                <button className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/5">
                  Marcar todas como leídas
                </button>
              </form>
            )}
          </div>
        </div>

        <section className="mt-8 space-y-3">
          {(notifications || []).map((notification) => {
            const unreadItem = !notification.read_at;
            const high = notification.priority === "HIGH";

            return (
              <article
                key={notification.id}
                className={`rounded-2xl border p-5 ${
                  unreadItem
                    ? high
                      ? "border-orange-500/30 bg-orange-500/[0.07]"
                      : "border-blue-500/25 bg-blue-500/[0.06]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{notification.title}</h2>
                      {unreadItem && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">Nueva</span>}
                      {high && <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-300">Alta</span>}
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{notification.body}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(notification.created_at)}</p>
                  </div>

                  <div className="flex gap-2">
                    {notification.action_url && (
                      <Link
                        href={notification.action_url}
                        className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold hover:bg-blue-400"
                      >
                        Ver
                      </Link>
                    )}
                    {unreadItem && (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={notification.id} />
                        <button className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
                          Leída
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {!notifications?.length && (
          <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <h2 className="text-lg font-semibold">No hay alertas pendientes</h2>
            <p className="mt-2 text-sm text-slate-500">Cuando RevScale detecte algo que requiera atención, aparecerá acá.</p>
          </div>
        )}
      </div>
    </main>
  );
}
