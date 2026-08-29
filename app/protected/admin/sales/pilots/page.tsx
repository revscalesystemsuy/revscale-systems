import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FlaskConical, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function PilotsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunities } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,stage,next_step,pilot_proposed_at,pilot_started_at")
    .in("stage", ["PILOT_PROPOSED", "PILOT_ACTIVE"])
    .order("updated_at", { ascending: false });

  const ids = (opportunities || []).map((item) => item.id);
  const { data: agreements } = ids.length ? await supabase
    .from("b2b_pilot_agreements")
    .select("opportunity_id,status,sponsor_name,target_start_date,decision_metrics,updated_at")
    .in("opportunity_id", ids)
    .order("updated_at", { ascending: false }) : { data: [] } as { data: any[] };

  const latest = new Map<string, any>();
  for (const agreement of agreements || []) if (!latest.has(agreement.opportunity_id)) latest.set(agreement.opportunity_id, agreement);

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 6 · Paso 52</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">Revenue Recovery Pilot</h1><p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">El piloto no empieza cuando se envía una propuesta. Primero deben quedar claros alcance, sponsor, champion y las tres métricas que decidirán continuidad al día 45.</p></div>
        <section className="mt-8 grid gap-4 md:grid-cols-3"><Metric label="Propuestos" value={(opportunities || []).filter((x) => x.stage === "PILOT_PROPOSED").length}/><Metric label="Aceptados" value={[...latest.values()].filter((x) => x.status === "ACCEPTED").length}/><Metric label="Activos" value={(opportunities || []).filter((x) => x.stage === "PILOT_ACTIVE").length}/></section>
        <section className="mt-8 space-y-4">
          {(opportunities || []).map((item) => { const agreement = latest.get(item.id); return (
            <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">{item.stage}</p><h2 className="mt-2 font-serif text-2xl">{item.company}</h2><p className="mt-1 text-xs text-[#81786d]">{item.contact_name || "Contacto pendiente"}</p></div><span className="rounded-full border border-[#cbbda8] bg-[#efe5d6] px-3 py-1 text-[10px] font-semibold">{agreement ? agreement.status : "SIN ACUERDO"}</span></div>
              <div className="mt-4 grid gap-3 md:grid-cols-3"><Info label="Sponsor" value={agreement?.sponsor_name || "Pendiente"}/><Info label="Inicio objetivo" value={agreement?.target_start_date || "Pendiente"}/><Info label="Métricas" value={`${agreement?.decision_metrics?.length || 0}/3`}/></div>
              <div className="mt-4 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-xs leading-5 text-[#665f56]"><strong>Próximo paso:</strong> {item.next_step || "Sin próximo paso"}</div>
              <div className="mt-4 flex flex-wrap gap-3"><Link href={`/protected/admin/sales/pilots/${item.id}`} className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]"><FlaskConical size={15}/>{agreement ? "Abrir piloto" : "Preparar piloto"}</Link><Link href={`/protected/admin/sales/${item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ficha <ExternalLink size={14}/></Link></div>
            </article>
          ); })}
          {!opportunities?.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">Todavía no hay pilotos propuestos o activos.</div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p><p className="mt-2 text-sm text-[#4d4841]">{value}</p></div>; }
