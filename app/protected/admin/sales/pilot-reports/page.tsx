import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Opportunity = { id: string; company: string; contact_name: string | null; stage: string; next_step: string | null };
type Report = { opportunity_id: string; report_day: number; status: string; guarantee_result: string; updated_at: string };
type Measurement = { opportunity_id: string; measurement_day: number; status: string };

export default async function PilotReportsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunityData }, { data: reportData }, { data: measurementData }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").in("stage", ["PILOT_ACTIVE","PAID"]).order("updated_at", { ascending: false }),
    supabase.from("b2b_pilot_reports").select("opportunity_id,report_day,status,guarantee_result,updated_at"),
    supabase.from("b2b_before_after_measurements").select("opportunity_id,measurement_day,status").eq("status", "LOCKED"),
  ]);

  const opportunities = (opportunityData || []) as Opportunity[];
  const reports = (reportData || []) as Report[];
  const measurements = (measurementData || []) as Measurement[];
  const byOpp = new Map<string, Report[]>();
  for (const report of reports) byOpp.set(report.opportunity_id, [...(byOpp.get(report.opportunity_id) || []), report]);
  const maxMeasurement = new Map<string, number>();
  for (const m of measurements) maxMeasurement.set(m.opportunity_id, Math.max(maxMeasurement.get(m.opportunity_id) || 0, m.measurement_day));

  const final30 = reports.filter((x) => x.report_day === 30 && x.status === "FINAL").length;
  const final45 = reports.filter((x) => x.report_day === 45 && x.status === "FINAL").length;
  const ready = opportunities.filter((x) => (maxMeasurement.get(x.id) || 0) >= 30).length;

  return <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <Link href="/protected/admin/sales/before-after" className="text-sm text-[#7a6e5c]">← Volver a métricas before/after</Link>
    <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 7 · Paso 61</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Reportes día 30/45</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Cierra el circuito de prueba: baseline, medición comparable, activación, weekly review, atribución prudente y limitaciones.</p></div>
    <section className="mt-8 grid gap-4 md:grid-cols-3"><Card label="Listas para reporte" value={ready}/><Card label="Día 30 final" value={final30}/><Card label="Día 45 final" value={final45}/></section>
    <section className="mt-8 grid gap-4 lg:grid-cols-2">{opportunities.map((item) => { const rs = byOpp.get(item.id) || []; const r30 = rs.find((x) => x.report_day === 30); const r45 = rs.find((x) => x.report_day === 45); return <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><Link href={`/protected/admin/sales/pilot-reports/${item.id}`} className="font-serif text-2xl underline decoration-[#b8a487] underline-offset-4">{item.company}</Link><p className="mt-1 text-xs text-[#746c62]">{item.contact_name || "Contacto pendiente"} · {item.stage}</p><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><p>Medición: <strong>D{maxMeasurement.get(item.id) || "—"}</strong></p><p>R30: <strong>{r30?.status || "—"}</strong></p><p>R45: <strong>{r45?.status || "—"}</strong></p></div>{r45 && <p className="mt-3 text-xs">Garantía: <strong>{r45.guarantee_result}</strong></p>}<p className="mt-4 text-xs leading-5 text-[#81786d]">Próximo paso: {item.next_step || "Preparar reporte"}</p></article>; })}</section>
  </div></main>;
}

function Card({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
