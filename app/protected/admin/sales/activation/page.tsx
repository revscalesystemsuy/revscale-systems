import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Opportunity = { id: string; company: string; contact_name: string | null; stage: string; next_step: string | null };
type Baseline = { opportunity_id: string; status: string };
type Score = { opportunity_id: string; score_total: number; band: "ACTIVATED" | "RISK" | "CRITICAL"; evaluated_at: string };

export default async function ActivationQueuePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunityData }, { data: baselineData }, { data: scoreData }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step").in("stage", ["PILOT_ACTIVE","PAID"]).order("updated_at", { ascending: false }),
    supabase.from("b2b_pilot_baselines").select("opportunity_id,status"),
    supabase.from("b2b_activation_scores").select("opportunity_id,score_total,band,evaluated_at").order("evaluated_at", { ascending: false }),
  ]);

  const opportunities = (opportunityData || []) as Opportunity[];
  const baselines = new Map(((baselineData || []) as Baseline[]).map((x) => [x.opportunity_id, x.status]));
  const latestScores = new Map<string, Score>();
  for (const score of (scoreData || []) as Score[]) if (!latestScores.has(score.opportunity_id)) latestScores.set(score.opportunity_id, score);
  const eligible = opportunities.filter((x) => baselines.get(x.id) === "LOCKED");
  const activated = eligible.filter((x) => latestScores.get(x.id)?.band === "ACTIVATED").length;
  const risk = eligible.filter((x) => latestScores.get(x.id)?.band === "RISK").length;
  const critical = eligible.filter((x) => latestScores.get(x.id)?.band === "CRITICAL").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/admin/sales/baseline" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a baseline</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 7 · Paso 58</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Activation Score</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Mide si RevScale ya se convirtió en una rutina operativa. Cada señal que suma puntos debe tener evidencia.</p></div>
        <section className="mt-8 grid gap-4 md:grid-cols-3"><Summary icon={<CheckCircle2 size={17}/>} label="Activadas" value={activated}/><Summary icon={<Activity size={17}/>} label="En riesgo" value={risk}/><Summary icon={<AlertTriangle size={17}/>} label="Críticas" value={critical}/></section>
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {eligible.map((item) => {
            const score = latestScores.get(item.id);
            return <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-start justify-between gap-4"><div><Link href={`/protected/admin/sales/activation/${item.id}`} className="font-serif text-2xl underline decoration-[#b8a487] underline-offset-4">{item.company}</Link><p className="mt-1 text-xs text-[#746c62]">{item.contact_name || "Contacto pendiente"} · {item.stage}</p></div><span className="rounded-full border border-[#cdbda5] bg-[#eee4d5] px-3 py-1 text-[10px] font-semibold">{score ? `${score.score_total}/100 · ${score.band}` : "SIN MEDIR"}</span></div><p className="mt-4 text-xs leading-5 text-[#81786d]">Próximo paso: {item.next_step || "Calcular Activation Score"}</p></article>;
          })}
          {!eligible.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-8 text-center text-sm text-[#81786d] lg:col-span-2">Todavía no hay cuentas con baseline bloqueado listas para Activation Score.</div>}
        </section>
      </div>
    </main>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
