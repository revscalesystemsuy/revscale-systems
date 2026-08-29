import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { finalizePilotReport, savePilotReport } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> };

export default async function PilotReportDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunity }, { data: baseline }, { data: measurements }, { data: reports }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_pilot_baselines").select("status,locked_at").eq("opportunity_id", id).maybeSingle(),
    supabase.from("b2b_before_after_measurements").select("measurement_day,status,measured_at").eq("opportunity_id", id).order("measurement_day", { ascending: true }),
    supabase.from("b2b_pilot_reports").select("*").eq("opportunity_id", id).order("report_day", { ascending: true }),
  ]);
  if (!opportunity) redirect("/protected/admin/sales/pilot-reports");

  const maxLockedDay = Math.max(0, ...((measurements || []).filter((x) => x.status === "LOCKED").map((x) => x.measurement_day)));
  const byDay = new Map((reports || []).map((x) => [x.report_day, x]));

  return <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10"><div className="mx-auto max-w-5xl">
    <Link href="/protected/admin/sales/pilot-reports" className="text-sm text-[#7a6e5c]">← Volver a reportes</Link>
    <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 7 · Paso 61</p><h1 className="mt-3 font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#625d55]">{opportunity.contact_name || "Contacto pendiente"} · {opportunity.stage}</p></div>
    {query.error && <p className="mt-5 rounded-xl border border-[#b98f82] bg-[#f8e9e4] p-4 text-sm">{query.error}</p>}
    {query.success && <p className="mt-5 rounded-xl border border-[#a9b79a] bg-[#edf3e7] p-4 text-sm">{query.success}</p>}
    <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-sm"><strong>Baseline:</strong> {baseline?.status || "NO DISPONIBLE"}</p><p className="mt-1 text-sm"><strong>Última medición bloqueada:</strong> Día {maxLockedDay || "—"}</p><p className="mt-1 text-sm"><strong>Próximo paso:</strong> {opportunity.next_step || "—"}</p></section>
    {[30,45].map((day) => { const report = byDay.get(day); const final = report?.status === "FINAL"; const eligible = maxLockedDay >= day; return <section key={day} className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8d7553]">Informe de piloto</p><h2 className="mt-2 font-serif text-3xl">Día {day}</h2></div><span className="rounded-full border border-[#cdbda5] bg-[#eee4d5] px-3 py-1 text-xs">{report?.status || (eligible ? "LISTO" : "ESPERANDO MEDICIÓN")}</span></div>{!eligible ? <p className="mt-5 text-sm text-[#746c62]">Necesita una medición bloqueada de día {day} o posterior.</p> : <><form action={savePilotReport} className="mt-6 grid gap-4"><input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="report_day" value={day}/><Area label="Resumen ejecutivo" name="executive_summary" value={report?.executive_summary}/><Area label="Intervención ejecutada" name="intervention_summary" value={report?.intervention_summary}/><Area label="Resultados observados" name="observed_outcomes" value={report?.observed_outcomes}/><Area label="Atribución prudente" name="attribution_notes" value={report?.attribution_notes}/><Area label="Limitaciones" name="limitations" value={report?.limitations}/><Area label="Recomendación" name="recommendation" value={report?.recommendation}/>{day === 45 && <><label className="text-sm">Resultado garantía<select name="guarantee_result" defaultValue={report?.guarantee_result || "PENDING"} disabled={final} className="mt-2 w-full rounded-xl border border-[#cdbda5] bg-white px-3 py-2"><option value="PENDING">PENDING</option><option value="MET">MET</option><option value="NOT_MET">NOT_MET</option></select></label><Area label="Notas de garantía" name="guarantee_notes" value={report?.guarantee_notes}/></>}<button disabled={final} className="rounded-xl bg-[#302d28] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Guardar borrador</button></form>{report && !final && <form action={finalizePilotReport} className="mt-3"><input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="report_day" value={day}/><button className="w-full rounded-xl border border-[#8d7553] px-4 py-3 text-sm font-semibold">Finalizar reporte</button></form>}</>}</section>; })}
  </div></main>;
}

function Area({ label, name, value }: { label: string; name: string; value?: string | null }) { return <label className="text-sm">{label}<textarea name={name} defaultValue={value || ""} rows={4} className="mt-2 w-full rounded-xl border border-[#cdbda5] bg-white p-3"/></label>; }
