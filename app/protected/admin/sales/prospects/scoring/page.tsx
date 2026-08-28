import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDashed } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  score_team_size: number | null;
  score_lead_volume: number | null;
  score_source_fragmentation: number | null;
  score_whatsapp_centrality: number | null;
  score_process_pain: number | null;
  score_growth_investment: number | null;
  score_decision_access: number | null;
  score_geography: number | null;
  icp_score: number | null;
  score_status: "UNSCORED" | "SCORED";
  score_signal_count: number;
};

const components = [
  ["Equipo", "score_team_size", 20],
  ["Volumen leads", "score_lead_volume", 20],
  ["Fuentes", "score_source_fragmentation", 15],
  ["WhatsApp", "score_whatsapp_centrality", 10],
  ["Dolor proceso", "score_process_pain", 15],
  ["Inversión / crecimiento", "score_growth_investment", 10],
  ["Acceso decisor", "score_decision_access", 5],
  ["Geografía", "score_geography", 5],
] as const;

export default async function ProspectScoringPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,department,score_team_size,score_lead_volume,score_source_fragmentation,score_whatsapp_centrality,score_process_pain,score_growth_investment,score_decision_access,score_geography,icp_score,score_status,score_signal_count")
    .order("score_signal_count", { ascending: false })
    .order("company_name", { ascending: true });

  const prospects = (data || []) as Prospect[];
  const scored = prospects.filter((item) => item.score_status === "SCORED").length;
  const unscored = prospects.length - scored;
  const signals = prospects.reduce((sum, item) => sum + item.score_signal_count, 0);
  const maxSignals = prospects.length * 8;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/prospects/linkedin" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a LinkedIn</Link>
          <Link href="/protected/admin/sales/icp" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Criterios ICP</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Prospecting · Paso 34</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Score ICP 0–100</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">El score solo existe cuando las 8 señales están respaldadas por evidencia suficiente. Mientras falte una señal, la cuenta queda UNSCORED y se muestra exactamente qué falta investigar.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="SCORED" value={scored} detail={`de ${prospects.length} cuentas`} />
          <Metric label="UNSCORED" value={unscored} detail="sin score definitivo" />
          <Metric label="Cobertura de señales" value={signals} detail={`de ${maxSignals} señales posibles`} />
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756b5f]">Ponderación oficial</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {components.map(([label,, max]) => <div key={label} className="rounded-xl border border-[#ddd1c0] bg-[#f8f1e7] p-4"><p className="text-sm font-medium">{label}</p><p className="mt-1 font-serif text-2xl">{max} pts</p></div>)}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#fffaf2]">
          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full text-left text-sm">
              <thead className="border-b border-[#ddd1c0] bg-[#eee5d8] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756b5f]"><tr><th className="p-4">Cuenta</th><th className="p-4">Estado</th><th className="p-4">Score</th><th className="p-4">Cobertura</th>{components.map(([label]) => <th key={label} className="p-4">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#e4d9ca]">
                {prospects.map((item) => <tr key={item.id} className="align-top">
                  <td className="p-4"><p className="font-semibold">{item.company_name}</p><p className="mt-1 text-xs text-[#81786d]">{item.city} · {item.department}</p></td>
                  <td className="p-4"><Status value={item.score_status}/></td>
                  <td className="p-4 font-serif text-2xl">{item.icp_score ?? "—"}</td>
                  <td className="p-4"><span className="font-semibold">{item.score_signal_count}/8</span></td>
                  {components.map(([label, key, max]) => {
                    const value = item[key];
                    return <td key={label} className="p-4">{value === null ? <span className="text-xs text-[#81786d]">Falta evidencia</span> : <span className="font-semibold">{value}/{max}</span>}</td>;
                  })}
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]"><strong>Regla:</strong> no se usa inventario como proxy de volumen de leads, ni presencia en portales como prueba de dolor operativo, ni un teléfono móvil como prueba de centralidad de WhatsApp. Paso 35 — Tier A/B/C — solo se habilita sobre cuentas SCORED.</div>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>; }
function Status({ value }: { value: "UNSCORED" | "SCORED" }) { const good = value === "SCORED"; return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${good ? "border-[#aeb99f] bg-[#e4e8dc] text-[#526047]" : "border-[#d0c9bd] bg-[#eeeae3] text-[#726b61]"}`}>{good ? <CheckCircle2 size={12}/> : <CircleDashed size={12}/>} {value}</span>; }
