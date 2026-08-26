import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value));
}

const AUTOMATION_TYPES = new Set([
  "NEW_LEAD_UNCONTACTED",
  "VISIT_NO_FOLLOWUP",
  "NEGOTIATION_IDLE_5D",
  "PROPERTY_MATCH",
  "SLA_WARNING",
  "SLA_BREACHED",
  "SLA_ESCALATED",
]);

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

  const items = notifications || [];
  const unread = items.filter((item) => !item.read_at).length;
  const automationUnread = items.filter((item) => !item.read_at && AUTOMATION_TYPES.has(item.type)).length;
  const slaUnread = items.filter((item) => !item.read_at && ["SLA_WARNING", "SLA_BREACHED", "SLA_ESCALATED"].includes(item.type)).length;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Prioridades comerciales</p>
            <h1 className="mt-3 font-serif text-4xl font-medium text-[#292722] md:text-5xl">Notificaciones</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">RevScale vigila SLA de primera respuesta, seguimientos, cierres, oportunidades estancadas y nuevas coincidencias entre propiedades y clientes.</p>
            <p className="mt-2 text-xs text-[#81796e]">Las alertas SLA distinguen respuesta automática de primera respuesta humana y escalan a Dirección cuando corresponde.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Summary label="Sin leer" value={unread} />
            <Summary label="Automáticas" value={automationUnread} />
            <Summary label="SLA" value={slaUnread} />
            {unread > 0 && <form action={markAllNotificationsRead}><button className="rounded-xl border border-[#cdbfa9] bg-[#fffaf2] px-4 py-3 text-sm font-semibold text-[#5f513e] hover:bg-[#f4eadc]">Marcar todas como leídas</button></form>}
          </div>
        </div>

        <section className="mt-8 space-y-3">
          {items.map((notification) => {
            const unreadItem = !notification.read_at;
            const high = notification.priority === "HIGH";
            const automated = AUTOMATION_TYPES.has(notification.type);
            const sla = ["SLA_WARNING", "SLA_BREACHED", "SLA_ESCALATED"].includes(notification.type);
            return (
              <article key={notification.id} className={`rounded-xl border p-5 ${unreadItem ? high ? "border-[#b88e75] bg-[#f1dfd2]" : "border-[#cdbfa9] bg-[#f7f0e6]" : "border-[#d7cbbb] bg-[#f4ecdf]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-[#37332d]">{notification.title}</h2>
                      {unreadItem && <Tag>Nueva</Tag>}
                      {high && <Tag strong>Alta</Tag>}
                      {sla && <Tag strong>SLA</Tag>}
                      {automated && !sla && <Tag>Automática</Tag>}
                    </div>
                    <p className="mt-2 text-sm text-[#625d55]">{notification.body}</p>
                    <p className="mt-2 text-xs text-[#8b8378]">{formatDate(notification.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    {notification.action_url && <Link href={notification.action_url} className="rounded-lg bg-[#302d28] px-4 py-2 text-sm font-semibold !text-[#fffaf2]">Resolver</Link>}
                    {unreadItem && <form action={markNotificationRead}><input type="hidden" name="id" value={notification.id} /><button className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2 text-sm text-[#5f513e]">Leída</button></form>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
        {!items.length && <div className="mt-8 rounded-xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-12 text-center"><h2 className="font-serif text-xl text-[#37332d]">No hay alertas pendientes</h2><p className="mt-2 text-sm text-[#81796e]">Cuando RevScale detecte algo que requiera atención, aparecerá acá.</p></div>}
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-3 text-center"><p className="text-xs text-[#81796e]">{label}</p><p className="mt-1 font-serif text-2xl text-[#4b4238]">{value}</p></div>;
}

function Tag({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${strong ? "border-[#b88e75] bg-[#ead3c3] text-[#6b4433]" : "border-[#cbb99f] bg-[#fffaf2] text-[#756246]"}`}>{children}</span>;
}
