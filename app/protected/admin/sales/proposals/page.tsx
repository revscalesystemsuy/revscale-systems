import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ProposalsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunities } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,stage,next_step,icp_score,tier,demo_completed_at,pilot_proposed_at")
    .in("stage", ["QUALIFIED","DEMO_BOOKED","DEMO_COMPLETED","PILOT_PROPOSED"])
    .order("updated_at", { ascending: false });

  const ids = (opportunities || []).map((x) => x.id);
  const { data: proposals } = ids.length ? await supabase
    .from("b2b_proposals")
    .select("id,opportunity_id,status,plan_name,quoted_price_usd,pilot_days,onboarding_days,updated_at")
    .in("opportunity_id", ids)
    .order("updated_at", { ascending: false }) : { data: [] } as { data: any[] };

  const latest = new Map<string, any>();
  for (const proposal of proposals || []) if (!latest.has(proposal.opportunity_id)) latest.set(proposal.opportunity_id, proposal);

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 6 · Paso 51</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Propuesta comercial</h1><p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">La propuesta resume únicamente evidencia del discovery y la traduce en cambio de proceso, implementación, medición y costo. No es un brochure de funcionalidades.</p></div>
        <section className="mt-8 grid gap-4 md:grid-cols-3"><Metric label="En cola" value={(opportunities || []).length}/><Metric label="Con propuesta" value={latest.size}/><Metric label="Enviadas" value={[...latest.values()].filter((x) => x.status === "SENT").length}/></section>
        <section className="mt-8 space-y-4">
          {(opportunities || []).map((item) => { const proposal = latest.get(item.id); return (
            <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">{item.stage} · {item.tier === "UNSCORED" ? "sin score" : `Tier ${item.tier || "—"} · ${item.icp_score ?? "—"}`}</p><h2 className="mt-2 font-serif text-2xl">{item.company}</h2><p className="mt-1 text-xs text-[#81786d]">{item.contact_name || "Contacto pendiente"}</p></div><span className="rounded-full border border-[#cbbda8] bg-[#efe5d6] px-3 py-1 text-[10px] font-semibold">{proposal ? `${proposal.status} · ${proposal.plan_name} · USD ${proposal.quoted_price_usd}` : "SIN PROPUESTA"}</span></div>
              <div className="mt-4 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-xs leading-5 text-[#665f56]"><strong>Próximo paso:</strong> {item.next_step || "Sin próximo paso"}</div>
              <div className="mt-4 flex flex-wrap gap-3"><Link href={`/protected/admin/sales/proposals/${item.id}`} className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]"><FileText size={15}/>{proposal ? "Abrir propuesta" : "Crear propuesta"}</Link><Link href={`/protected/admin/sales/${item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ficha <ExternalLink size={14}/></Link></div>
            </article>
          ); })}
          {!opportunities?.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">Todavía no hay oportunidades calificadas listas para propuesta.</div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
