import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessDateKey } from "@/lib/commercial-ops";
import { completeFollowup } from "./actions";

const PRIORITY_CLASS: Record<string, string> = {
  HIGH: "border-[#d5b9ac] bg-[#f2e1da] text-[#7a5044]",
  MEDIUM: "border-[#d6c6a8] bg-[#f0e7d5] text-[#735f3f]",
  LOW: "border-[#c9c8bd] bg-[#ecebe4] text-[#64645a]",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export default function FollowupsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FollowupsContent />
    </Suspense>
  );
}

async function FollowupsContent() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { data: membership } = userId
    ? await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .single()
    : { data: null };

  let query = supabase
    .from("followups")
    .select(`
      id,
      title,
      notes,
      due_at,
      priority,
      status,
      completed_at,
      lead_id,
      leads (
        id,
        full_name,
        phone
      )
    `)
    .order("due_at", { ascending: true });

  if (membership?.organization_id) query = query.eq("organization_id", membership.organization_id);

  const { data: followups, error } = await query;
  if (error) console.error(error);

  const now = new Date();
  const todayKey = getBusinessDateKey(now);
  const stats = { today: 0, overdue: 0, upcoming: 0, completed: 0 };

  for (const item of followups || []) {
    if (item.status === "COMPLETED") {
      stats.completed += 1;
      continue;
    }
    if (!item.due_at) continue;

    const due = new Date(item.due_at);
    if (due < now) {
      stats.overdue += 1;
    } else if (dateKeyInMontevideo(due) === todayKey) {
      stats.today += 1;
    } else {
      stats.upcoming += 1;
    }
  }

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Gestión comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Seguimientos</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55] md:text-[15px]">
              Próximos contactos, tareas vencidas y compromisos comerciales del equipo.
            </p>
          </div>

          <Link
            href="/protected/followups/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]"
          >
            <Plus size={16} strokeWidth={1.7} />
            Nuevo seguimiento
          </Link>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<CalendarClock size={18} strokeWidth={1.7} />} label="Hoy" value={stats.today} />
          <SummaryCard icon={<AlertTriangle size={18} strokeWidth={1.7} />} label="Vencidos" value={stats.overdue} note={stats.overdue ? "Requieren atención" : "Sin atrasos"} />
          <SummaryCard icon={<Clock3 size={18} strokeWidth={1.7} />} label="Próximos" value={stats.upcoming} />
          <SummaryCard icon={<CheckCircle2 size={18} strokeWidth={1.7} />} label="Completados" value={stats.completed} />
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-[#d3b7ae] bg-[#f1dfd8] p-4 text-sm text-[#704b3d]">
            No se pudieron cargar los seguimientos.
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd1c0] px-5 py-4 md:px-6">
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#302d28]">Agenda comercial</h2>
              <p className="mt-1 text-xs leading-5 text-[#81796e]">Ordenada por fecha para que lo urgente aparezca primero.</p>
            </div>
            <Link href="/protected/today" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e604e] hover:text-[#443c31]">
              Ver prioridades de hoy
              <ArrowRight size={15} strokeWidth={1.7} />
            </Link>
          </div>

          {(followups || []).map((item) => {
            const lead = Array.isArray(item.leads) ? item.leads[0] : item.leads;
            const due = item.due_at ? new Date(item.due_at) : null;
            const overdue = item.status !== "COMPLETED" && due ? due < now : false;
            const completed = item.status === "COMPLETED";

            return (
              <article key={item.id} className="border-b border-[#e2d7c8] p-5 last:border-b-0 md:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-xl font-medium text-[#37312a]">{item.title}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${completed ? "border-[#c8cfb3] bg-[#edf0e3] text-[#596146]" : overdue ? "border-[#d7bdb4] bg-[#f3e5df] text-[#815448]" : "border-[#d7caba] bg-[#fffaf2] text-[#6f665a]"}`}>
                        {completed ? "Completado" : overdue ? "Vencido" : "Pendiente"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[#6d655b]">
                      Lead: {lead?.full_name || "Sin nombre"}{lead?.phone ? ` · ${lead.phone}` : ""}
                    </p>
                    {item.notes && <p className="mt-3 max-w-3xl text-sm leading-6 text-[#81796e]">{item.notes}</p>}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${PRIORITY_CLASS[item.priority || "MEDIUM"] || PRIORITY_CLASS.MEDIUM}`}>
                        Prioridad {PRIORITY_LABEL[item.priority || "MEDIUM"] || item.priority}
                      </span>
                      {due && (
                        <span className="rounded-full border border-[#d8ccbc] bg-[#fffaf2] px-2.5 py-1 text-xs text-[#6b6258]">
                          {formatMontevideo(due)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {lead?.id && (
                      <Link
                        href={`/protected/leads/${lead.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5b5144] transition hover:bg-[#f2e9dc]"
                      >
                        Abrir lead
                        <ArrowRight size={14} strokeWidth={1.7} />
                      </Link>
                    )}

                    {!completed && (
                      <form action={completeFollowup}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#b9c0ad] bg-[#e6e9df] px-4 py-2.5 text-sm font-semibold text-[#536047] transition hover:bg-[#dfe4d7]">
                          <Check size={15} strokeWidth={1.8} />
                          Completar
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {!followups?.length && !error && (
            <div className="px-6 py-14 text-center">
              <CalendarClock size={24} strokeWidth={1.5} className="mx-auto text-[#a08d72]" />
              <p className="mt-3 font-serif text-xl text-[#4b443a]">Todavía no hay seguimientos.</p>
              <p className="mt-1 text-sm text-[#81796e]">Creá el próximo contacto desde acá o desde la ficha de un lead.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
      <div className="flex items-center gap-2 text-[#806d52]">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p>
      {note && <p className="mt-1 text-xs text-[#81796e]">{note}</p>}
    </div>
  );
}

function dateKeyInMontevideo(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

function formatMontevideo(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function Loading() {
  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl text-sm text-[#746b60]">Cargando seguimientos...</div>
    </main>
  );
}
