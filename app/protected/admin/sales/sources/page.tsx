import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, Megaphone, Route, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateB2BAcquisitionSource } from "./actions";

type Opportunity = {
  id: string;
  company: string;
  contact_name: string | null;
  stage: string;
  tier: string;
  source_type: string;
  acquisition_source: string;
  acquisition_detail: string | null;
  acquisition_campaign: string | null;
  created_at: string;
};

const sourceLabels: Record<string, string> = {
  UNKNOWN: "Sin atribuir",
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
  REFERRAL: "Referral",
  PARTNER: "Partner",
  OUTBOUND: "Outbound",
  EVENT: "Evento",
  OTHER: "Otro",
};

const sourceOptions = Object.keys(sourceLabels);

export default async function B2BSourcesPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,stage,tier,source_type,acquisition_source,acquisition_detail,acquisition_campaign,created_at")
    .order("created_at", { ascending: false });
  const opportunities = (data || []) as Opportunity[];
  const counts = sourceOptions.map((source) => ({ source, count: opportunities.filter((item) => item.acquisition_source === source).length })).filter((item) => item.count > 0);
  const unattributed = opportunities.filter((item) => item.acquisition_source === "UNKNOWN").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
          <Link href="/protected/admin/sales/metrics" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver métricas</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Sales Ops interno</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Fuentes B2B</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Atribución comercial separada del origen técnico. `PLAN_REQUEST` o `WEBSITE_DIAGNOSTIC` explican cómo nació el registro; Website, Outbound, Referral o Partner explican de dónde llegó la oportunidad.</p>
        </div>

        {messages.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Route size={16}/>} label="Oportunidades" value={opportunities.length} detail="registros B2B"/>
          <Stat icon={<Megaphone size={16}/>} label="Fuentes activas" value={counts.length} detail="orígenes con al menos una oportunidad"/>
          <Stat icon={<Tag size={16}/>} label="Sin atribuir" value={unattributed} detail="requieren clasificación"/>
          <Stat icon={<Building2 size={16}/>} label="Website" value={opportunities.filter((item) => item.acquisition_source === "WEBSITE").length} detail="formularios públicos actuales"/>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Distribución actual</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{counts.map((row) => <div key={row.source} className="flex items-center justify-between rounded-lg border border-[#ddd1c0] bg-[#fffaf2] px-4 py-3 text-sm"><span>{sourceLabels[row.source]}</span><strong>{row.count}</strong></div>)}</div>
        </section>

        <section className="mt-8 space-y-4">
          {opportunities.map((item) => (
            <form key={item.id} action={updateB2BAcquisitionSource} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5 md:p-6">
              <input type="hidden" name="opportunity_id" value={item.id}/>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-serif text-2xl">{item.company}</h2><p className="mt-1 text-xs text-[#81786d]">{item.contact_name || "Sin contacto"} · {item.stage} · {item.tier === "UNSCORED" ? "Sin score" : `Tier ${item.tier}`}</p></div>
                <span className="rounded-full border border-[#d3c5b1] bg-[#efe5d6] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#71614b]">Origen técnico: {item.source_type}</span>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#81796e]">Origen comercial</span><select name="acquisition_source" defaultValue={item.acquisition_source} className="field">{sourceOptions.map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}</select></label>
                <label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#81796e]">Detalle</span><input name="acquisition_detail" maxLength={240} defaultValue={item.acquisition_detail || ""} className="field" placeholder="Ej. referido por cliente / mensaje founder"/></label>
                <label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#81796e]">Campaña</span><input name="acquisition_campaign" maxLength={160} defaultValue={item.acquisition_campaign || ""} className="field" placeholder="Ej. outbound-tier-a-01"/></label>
              </div>
              <button className="mt-4 rounded-lg bg-[#302d28] px-5 py-2.5 text-sm font-semibold text-[#fffaf2]">Guardar atribución</button>
            </form>
          ))}
          {!opportunities.length && <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">Todavía no hay oportunidades B2B.</div>}
        </section>
      </div>
      <style>{`.field{width:100%;border:1px solid #cfc1ad;background:#f7f0e6;border-radius:.5rem;padding:.7rem .8rem;color:#403b34;outline:none}.field:focus{border-color:#9d8767}`}</style>
    </main>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div> }
