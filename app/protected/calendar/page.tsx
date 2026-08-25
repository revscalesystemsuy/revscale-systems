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

export default async function CommercialCalendarPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: leadsData } = await supabase
    .from("leads")
    .select("id,full_name,pipeline_stage,stage_entered_at,expected_close_date,lead_temperature,requires_human,next_action,created_at,budget_max,currency")
    .not("expected_close_date", "is", null)
    .order("expected_close_date", { ascending: true });

  const now = new Date();
  const today = getBusinessDateKey(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T12:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEndExclusive = nextMonth.toISOString().slice(0, 10);

  const items: CalendarItem[] = (leadsData || [])
    .filter((lead) => Boolean(lead.expected_close_date) && OPEN_PIPELINE_STAGE_SET.has(lead.pipeline_stage || "NEW"))
    .map((lead) => ({
      ...lead,
      expected_close_date: lead.expected_close_date as string,
      risk: calculateOpportunityRisk(lead, { now }),
    }));

  const overdue = items.filter((lead) => lead.expected_close_date < today);
  const todayItems = items.filter((lead) => lead.expected_close_date === today);
  const thisMonth = items.filter((lead) => lead.expected_close_date >= monthStart && lead.expected_close_date < monthEndExclusive);
  const future = items.filter((lead) => lead.expected_close_date >= monthEndExclusive);

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Agenda comercial</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Calendario de cierres</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Oportunidades abiertas agrupadas por fecha estimada de cierre. Las vencidas quedan separadas para actuar primero.</p>

        <div className="mt-7 grid gap-4 lg:grid-cols-4">
          <Summary title="Vencidos" value={overdue.length} />
          <Summary title="Hoy" value={todayItems.length} />
          <Summary title="Este mes" value={thisMonth.length} />
          <Summary title="Más adelante" value={future.length} />
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <CalendarPanel title="Cierres vencidos" items={overdue} empty="No hay cierres estimados vencidos." />
          <CalendarPanel title="Cierres previstos hoy" items={todayItems} empty="No hay cierres estimados para hoy." />
          <CalendarPanel title="Resto del mes" items={thisMonth.filter((item) => item.expected_close_date !== today)} empty="No hay más cierres previstos este mes." />
          <CalendarPanel title="Próximos meses" items={future} empty="No hay cierres previstos para meses siguientes." />
        </div>
      </div>
    </main>
  );
}

function Summary({ title, value }: { title: string; value: number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-3xl text-[#2f2c27]">{value}</p></div>;
}

function CalendarPanel({ title, items, empty }: { title: string; items: CalendarItem[]; empty: string }) {
  return (
    <section className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
      <h2 className="font-serif text-2xl text-[#37332d]">{title}</h2>
      <div className="mt-5 divide-y divide-[#ddd1c0]">
        {items.map((item) => (
          <article key={item.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link href={`/protected/leads/${item.id}`} className="font-medium text-[#37332d] hover:text-[#725d40]">{item.full_name || "Sin nombre"}</Link>
                <p className="mt-1 text-xs text-[#81796e]">{PIPELINE_STAGE_LABELS[item.pipeline_stage || "NEW"] || item.pipeline_stage} · {item.expected_close_date}</p>
              </div>
              <span className="rounded-full border border-[#cdbfa9] bg-[#fffaf2] px-2.5 py-1 text-xs font-semibold text-[#675740]">Riesgo {item.risk.score}</span>
            </div>
            {Number(item.budget_max || 0) > 0 && <p className="mt-2 text-sm text-[#625d55]">{formatCommercialAmount((item.currency || "Sin moneda").toUpperCase(), Number(item.budget_max))}</p>}
          </article>
        ))}
        {!items.length && <p className="py-4 text-sm text-[#81796e]">{empty}</p>}
      </div>
    </section>
  );
}
