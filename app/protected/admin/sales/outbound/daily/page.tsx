import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Gauge, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { registerDailyFirstTouch } from "./actions";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  decision_maker_name: string | null;
  decision_maker_role: string | null;
  public_email: string | null;
  email_quality: "UNKNOWN" | "VERIFIED";
  whatsapp_number: string | null;
  whatsapp_quality: "UNKNOWN" | "VERIFIED";
  decision_maker_linkedin_url: string | null;
  decision_maker_quality: "UNKNOWN" | "PARTIAL" | "VERIFIED";
  icp_score: number;
  prospect_tier: "A" | "B";
};

type Opportunity = {
  source_id: string | null;
  acquisition_campaign: string | null;
  last_contact_at: string | null;
};

function montevideoKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function bestChannel(item: Prospect) {
  if (item.whatsapp_number && item.whatsapp_quality === "VERIFIED") return "WHATSAPP" as const;
  if (item.public_email && item.email_quality === "VERIFIED") return "EMAIL" as const;
  if (item.decision_maker_linkedin_url && item.decision_maker_quality === "VERIFIED") return "LINKEDIN" as const;
  return null;
}

export default async function DailyOutboundPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const messages = await searchParams;
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

  const [{ data: prospectData }, { data: opportunityData }] = await Promise.all([
    supabase
      .from("b2b_prospects")
      .select("id,company_name,city,department,decision_maker_name,decision_maker_role,public_email,email_quality,whatsapp_number,whatsapp_quality,decision_maker_linkedin_url,decision_maker_quality,icp_score,prospect_tier")
      .eq("score_status", "SCORED")
      .in("prospect_tier", ["A", "B"])
      .order("icp_score", { ascending: false }),
    supabase
      .from("b2b_opportunities")
      .select("source_id,acquisition_campaign,last_contact_at")
      .eq("acquisition_campaign", "GTM_PROPERTYOS_FORMAL_OUTBOUND"),
  ]);

  const prospects = (prospectData || []) as Prospect[];
  const opportunities = (opportunityData || []) as Opportunity[];
  const todayKey = montevideoKey(new Date());
  const touchedToday = new Set(
    opportunities
      .filter((item) => item.source_id && item.last_contact_at && montevideoKey(new Date(item.last_contact_at)) === todayKey)
      .map((item) => item.source_id as string),
  );

  const eligible = prospects.filter((item) => bestChannel(item));
  const queue = eligible.filter((item) => !touchedToday.has(item.id)).slice(0, 15);
  const completedToday = eligible.filter((item) => touchedToday.has(item.id)).length;
  const remaining = Math.max(0, 15 - completedToday);

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/protected/admin/sales/outbound/channels" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Canales</Link>
            <Link href="/protected/admin/sales/followups" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Follow-ups</Link>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Outbound · Paso 47</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">15 cuentas nuevas por día</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">Rutina founder-led para mantener volumen sin perder calidad. La cola solo admite cuentas con los 8 criterios ICP completos, Tier A/B y al menos un canal verificable.</p>
        </div>

        {messages.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric label="Meta diaria" value="15" detail="cuentas nuevas" />
          <Metric label="Hechas hoy" value={completedToday} detail="primer touch registrado" />
          <Metric label="Restantes" value={remaining} detail="hasta la meta" />
          <Metric label="Elegibles totales" value={eligible.length} detail="Tier A/B + canal" />
        </section>

        <section className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]">
          <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#6c775e]"/><div><strong>Regla:</strong> primero se envía el contacto por el canal correspondiente; recién después se pulsa “Registrar touch”. Registrar no envía mensajes. Además, una cuenta tocada hoy sale automáticamente de la cola.</div></div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Cola de hoy</p><h2 className="mt-2 font-serif text-3xl">Siguientes cuentas</h2></div>
            <div className="flex items-center gap-2 text-xs text-[#716a61]"><Gauge size={15}/>{queue.length} listas para trabajar</div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {queue.map((item, index) => {
              const channel = bestChannel(item)!;
              return (
                <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">#{index + 1} · Tier {item.prospect_tier} · {item.icp_score}/100</p><h3 className="mt-2 font-serif text-2xl">{item.company_name}</h3><p className="mt-1 text-xs text-[#81786d]">{item.decision_maker_name || "Decisor pendiente"}{item.decision_maker_role ? ` · ${item.decision_maker_role}` : ""}</p></div>
                    <span className="rounded-full border border-[#c5b69f] bg-[#efe5d6] px-3 py-1 text-[10px] font-semibold">{channel}</span>
                  </div>

                  <div className="mt-4 grid gap-2 rounded-xl border border-[#ded2c1] bg-[#f7f0e6] p-4 text-xs text-[#625d55]">
                    <p><strong>Ubicación:</strong> {item.city}, {item.department}</p>
                    {item.public_email && <p><strong>Email:</strong> {item.public_email}</p>}
                    {item.whatsapp_number && <p><strong>WhatsApp:</strong> {item.whatsapp_number}</p>}
                    {item.decision_maker_linkedin_url && <p className="break-all"><strong>LinkedIn:</strong> {item.decision_maker_linkedin_url}</p>}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/protected/admin/sales/outbound/email" className="rounded-lg border border-[#cfc1ad] bg-[#fffaf2] px-3 py-2 text-xs font-semibold">Abrir copy email</Link>
                    <Link href="/protected/admin/sales/outbound/channels" className="rounded-lg border border-[#cfc1ad] bg-[#fffaf2] px-3 py-2 text-xs font-semibold">Abrir copy multicanal</Link>
                    <Link href="/protected/admin/sales/outbound/playbook" className="rounded-lg border border-[#cfc1ad] bg-[#fffaf2] px-3 py-2 text-xs font-semibold">CTA + video</Link>
                  </div>

                  <form action={registerDailyFirstTouch} className="mt-4 border-t border-[#e0d5c5] pt-4">
                    <input type="hidden" name="prospect_id" value={item.id}/>
                    <input type="hidden" name="channel" value={channel}/>
                    <button className="w-full rounded-lg bg-[#302d28] px-4 py-3 text-xs font-semibold text-[#fffaf2]">Registrar touch enviado por {channel}</button>
                  </form>
                </article>
              );
            })}

            {!queue.length && (
              <div className="xl:col-span-2 rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center">
                <CheckCircle2 className="mx-auto text-[#8a7a67]" size={28}/>
                <h3 className="mt-4 font-serif text-2xl">No hay cuentas habilitadas para la cola de hoy.</h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#716a61]">Si todavía no existen Tier A/B con score completo, hay que volver a Validación ICP. La rutina no rebaja el estándar para cumplir artificialmente la meta de 15.</p>
                <Link href="/protected/admin/sales/prospects/validation" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]"><CalendarClock size={15}/> Ir a Validación ICP</Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}
