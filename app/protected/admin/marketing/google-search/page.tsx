import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { googleSearchCampaign } from "@/lib/marketing/google-search-campaign";

export default async function GoogleSearchPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ count: paidCount }, { count: qualifiedDemoCount }, { count: pilotCount }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id", { count: "exact", head: true }).eq("stage", "PAID").not("paid_at", "is", null),
    supabase.from("b2b_conversion_events").select("id", { count: "exact", head: true }).eq("event_type", "DEMO_COMPLETED"),
    supabase.from("b2b_opportunities").select("id", { count: "exact", head: true }).in("stage", ["PILOT_ACTIVE", "PAID"]),
  ]);

  const verifiedPaid = paidCount || 0;
  const meetsPaidGate = verifiedPaid >= googleSearchCampaign.minimumVerifiedPaidCustomers;
  const launchReady = meetsPaidGate;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#8d7553]">Fase 10 · Paso 78</p>
        <h1 className="mt-3 font-serif text-4xl">Google Search</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6e665c]">Campaña de alta intención preparada, pero el gasto permanece bloqueado hasta que el funnel cumpla el gate comercial definido por la estrategia.</p>

        <section className="mt-7 grid gap-3 md:grid-cols-4">
          <Card label="Clientes pagos verificados" value={verifiedPaid} />
          <Card label="Mínimo requerido" value={googleSearchCampaign.minimumVerifiedPaidCustomers} />
          <Card label="Demos completadas" value={qualifiedDemoCount || 0} />
          <Card label="Pilotos / pagos" value={pilotCount || 0} />
        </section>

        <section className={`mt-7 rounded-2xl border p-6 ${launchReady ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <p className="text-xs font-semibold uppercase tracking-[.15em]">{launchReady ? "READY TO LAUNCH" : "BLOCKED BY READINESS"}</p>
          <p className="mt-3 text-sm leading-6">{launchReady ? "El gate mínimo de clientes pagos está cumplido. Antes de gastar, confirmar conversión de landing y tracking en Google Ads." : `Hay ${verifiedPaid} cliente(s) pago(s) con paid_at registrado. La estrategia exige 5–10 antes de usar Google Search para amplificar el funnel.`}</p>
        </section>

        <section className="mt-7 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
          <h2 className="font-serif text-2xl">Campaña preparada</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3 text-sm">
            <div><strong>Landing</strong><br />{googleSearchCampaign.landingPath}</div>
            <div><strong>Presupuesto</strong><br />USD {googleSearchCampaign.dailyBudgetUsd}/día · {googleSearchCampaign.testDays} días</div>
            <div><strong>KPI</strong><br />Costo por demo calificada</div>
          </div>
          <div className="mt-6">
            <h3 className="font-semibold">Keywords</h3>
            <div className="mt-3 flex flex-wrap gap-2">{googleSearchCampaign.keywords.map((k) => <span key={`${k.match}-${k.text}`} className="rounded-full border border-[#d2c5b3] px-3 py-1 text-xs">{k.match}: {k.text}</span>)}</div>
          </div>
          <div className="mt-6">
            <h3 className="font-semibold">Anuncios</h3>
            <div className="mt-3 space-y-3">{googleSearchCampaign.ads.map((ad) => <article key={ad.key} className="rounded-xl border border-[#ded3c3] p-4"><p className="font-medium">{ad.headlines.join(" · ")}</p><p className="mt-2 text-sm text-[#6e665c]">{ad.descriptions[0]}</p></article>)}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-4"><p className="text-xs uppercase tracking-[.12em] text-[#8d7553]">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p></div>;
}
