import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function monthStartOffset(base: Date, offset: number) {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "America/Montevideo" }).format(date);
}

export default async function MonthlyExecutivePage() {
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
  if (!membership || membership.role !== "OWNER") redirect("/protected");

  const now = new Date();
  const firstMonth = monthStartOffset(now, -5);
  const nextMonth = monthStartOffset(now, 1);

  const [{ data: goalsData }, { data: wonEventsData }] = await Promise.all([
    supabase
      .from("sales_goals")
      .select("period_month,target_won_count")
      .eq("organization_id", membership.organization_id)
      .eq("scope_type", "ORGANIZATION")
      .gte("period_month", monthKey(firstMonth))
      .lt("period_month", monthKey(nextMonth)),
    supabase
      .from("lead_stage_events")
      .select("lead_id,changed_at")
      .eq("organization_id", membership.organization_id)
      .eq("to_stage", "WON")
      .gte("changed_at", firstMonth.toISOString())
      .lt("changed_at", nextMonth.toISOString()),
  ]);

  const goals = goalsData || [];
  const wonEvents = wonEventsData || [];
  const months = Array.from({ length: 6 }, (_, index) => monthStartOffset(now, index - 5)).map((date) => {
    const start = monthKey(date);
    const end = monthKey(monthStartOffset(date, 1));
    const target = Number(goals.find((goal) => goal.period_month === start)?.target_won_count || 0);
    const won = new Set(
      wonEvents
        .filter((event) => event.changed_at.slice(0, 10) >= start && event.changed_at.slice(0, 10) < end)
        .map((event) => event.lead_id),
    ).size;
    const pct = target ? Math.round((won / target) * 100) : 0;
    return { start, label: monthLabel(date), target, won, pct };
  });

  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const deltaWins = current.won - previous.won;
  const deltaPct = current.pct - previous.pct;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected/executive" className="text-sm font-medium text-[#725d40]">Volver a Dirección</Link>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Evolución comercial</p>
        <h1 className="mt-3 font-serif text-4xl font-medium text-[#292722] md:text-5xl">Objetivos mes contra mes</h1>
        <p className="mt-3 text-sm leading-6 text-[#625d55]">Últimos seis meses de meta de cierres, cierres reales y cumplimiento.</p>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <Metric title="Cierres este mes" value={String(current.won)} />
          <Metric title="Variación vs mes anterior" value={`${deltaWins >= 0 ? "+" : ""}${deltaWins}`} />
          <Metric title="Cambio en cumplimiento" value={`${deltaPct >= 0 ? "+" : ""}${deltaPct} pp`} />
        </section>

        <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[#d8ccbb] text-xs uppercase tracking-[0.12em] text-[#81796e]"><tr><th className="py-3">Mes</th><th>Meta</th><th>Cierres</th><th>Cumplimiento</th><th>Progreso</th></tr></thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month.start} className="border-b border-[#e3d8c8] last:border-0">
                    <td className="py-4 font-medium capitalize text-[#403b34]">{month.label}</td>
                    <td>{month.target || "—"}</td>
                    <td>{month.won}</td>
                    <td>{month.target ? `${month.pct}%` : "Sin meta"}</td>
                    <td className="w-[220px]"><div className="h-2 overflow-hidden rounded-full bg-[#e5d9c7]"><div className="h-full rounded-full bg-[#8e7654]" style={{ width: `${Math.min(100, month.pct)}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-3xl text-[#2f2c27]">{value}</p></div>;
}
