import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Linkedin, MessageCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  public_email: string | null;
  whatsapp_number: string | null;
  whatsapp_quality: "UNKNOWN" | "VERIFIED";
  decision_maker_name: string | null;
  decision_maker_role: string | null;
  decision_maker_linkedin_url: string | null;
  decision_maker_quality: "UNKNOWN" | "PARTIAL" | "VERIFIED";
  icp_score: number | null;
  score_status: "UNSCORED" | "SCORED";
  prospect_tier: "A" | "B" | "C" | "IGNORE" | null;
  lead_sources_hint: number | null;
};

function firstName(value: string | null) {
  return value?.trim().split(/\s+/)[0] || null;
}

function whatsAppCopy(item: Prospect) {
  const name = item.decision_maker_quality === "VERIFIED" ? firstName(item.decision_maker_name) : null;
  const greeting = name ? `Hola ${name},` : "Hola,";
  return `${greeting} soy de RevScale, acá en Uruguay. Vi ${item.company_name} y te hago una consulta concreta: cuando entran consultas por portales, web y WhatsApp, ¿hoy tienen una forma simple de saber cuáles quedaron esperando respuesta o con seguimiento vencido? No te quiero mandar un link ni un brochure. Si te sirve, te cuento en dos líneas qué estamos resolviendo.`;
}

function linkedInCopy(item: Prospect) {
  const name = item.decision_maker_quality === "VERIFIED" ? firstName(item.decision_maker_name) : null;
  const greeting = name ? `Hola ${name},` : "Hola,";
  return `${greeting} vi ${item.company_name} y estoy investigando cómo están resolviendo las inmobiliarias uruguayas lo que pasa después de que entra una consulta: respuesta humana, próxima acción y seguimiento. Te hago una pregunta puntual: ¿hoy eso queda controlado por sistema o depende bastante de la memoria de cada agente?`;
}

function waHref(number: string, message: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default async function OutboundChannelsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,public_email,whatsapp_number,whatsapp_quality,decision_maker_name,decision_maker_role,decision_maker_linkedin_url,decision_maker_quality,icp_score,score_status,prospect_tier,lead_sources_hint")
    .eq("score_status", "SCORED")
    .in("prospect_tier", ["A", "B"])
    .order("icp_score", { ascending: false });

  const prospects = (data || []) as Prospect[];
  const whatsapp = prospects.filter((item) => item.whatsapp_number && item.whatsapp_quality === "VERIFIED");
  const linkedin = prospects.filter((item) => item.decision_maker_linkedin_url && item.decision_maker_quality === "VERIFIED");

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/outbound/email" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a email</Link>
          <Link href="/protected/admin/sales/outbound/playbook" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">CTA + videos</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Outbound · Pasos 39–40</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">WhatsApp + LinkedIn</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">Colas multicanal para cuentas Tier A/B con score completo. WhatsApp abre el chat con copy precargado pero nunca envía automáticamente; LinkedIn prioriza decisores verificados y una pregunta diagnóstica, no un pitch.</p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric label="Tier A/B" value={prospects.length} detail="score completo" />
          <Metric label="WhatsApp elegibles" value={whatsapp.length} detail="número público verificado" />
          <Metric label="LinkedIn elegibles" value={linkedin.length} detail="decisor + perfil verificados" />
        </section>

        <section className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]">
          <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#6c775e]"/><div><strong>Guardrails:</strong> no usar el mismo copy en dos canales el mismo día. WhatsApp frío no lleva links. LinkedIn no lleva brochure ni agenda. Si ya hubo contacto reciente por email, esperar la cadencia correspondiente antes de abrir otro canal.</div></div>
        </section>

        <section className="mt-9 grid gap-6 xl:grid-cols-2">
          <Channel title="WhatsApp" icon={<MessageCircle size={18}/>} count={whatsapp.length} empty="Todavía no hay Tier A/B con WhatsApp verificado.">
            {whatsapp.map((item) => {
              const copy = whatsAppCopy(item);
              return <Card key={item.id} item={item} copy={copy} actionHref={waHref(item.whatsapp_number!, copy)} actionLabel="Abrir WhatsApp" />;
            })}
          </Channel>

          <Channel title="LinkedIn" icon={<Linkedin size={18}/>} count={linkedin.length} empty="Todavía no hay Tier A/B con decisor y LinkedIn verificados.">
            {linkedin.map((item) => <Card key={item.id} item={item} copy={linkedInCopy(item)} actionHref={item.decision_maker_linkedin_url!} actionLabel="Abrir LinkedIn" />)}
          </Channel>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}

function Channel({ title, icon, count, empty, children }: { title: string; icon: React.ReactNode; count: number; empty: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:p-6"><div className="flex items-center justify-between gap-3 border-b border-[#e0d5c5] pb-4"><div className="flex items-center gap-2"><span className="text-[#756247]">{icon}</span><h2 className="font-serif text-2xl">{title}</h2></div><span className="rounded-full border border-[#c8b89f] bg-[#f7f0e6] px-3 py-1 text-xs font-semibold">{count}</span></div><div className="mt-4 space-y-4">{count ? children : <div className="rounded-xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-8 text-center text-xs text-[#81786d]">{empty}</div>}</div></section>;
}

function Card({ item, copy, actionHref, actionLabel }: { item: Prospect; copy: string; actionHref: string; actionLabel: string }) {
  return <article className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{item.company_name}</h3><p className="mt-1 text-xs text-[#716a61]">{item.decision_maker_name || "Sin decisor"}{item.decision_maker_role ? ` · ${item.decision_maker_role}` : ""}</p></div><span className="rounded-full border border-[#d0c1ac] bg-[#efe5d6] px-2 py-1 text-[10px] font-semibold">{item.prospect_tier} · {item.icp_score}</span></div><div className="mt-4 rounded-lg border border-[#ddd1c0] bg-[#f7f0e6] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">Copy sugerido</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#4d4841]">{copy}</p></div><a href={actionHref} target="_blank" rel="noreferrer" className="mt-4 block rounded-lg bg-[#302d28] px-3 py-2.5 text-center text-xs font-semibold text-[#fffaf2]">{actionLabel}</a></article>;
}
