import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OPEN_PIPELINE_STAGE_SET, PIPELINE_STAGE_LABELS, calculateOpportunityRisk, getBusinessDateKey, type OpportunityRisk } from "@/lib/commercial-ops";
import { formatCommercialAmount } from "@/lib/pipeline-metrics";

type CalendarItem = {
  id: string;
  full_name: string | null;
  pipeline_stage: string | null;
  stage_entered_at: string | null;
  expected_close_date: string;
  lead_temperature: string | null;
  requires_human: boolean | null;
  next_action: string | null;
  created_at: string | null;
  budget_max: number | string | null;
  currency: string | null;
  risk: OpportunityRisk;
};

type SearchParams = Promise<{ month?: string }>;

export default async function CommercialCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { month: requestedMonth } = await searchParams;
  const today = getBusinessDateKey(new Date());
  const selectedMonth = /^\d{4}-\d{2}$/.test(requestedMonth || "") ? String(requestedMonth) : today.slice(0, 7);
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = `${selectedMonth}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const monthEndExclusive = nextMonthDate.toISOString().slice(0, 10);
  const previousMonth = monthKeyFromDate(new Date(Date.UTC(year, month - 2, 1)));
  const nextMonth = monthKeyFromDate(new Date(Date.UTC(year, month, 1)));

  const { data: leadsData } = await supabase
    .from("leads")
    .select("id,full_name,pipeline_stage,stage_entered_at,expected_close_date,lead_temperature,requires_human,next_action,created_at,budget_max,currency")
    .not("expected_close_date", "is", null)
    .order("expected_close_date", { ascending: true });

  const now = new Date();
  const items: CalendarItem[] = (leadsData || [])
    .filter((lead) => Boolean(lead.expected_close_date) && OPEN_PIPELINE_STAGE_SET.has(lead.pipeline_stage || "NEW"))
    .map((lead) => ({
      ...lead,
      expected_close_date: lead.expected_close_date as string,
      risk: calculateOpportunityRisk(lead, { now }),
    }));

  const overdue = items.filter((lead) => lead.expected_close_date < today);
  const monthItems = items.filter((lead) => lead.expected_close_date >= monthStart && lead.expected_close_date < monthEndExclusive);
  const monthTotals = monthItems.reduce<Record<string, number>>((acc, lead) => {
    const value = Number(lead.budget_max || 0);
    if (!Number.isFinite(value) || value <= 0 || !lead.currency) return acc;
    const currency = lead.currency.toUpperCase();
    acc[currency] = (acc[currency] || 0) + value;
    return acc;
  }, {});

  const days = buildCalendarDays(year, month);
  const monthLabel = new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Agenda comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Calendario de cierres</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Vista mensual de oportunidades abiertas por fecha estimada de cierre. Las vencidas quedan visibles arriba para priorizar intervención.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/protected/calendar?month=${previousMonth}`} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2 text-sm font-semibold text-[#554f47]">Mes anterior</Link>
            <Link href="/protected/calendar" className="rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-2 text-sm font-semibold text-[#554f47]">Hoy</Link>
            <Link href={`/protected/calendar?month=${nextMonth}`} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2 text-sm font-semibold text-[#554f47]">Mes siguiente</Link>
          </div>
        </div>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Summary title="Vencidos" value={overdue.length} />
          <Summary title="En este mes" value={monthItems.length} />
          <Summary title="Riesgo alto" value={monthItems.filter((item) => item.risk.level === "HIGH").length} />
          <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">Valor previsto</p>
            <div className="mt-3 space-y-1">
              {Object.entries(monthTotals).length ? Object.entries(monthTotals).map(([currency, value]) => <p key={currency} className="font-serif text-xl text-[#2f2c27]">{formatCommercialAmount(currency, value)}</p>) : <p className="text-sm text-[#81796e]">Sin valor registrado</p>}
            </div>
          </div>
        </section>

        {overdue.length > 0 && (
          <section className="mt-7 rounded-xl border border-[#cfae99] bg-[#f4e4d9] p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8b6654]">Atención</p><h2 className="mt-1 font-serif text-2xl text-[#5f4033]">Cierres vencidos</h2></div>
              <Link href="/protected/today" className="text-sm font-semibold text-[#6d4c3e]">Resolver en Qué hacer hoy</Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {overdue.slice(0, 8).map((item) => <CloseCard key={item.id} item={item} compact />)}
            </div>
          </section>
        )}

        <section className="mt-7 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl capitalize text-[#37332d]">{monthLabel}</h2>
            <p className="text-xs text-[#81796e]">Lunes a domingo · fechas de negocio en Uruguay</p>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-[#d8ccbc] bg-[#d8ccbc]">
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((day) => <div key={day} className="bg-[#eee4d5] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#776f64]">{day}</div>)}
            {days.map((day) => {
              const dayItems = day.date ? monthItems.filter((item) => item.expected_close_date === day.date) : [];
              const isToday = day.date === today;
              return (
                <div key={day.key} className={`min-h-[165px] bg-[#fffaf2] p-3 ${isToday ? "ring-2 ring-inset ring-[#9f8b6e]" : ""}`}>
                  {day.date ? (
                    <>
                      <div className="flex items-center justify-between gap-2"><span className={`text-xs font-semibold ${isToday ? "text-[#6f5c40]" : "text-[#81796e]"}`}>{day.dayNumber}</span>{dayItems.length > 0 && <span className="rounded-full bg-[#eee4d5] px-2 py-0.5 text-[10px] text-[#6b6258]">{dayItems.length}</span>}</div>
                      <div className="mt-2 space-y-2">
                        {dayItems.slice(0, 3).map((item) => <CloseCard key={item.id} item={item} compact />)}
                        {dayItems.length > 3 && <p className="text-[10px] font-medium text-[#756246]">+{dayItems.length - 3} más</p>}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function monthKeyFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mondayIndex = (firstDay.getUTCDay() + 6) % 7;
  const cells: { key: string; date: string | null; dayNumber: number | null }[] = [];
  for (let i = 0; i < mondayIndex; i++) cells.push({ key: `blank-start-${i}`, date: null, dayNumber: null });
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key: date, date, dayNumber: day });
  }
  while (cells.length % 7 !== 0) cells.push({ key: `blank-end-${cells.length}`, date: null, dayNumber: null });
  return cells;
}

function Summary({ title, value }: { title: string; value: number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-3xl text-[#2f2c27]">{value}</p></div>;
}

function CloseCard({ item, compact = false }: { item: CalendarItem; compact?: boolean }) {
  const riskClass = item.risk.level === "HIGH" ? "border-[#b58d73]" : item.risk.level === "MEDIUM" ? "border-[#c4a86e]" : "border-[#d8ccbc]";
  return (
    <Link href={`/protected/leads/${item.id}`} className={`block rounded-lg border ${riskClass} bg-[#f7f0e6] p-2.5 hover:bg-[#f1e7d8]`}>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs font-semibold text-[#37332d]">{item.full_name || "Sin nombre"}</p>
        <span className="shrink-0 text-[9px] font-semibold text-[#756246]">R{item.risk.score}</span>
      </div>
      {!compact && <p className="mt-1 text-[10px] text-[#81796e]">{PIPELINE_STAGE_LABELS[item.pipeline_stage || "NEW"] || item.pipeline_stage}</p>}
      {Number(item.budget_max || 0) > 0 && <p className="mt-1 truncate text-[10px] text-[#625d55]">{formatCommercialAmount((item.currency || "Sin moneda").toUpperCase(), Number(item.budget_max))}</p>}
    </Link>
  );
}
