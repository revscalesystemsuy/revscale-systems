import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { metaRetargeting } from "@/lib/marketing/meta-retargeting";

export default async function MetaRetargetingPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const pixelConfigured = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);
  const [{ count: paidCount }, { count: caseStudyCount }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id", { count: "exact", head: true }).eq("stage", "PAID").not("paid_at", "is", null),
    supabase.from("b2b_case_studies").select("id", { count: "exact", head: true }).eq("status", "READY"),
  ]);

  const verifiedPaid = paidCount || 0;
  const hasProof = (caseStudyCount || 0) > 0;
  const trafficVerified = false;
  const ready = pixelConfigured && trafficVerified && verifiedPaid >= 5;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#8d7553]">Fase 10 · Paso 79</p>
        <h1 className="mt-3 font-serif text-4xl">Retargeting Meta</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6e665c]">Infraestructura preparada para visitantes y viewers de demo, pero el gasto permanece bloqueado hasta validar tamaño de audiencia, Pixel y madurez comercial.</p>

        <section className="mt-7 grid gap-3 md:grid-cols-4">
          <Card label="Pixel configurado" value={pixelConfigured ? "Sí" : "No"} />
          <Card label="Tráfico suficiente validado" value={trafficVerified ? "Sí" : "No"} />
          <Card label="Clientes pagos verificados" value={String(verifiedPaid)} />
          <Card label="Case studies READY" value={String(caseStudyCount || 0)} />
        </section>

        <section className={`mt-7 rounded-2xl border p-6 ${ready ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <p className="text-xs font-semibold uppercase tracking-[.15em]">{ready ? "READY TO LAUNCH" : "BLOCKED BY READINESS"}</p>
          <p className="mt-3 text-sm leading-6">{ready ? "Se cumplen los gates mínimos. Confirmar audiencia en Ads Manager, conversiones y billing antes de publicar." : "No se activa presupuesto todavía. Falta verificar Pixel real, tamaño útil de audiencia y el gate comercial mínimo; los logs de servidor muestran actividad pero no equivalen a una audiencia retargetable validada."}</p>
        </section>

        <section className="mt-7 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6">
          <h2 className="font-serif text-2xl">Setup preparado</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3 text-sm">
            <div><strong>Presupuesto test</strong><br />USD {metaRetargeting.minimumMonthlyBudgetUsd}–{metaRetargeting.maximumMonthlyBudgetUsd}/mes</div>
            <div><strong>Base</strong><br />Retargeting first-party, no intereses amplios</div>
            <div><strong>Consentimiento</strong><br />Pixel solo después de aceptación explícita</div>
          </div>

          <h3 className="mt-7 font-semibold">Audiencias</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">{metaRetargeting.audiences.map((audience) => <article key={audience.key} className="rounded-xl border border-[#ded3c3] p-4"><p className="font-medium">{audience.name}</p><p className="mt-1 text-xs text-[#756c61]">{audience.source} · {audience.windowDays} días</p></article>)}</div>

          <h3 className="mt-7 font-semibold">Creatividades preparadas</h3>
          <div className="mt-3 space-y-3">{metaRetargeting.concepts.map((concept) => <article key={concept.key} className="rounded-xl border border-[#ded3c3] p-4"><p className="font-medium">{concept.hook}</p><p className="mt-2 text-sm text-[#6e665c]">Visual: {concept.visual} · CTA: {concept.cta}</p></article>)}</div>
          {!hasProof ? <p className="mt-5 text-xs leading-5 text-[#7c6e5b]">Los casos de uso pueden correr como contenido ilustrativo; no usar claims de clientes hasta tener case studies READY y autorizados.</p> : null}
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-4"><p className="text-xs uppercase tracking-[.12em] text-[#8d7553]">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p></div>;
}
