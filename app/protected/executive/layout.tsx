import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildSlaMetrics, formatResponseMinutes } from "@/lib/sla-metrics";

export default async function ExecutiveLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  let summary: ReturnType<typeof buildSlaMetrics> | null = null;
  let worstSources: { label: string; pct: number; total: number }[] = [];

  if (userId) {
    const { data: membership } = await supabase.from("organization_members").select("organization_id,role").eq("user_id", userId).eq("status", "ACTIVE").maybeSingle();
    if (membership?.role === "OWNER") {
      const { data: leads } = await supabase.from("leads").select("source_channel,source_provider,assigned_at,first_human_response_at,sla_deadline,sla_breached_at").eq("organization_id", membership.organization_id);
      const rows = leads || [];
      summary = buildSlaMetrics(rows);
      const sources = Array.from(new Set(rows.map((lead) => lead.source_provider || lead.source_channel).filter(Boolean) as string[]));
      worstSources = sources.map((label) => {
        const group = rows.filter((lead) => (lead.source_provider || lead.source_channel) === label);
        const metrics = buildSlaMetrics(group);
        return { label, pct: metrics.withinPct, total: group.length };
      }).filter((item) => item.total > 0).sort((a, b) => a.pct - b.pct || b.total - a.total).slice(0, 3);
    }
  }

  return (
    <>
      {summary && (
        <section className="mx-auto mt-6 max-w-7xl px-6 md:px-8 lg:px-10">
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Speed-to-lead ejecutivo</p><h2 className="mt-2 font-serif text-2xl text-[#302d28]">Primera respuesta humana</h2></div>
              <p className="text-sm text-[#81796e]">{summary.assigned} leads con reloj SLA</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Media" value={formatResponseMinutes(summary.meanMinutes)} />
              <Metric label="Mediana" value={formatResponseMinutes(summary.medianMinutes)} />
              <Metric label="Cumplimiento" value={`${summary.withinPct}%`} />
              <Metric label="Incumplimiento" value={`${summary.breachedPct}%`} />
              <Metric label="Fuera SLA" value={String(summary.breached)} />
              <Metric label="Sin respuesta" value={String(summary.unanswered)} />
            </div>
            {worstSources.length > 0 && <div className="mt-5 border-t border-[#ddd1c0] pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">Orígenes con menor cumplimiento</p><div className="mt-3 flex flex-wrap gap-2">{worstSources.map((source) => <span key={source.label} className="rounded-full border border-[#d2c5b3] bg-[#fffaf2] px-3 py-1.5 text-xs text-[#625d55]">{source.label} · {source.pct}% · {source.total} leads</span>)}</div></div>}
          </div>
        </section>
      )}
      {children}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{label}</p><p className="mt-2 font-serif text-2xl text-[#37332d]">{value}</p></div>;
}
