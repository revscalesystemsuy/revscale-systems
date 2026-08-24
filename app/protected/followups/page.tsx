import Link from "next/link";
import { Suspense } from "react";
import { Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { completeFollowup } from "./actions";

export default function FollowupsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FollowupsContent />
    </Suspense>
  );
}

async function FollowupsContent() {
  const supabase = await createClient();

  const { data: followups, error } = await supabase
    .from("followups")
    .select(`
      id,
      title,
      notes,
      due_at,
      priority,
      status,
      completed_at,
      leads (
        full_name,
        phone
      )
    `)
    .order("due_at", { ascending: true });

  if (error) console.error(error);

  const stats = { today: 0, overdue: 0, upcoming: 0, completed: 0 };

  followups?.forEach((item: any) => {
    if (item.status === "COMPLETED") {
      stats.completed++;
      return;
    }
    if (!item.due_at) return;

    const date = new Date(item.due_at);
    const now = new Date();

    if (date < now) stats.overdue++;
    else if (date.toDateString() === now.toDateString()) stats.today++;
    else stats.upcoming++;
  });

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Follow-ups</h1>
            <p className="mt-2 text-slate-400">Gestiona próximos contactos y tareas comerciales.</p>
          </div>

          <Link href="/protected/followups/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold">
            <Plus size={16} strokeWidth={1.7} />
            Nuevo follow-up
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Card title="Hoy" value={stats.today} />
          <Card title="Vencidos" value={stats.overdue} />
          <Card title="Próximos" value={stats.upcoming} />
          <Card title="Completados" value={stats.completed} />
        </section>

        <section className="mt-8 rounded-2xl border border-white/10">
          <div className="border-b border-white/10 p-6">
            <h2 className="text-xl font-semibold">Seguimientos</h2>
          </div>

          {followups?.map((item: any) => (
            <div key={item.id} className="border-b border-white/10 p-6">
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-slate-400">Lead: {item.leads?.full_name || "Sin nombre"}</p>
                </div>
                <span className="h-fit rounded-full bg-white/5 px-3 py-1">{item.status}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-400">{item.priority}</span>
                {item.due_at && (
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    {new Date(item.due_at).toLocaleString("es-UY")}
                  </span>
                )}
              </div>

              {item.status !== "COMPLETED" && (
                <form action={completeFollowup} className="mt-5">
                  <input type="hidden" name="id" value={item.id} />
                  <button className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 font-semibold">
                    <Check size={15} strokeWidth={1.8} />
                    Completar
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Loading() {
  return <main className="min-h-screen bg-slate-950 p-8 text-white">Cargando follow-ups...</main>;
}
