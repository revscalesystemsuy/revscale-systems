import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, CircleDashed } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Tier = "A" | "B" | "C" | "IGNORE" | null;
type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  icp_score: number | null;
  score_status: "UNSCORED" | "SCORED";
  score_signal_count: number;
  prospect_tier: Tier;
};

export default async function ProspectTiersPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,department,icp_score,score_status,score_signal_count,prospect_tier")
    .order("icp_score", { ascending: false, nullsFirst: false })
    .order("company_name", { ascending: true });

  const prospects = (data || []) as Prospect[];
  const tierA = prospects.filter((p) => p.prospect_tier === "A").length;
  const tierB = prospects.filter((p) => p.prospect_tier === "B").length;
  const tierC = prospects.filter((p) => p.prospect_tier === "C").length;
  const ignored = prospects.filter((p) => p.prospect_tier === "IGNORE").length;
  const untiered = prospects.filter((p) => p.prospect_tier === null).length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/prospects/scoring" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a scoring</Link>
          <Link href="/protected/admin/sales/icp" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Criterios ICP</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Prospecting · Paso 35</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Tier A / B / C</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">La prioridad comercial se deriva automáticamente del score ICP completo. Las cuentas sin las 8 señales verificadas no reciben Tier.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Tier A" value={tierA} detail="75–100" />
          <Metric label="Tier B" value={tierB} detail="60–74" />
          <Metric label="Tier C" value={tierC} detail="45–59" />
          <Metric label="IGNORE" value={ignored} detail="<45, salvo inbound" />
          <Metric label="Sin Tier" value={untiered} detail="score incompleto" />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#fffaf2]">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-[#ddd1c0] bg-[#eee5d8] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756b5f]">
                <tr><th className="p-4">Cuenta</th><th className="p-4">Score</th><th className="p-4">Cobertura</th><th className="p-4">Tier</th><th className="p-4">Acción</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e4d9ca]">
                {prospects.map((item) => <tr key={item.id}>
                  <td className="p-4"><p className="font-semibold">{item.company_name}</p><p className="mt-1 text-xs text-[#81786d]">{item.city} · {item.department}</p></td>
                  <td className="p-4 font-serif text-2xl">{item.icp_score ?? "—"}</td>
                  <td className="p-4"><span className="font-semibold">{item.score_signal_count}/8</span></td>
                  <td className="p-4"><TierBadge tier={item.prospect_tier}/></td>
                  <td className="p-4 text-xs leading-5 text-[#71695f]">{item.prospect_tier === "A" ? "Prioridad outbound inmediata" : item.prospect_tier === "B" ? "Outbound después de Tier A" : item.prospect_tier === "C" ? "Nutrir / investigar" : item.prospect_tier === "IGNORE" ? "No priorizar salvo inbound" : "Completar evidencia antes de priorizar"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]"><strong>Regla operativa:</strong> A = 75–100, B = 60–74, C = 45–59, IGNORE = menos de 45 salvo inbound. Sin score completo no hay Tier. Paso 36 solo puede comenzar cuando existan cuentas Tier A reales.</div>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}

function TierBadge({ tier }: { tier: Tier }) {
  if (!tier) return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d0c9bd] bg-[#eeeae3] px-2.5 py-1 text-[10px] font-semibold text-[#726b61]"><CircleDashed size={12}/> SIN TIER</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#aeb99f] bg-[#e4e8dc] px-2.5 py-1 text-[10px] font-semibold text-[#526047]"><BadgeCheck size={12}/> {tier}</span>;
}
