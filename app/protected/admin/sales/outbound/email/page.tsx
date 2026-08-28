import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmailCampaignCard from "./EmailCampaignCard";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  public_email: string | null;
  email_quality: "UNKNOWN" | "VERIFIED";
  decision_maker_name: string | null;
  decision_maker_role: string | null;
  decision_maker_quality: "UNKNOWN" | "PARTIAL" | "VERIFIED";
  icp_score: number | null;
  score_status: "UNSCORED" | "SCORED";
  prospect_tier: "A" | "B" | "C" | "IGNORE" | null;
  lead_sources_hint: number | null;
};

function firstName(name: string | null) {
  return name?.trim().split(/\s+/)[0] || null;
}

function buildDayOneCopy(item: Prospect) {
  const name = item.decision_maker_quality === "VERIFIED" ? firstName(item.decision_maker_name) : null;
  const greeting = name ? `Hola ${name},` : "Hola,";
  const context = item.lead_sources_hint && item.lead_sources_hint >= 2
    ? `vi que ${item.company_name} trabaja con varios canales de captación.`
    : `vi ${item.company_name} y la operación que tienen en ${item.city}.`;

  return {
    subject: `una consulta sobre los leads de ${item.company_name}`,
    body: `${greeting}\n\n${context} Te hago una consulta concreta: cuando entran consultas desde portales, web y WhatsApp, ¿hoy tienen una forma simple de ver cuáles quedaron esperando respuesta, qué seguimiento vence y qué oportunidad debería atender primero el equipo?\n\nEstamos construyendo RevScale en Uruguay exactamente para esa parte de la operación.\n\nNo te quiero mandar un brochure. ¿Te sirve si te paso un video de 2 minutos con el flujo?\n\n— RevScale`,
  };
}

export default async function EmailOutboundPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!platformAdmin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,department,public_email,email_quality,decision_maker_name,decision_maker_role,decision_maker_quality,icp_score,score_status,prospect_tier,lead_sources_hint")
    .eq("score_status", "SCORED")
    .in("prospect_tier", ["A", "B"])
    .eq("email_quality", "VERIFIED")
    .not("public_email", "is", null)
    .order("icp_score", { ascending: false });

  const prospects = (data || []) as Prospect[];
  const tierA = prospects.filter((item) => item.prospect_tier === "A").length;
  const tierB = prospects.filter((item) => item.prospect_tier === "B").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline B2B</Link>
          <Link href="/protected/admin/sales/prospects/validation" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Validación ICP</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Outbound · Paso 38</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Campaña de email</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Cola founder-led para cuentas Tier A/B con score completo y email público verificado. El primer contacto sigue la secuencia aprobada: problema → mecanismo → diagnóstico → cierre de loop.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="Elegibles" value={prospects.length} detail="Tier A/B + email verificado" />
          <Metric label="Tier A" value={tierA} detail="personalización 1:1" />
          <Metric label="Tier B" value={tierB} detail="secuencia por segmento" />
        </section>

        <section className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]">
          <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#6c775e]"/><div><strong>Guardrail:</strong> esta cola no incluye cuentas incompletas, Tier C/IGNORE ni emails no verificados. No dispara envíos automáticos y no marca contacto hasta que el email realmente se envía.</div></div>
        </section>

        {prospects.length ? (
          <section className="mt-8 space-y-4">
            {prospects.map((item) => {
              const copy = buildDayOneCopy(item);
              return <EmailCampaignCard key={item.id} company={item.company_name} email={item.public_email!} subject={copy.subject} body={copy.body} tier={item.prospect_tier as "A" | "B"} score={item.icp_score!} />;
            })}
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center">
            <MailCheck className="mx-auto text-[#8a7a67]" size={28}/>
            <h2 className="mt-4 font-serif text-2xl">La campaña está lista, pero todavía no hay cuentas habilitadas.</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#716a61]">Para entrar acá una cuenta debe tener los 8 criterios ICP completos, quedar en Tier A o B y conservar un email público verificado. Así evitamos convertir una hipótesis incompleta en outreach real.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}
