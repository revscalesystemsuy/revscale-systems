import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Opportunity = {
  id: string;
  company: string;
  contact_name: string | null;
  stage: string;
  icp_score: number | null;
  tier: string | null;
  next_step: string | null;
};

type Session = {
  opportunity_id: string;
  status: string;
  disposition: string | null;
  qualification_pain_explicit: boolean | null;
  qualification_volume_sufficient: boolean | null;
  qualification_sponsor_authority: boolean | null;
  qualification_urgency_trigger: boolean | null;
  qualification_stack_fit: boolean | null;
  qualification_habit_change: boolean | null;
  qualification_economic_value: boolean | null;
  discovery_summary: string | null;
  completed_at: string | null;
};

const criteria = [
  ["qualification_pain_explicit", "Dolor explícito"],
  ["qualification_volume_sufficient", "Volumen suficiente"],
  ["qualification_sponsor_authority", "Sponsor con autoridad"],
  ["qualification_urgency_trigger", "Urgencia / trigger"],
  ["qualification_stack_fit", "Stack integrable"],
  ["qualification_habit_change", "Capacidad de cambiar hábitos"],
  ["qualification_economic_value", "Valor económico plausible"],
] as const;

export default async function QualificationPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunities } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,stage,icp_score,tier,next_step")
    .in("stage", ["CONTACTED", "QUALIFIED"])
    .order("updated_at", { ascending: false });

  const ids = (opportunities || []).map((item) => item.id);
  const { data: sessions } = ids.length ? await supabase
    .from("b2b_discovery_sessions")
    .select("opportunity_id,status,disposition,qualification_pain_explicit,qualification_volume_sufficient,qualification_sponsor_authority,qualification_urgency_trigger,qualification_stack_fit,qualification_habit_change,qualification_economic_value,discovery_summary,completed_at,updated_at")
    .in("opportunity_id", ids)
    .order("updated_at", { ascending: false }) : { data: [] } as { data: Session[] };

  const latest = new Map<string, Session>();
  for (const session of (sessions || []) as Session[]) if (!latest.has(session.opportunity_id)) latest.set(session.opportunity_id, session);

  const rows = ((opportunities || []) as Opportunity[]).map((opportunity) => {
    const session = latest.get(opportunity.id);
    const confirmed = session ? criteria.filter(([key]) => session[key] === true).length : 0;
    const unknown = session ? criteria.filter(([key]) => session[key] == null).length : 7;
    const rejected = session ? criteria.filter(([key]) => session[key] === false).length : 0;
    return { opportunity, session, confirmed, unknown, rejected };
  });

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/discovery" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a discovery</Link>
          <Link href="/protected/admin/sales" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver pipeline</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 6 · Paso 49</p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">Calificación</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">Una oportunidad solo puede quedar QUALIFIED cuando los siete criterios del Sales Playbook están confirmados explícitamente en Sí. Esta vista no interpreta texto libre ni reemplaza el criterio comercial; audita que la evidencia necesaria exista.</p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric label="Oportunidades" value={rows.length}/>
          <Metric label="7/7 confirmadas" value={rows.filter((row) => row.confirmed === 7).length}/>
          <Metric label="Con gaps" value={rows.filter((row) => row.unknown > 0).length}/>
          <Metric label="Con criterio en No" value={rows.filter((row) => row.rejected > 0).length}/>
        </section>

        <section className="mt-8 space-y-5">
          {rows.map(({ opportunity, session, confirmed, unknown, rejected }) => {
            const ready = confirmed === 7 && session?.disposition === "QUALIFIED" && session?.status === "COMPLETED";
            return (
              <article key={opportunity.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">{opportunity.stage} · {opportunity.tier === "UNSCORED" ? "sin score" : `Tier ${opportunity.tier || "—"} · ${opportunity.icp_score ?? "—"}`}</p>
                    <h2 className="mt-2 font-serif text-2xl">{opportunity.company}</h2>
                    <p className="mt-1 text-xs text-[#81786d]">{opportunity.contact_name || "Contacto pendiente"}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${ready ? "border-[#a9b39c] bg-[#e6eadf] text-[#56614f]" : "border-[#d0c1ac] bg-[#f2e9dd] text-[#75695a]"}`}>{ready ? "LISTA PARA DEMO" : `${confirmed}/7 confirmados`}</span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {criteria.map(([key, label]) => {
                    const value = session?.[key] ?? null;
                    return <Signal key={key} label={label} value={value}/>;
                  })}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <Info label="Disposición" value={session?.disposition || "Sin definir"}/>
                  <Info label="Gaps" value={unknown ? `${unknown} sin confirmar` : "0"}/>
                  <Info label="Criterios en No" value={rejected ? String(rejected) : "0"}/>
                </div>

                {session?.discovery_summary && <div className="mt-4 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-sm leading-6 text-[#625d55]"><strong>Resumen discovery:</strong> {session.discovery_summary}</div>}
                <div className="mt-4 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-xs leading-5 text-[#665f56]"><strong>Próximo paso:</strong> {opportunity.next_step || "Sin próximo paso"}</div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/protected/admin/sales/discovery/${opportunity.id}`} className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Revisar discovery <ExternalLink size={14}/></Link>
                  <Link href={`/protected/admin/sales/${opportunity.id}`} className="inline-flex items-center gap-2 rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ficha comercial</Link>
                </div>
              </article>
            );
          })}

          {!rows.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">Todavía no hay oportunidades para revisar.</div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p></div>;
}

function Signal({ label, value }: { label: string; value: boolean | null }) {
  return <div className={`rounded-xl border p-4 ${value === true ? "border-[#b7c5aa] bg-[#e5eadf]" : value === false ? "border-[#d9b7aa] bg-[#f4e4dc]" : "border-[#d8cbb8] bg-[#f7f0e6]"}`}><p className="flex items-center gap-2 text-xs font-semibold">{value === true ? <CheckCircle2 size={14}/> : <CircleAlert size={14}/>} {label}</p><p className="mt-2 text-[11px] text-[#716a61]">{value === true ? "Sí, confirmado" : value === false ? "No" : "Sin confirmar"}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p><p className="mt-2 text-sm text-[#4d4841]">{value}</p></div>;
}
