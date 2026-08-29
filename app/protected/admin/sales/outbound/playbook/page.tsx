import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDot, Film, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  decision_maker_name: string | null;
  decision_maker_role: string | null;
  decision_maker_quality: "UNKNOWN" | "PARTIAL" | "VERIFIED";
  team_size_hint: number | null;
  lead_sources_hint: number | null;
  score_signal_count: number;
  score_status: "UNSCORED" | "SCORED";
  prospect_tier: "A" | "B" | "C" | "IGNORE" | null;
  icp_score: number | null;
};

function firstName(value: string | null) {
  return value?.trim().split(/\s+/)[0] || null;
}

function evidenceContext(item: Prospect) {
  if (item.lead_sources_hint && item.lead_sources_hint >= 2 && item.team_size_hint) {
    return `Vi que ${item.company_name} trabaja con varios canales de captación y un equipo de aproximadamente ${item.team_size_hint} personas.`;
  }
  if (item.lead_sources_hint && item.lead_sources_hint >= 2) {
    return `Vi que ${item.company_name} trabaja con varios canales de captación.`;
  }
  if (item.team_size_hint) {
    return `Vi que ${item.company_name} coordina un equipo de aproximadamente ${item.team_size_hint} personas.`;
  }
  return `Estuve mirando la operación de ${item.company_name} en ${item.city}.`;
}

function buildVideoBrief(item: Prospect) {
  const name = item.decision_maker_quality === "VERIFIED" ? firstName(item.decision_maker_name) : null;
  const greeting = name ? `Hola ${name},` : "Hola,";
  const context = evidenceContext(item);

  return [
    `${greeting} gracias por darme el ok para pasarte esto. ${context}`,
    "La parte que quiero mostrarte no es otro portal ni un reemplazo completo del sistema: es cómo ordenar lo que pasa después de que entra una consulta.",
    "En RevScale la idea es que el equipo pueda ver en una misma cola qué lead está esperando respuesta, qué seguimiento vence, qué oportunidad tiene más intención y qué contacto conviene reactivar.",
    "Después, con matching y reactivación, el sistema ayuda a volver sobre oportunidades que ya estaban en la base cuando aparece una propiedad o una señal comercial relevante.",
    "Si esto se parece a un problema que hoy tienen, lo vemos 15 minutos sobre un caso real de su operación. Si no, con este video ya tenés claro el enfoque.",
  ].join("\n\n");
}

function ctaState(item: Prospect) {
  if (item.score_status === "SCORED" && (item.prospect_tier === "A" || item.prospect_tier === "B")) {
    return {
      label: "CTA permitido",
      detail: "Pedir permiso para enviar video de 2 minutos. No enviar el video sin respuesta afirmativa.",
      eligible: true,
    };
  }
  return {
    label: "Todavía no",
    detail: `Completar ICP primero (${item.score_signal_count}/8 señales). El video queda preparado, pero no se usa todavía.`,
    eligible: false,
  };
}

export default async function OutboundPlaybookPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,department,decision_maker_name,decision_maker_role,decision_maker_quality,team_size_hint,lead_sources_hint,score_signal_count,score_status,prospect_tier,icp_score")
    .eq("status", "READY")
    .gte("score_signal_count", 5)
    .order("score_signal_count", { ascending: false })
    .order("company_name", { ascending: true });

  const prospects = (data || []) as Prospect[];
  const eligible = prospects.filter((item) => item.score_status === "SCORED" && (item.prospect_tier === "A" || item.prospect_tier === "B"));

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/outbound/email" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a campaña de email</Link>
          <Link href="/protected/admin/sales/followups" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver follow-ups</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Outbound · Pasos 44 y 45</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">CTA + video personalizado</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">Define exactamente qué pedir en cada etapa y deja preparado un guion 1:1 para grabar únicamente después de que el prospecto dé permiso. El video no se usa como adjunto frío ni sustituye el discovery.</p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric label="Cohorte preparada" value={prospects.length} detail="READY con 5+ señales" />
          <Metric label="Video habilitado" value={eligible.length} detail="Tier A/B + score completo" />
          <Metric label="Duración objetivo" value="90–120 s" detail="una idea, un caso, un CTA" />
        </section>

        <section className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]">
          <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#6c775e]"/><div><strong>Guardrail:</strong> en frío el CTA es pedir permiso. Sin respuesta afirmativa no se manda video, link de agenda, brochure ni precio. La llamada aparece recién cuando el prospecto reconoce un dolor o interés real.</div></div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-4">
          <CtaStep number="1" title="Validación ICP" text="Una sola pregunta cerrada. No vender, no mostrar producto." />
          <CtaStep number="2" title="Primer email formal" text="¿Te sirve si te paso un video de 2 minutos con el flujo?" />
          <CtaStep number="3" title="Después del sí" text="Enviar video personalizado. Sin Calendly dentro del primer envío." />
          <CtaStep number="4" title="Dolor confirmado" text="Proponer 15 minutos sobre un caso real y un siguiente paso concreto." />
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8d7553]">Paso 45</p><h2 className="mt-2 font-serif text-3xl">Briefs personalizados</h2></div>
            <p className="max-w-xl text-right text-xs leading-5 text-[#81786d]">Se generan solo con datos ya verificados. Ningún guion inventa CRM, dolor, volumen o proceso interno.</p>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {prospects.map((item) => {
              const state = ctaState(item);
              return (
                <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">{item.score_signal_count}/8 señales</p><h3 className="mt-2 font-serif text-2xl">{item.company_name}</h3><p className="mt-1 text-xs text-[#81786d]">{item.decision_maker_name || "Decisor pendiente"}{item.decision_maker_role ? ` · ${item.decision_maker_role}` : ""}</p></div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${state.eligible ? "border-[#a9b39c] bg-[#e6eadf] text-[#56614f]" : "border-[#d0c1ac] bg-[#f2e9dd] text-[#75695a]"}`}>{state.label}</span>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4">
                    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]"><CircleDot size={12}/> Regla de uso</p>
                    <p className="mt-2 text-xs leading-5 text-[#665f56]">{state.detail}</p>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#ded2c1] bg-white/50 p-4">
                    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]"><Film size={13}/> Guion de 90–120 segundos</p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#4d4841]">{buildVideoBrief(item)}</p>
                  </div>
                </article>
              );
            })}

            {!prospects.length && <div className="xl:col-span-2 rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">Todavía no hay cuentas READY con 5 o más señales para preparar briefs.</div>}
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#c8c1ad] bg-[#e9e7dc] p-5 text-sm leading-6 text-[#625d55]"><strong>Qué sigue:</strong> el guion queda listo dentro de RevScale. La grabación es una tarea humana porque debe salir con presencia/voz real del fundador o vendedor. El sistema sí controla quién puede recibirlo y en qué momento.</div>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}

function CtaStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#baa98f] bg-[#efe5d6] font-serif text-lg">{number}</div><h3 className="mt-4 font-serif text-xl">{title}</h3><p className="mt-2 text-xs leading-5 text-[#716a61]">{text}</p><CheckCircle2 className="mt-4 text-[#7a806d]" size={16}/></div>;
}
