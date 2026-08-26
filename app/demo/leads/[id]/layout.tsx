import type { ReactNode } from "react";
import { DEMO_SLA_BY_LEAD, getDemoSla, demoSlaLabel } from "@/lib/demo-sla-data";

export default async function DemoLeadLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getDemoSla(id);
  const exists = Boolean(DEMO_SLA_BY_LEAD[id]);
  const missed = item.firstHumanResponseMinutes === null || item.firstHumanResponseMinutes > item.slaMinutes;

  return (
    <>
      {exists && (
        <section className="mx-auto mt-6 max-w-[1550px] px-5 md:px-8 lg:px-10">
          <div className="rounded-xl border border-[#353229] bg-[#1b1a17] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77736b]">Origen y velocidad · Demo</p><h2 className="mt-2 font-serif text-2xl text-[#efe8dc]">Atribución del lead</h2></div>
              <span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold ${missed ? "border-[#684d42] bg-[#2a201d] text-[#d0a58f]" : "border-[#4d5545] bg-[#20251e] text-[#aebb9d]"}`}>{demoSlaLabel(id)}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Canal" value={item.sourceChannel} />
              <Info label="Proveedor" value={item.sourceProvider} />
              <Info label="Campaña" value={item.sourceCampaign} />
              <Info label="SLA objetivo" value={`${item.slaMinutes} min`} />
              <Info label="Primera respuesta IA" value={item.firstAiResponseMinutes === null ? "Sin respuesta IA" : `${item.firstAiResponseMinutes} min`} />
              <Info label="Primera respuesta humana" value={item.firstHumanResponseMinutes === null ? "Sin respuesta humana" : `${item.firstHumanResponseMinutes} min`} />
              <Info label="Estado" value={demoSlaLabel(id)} />
              <Info label="Lectura" value="La IA no reemplaza la respuesta humana para el SLA" />
            </div>
          </div>
        </section>
      )}
      {children}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#77736b]">{label}</p><p className="mt-1 text-sm leading-5 text-[#c6bcae]">{value}</p></div>;
}
