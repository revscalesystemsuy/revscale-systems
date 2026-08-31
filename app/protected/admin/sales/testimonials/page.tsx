import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TestimonialsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunities }, { data: testimonials }, { data: reports }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company_name,stage,next_step").in("stage", ["PILOT_ACTIVE","PAID"]).order("updated_at", { ascending: false }),
    supabase.from("b2b_testimonials").select("opportunity_id,status,requested_at,approved_at,quote_consent,logo_consent,metrics_consent,updated_at"),
    supabase.from("b2b_pilot_reports").select("opportunity_id,status,report_day").eq("report_day", 45),
  ]);

  const testimonialByOpportunity = new Map((testimonials || []).map((x) => [x.opportunity_id, x]));
  const reportByOpportunity = new Map((reports || []).map((x) => [x.opportunity_id, x]));
  const eligible = (opportunities || []).filter((opportunity) => reportByOpportunity.get(opportunity.id)?.status === "FINAL");

  const counts = eligible.reduce((acc, opportunity) => {
    const status = testimonialByOpportunity.get(opportunity.id)?.status || "ELIGIBLE";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 24, marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", opacity: 0.6 }}>Proof Engine · Paso 62</p>
          <h1 style={{ margin: "6px 0 8px", fontSize: 34 }}>Testimonios</h1>
          <p style={{ margin: 0, opacity: 0.72, maxWidth: 760 }}>Solo aparecen cuentas con reporte final de día 45. Una quote, logo o métrica se usa únicamente si el consentimiento correspondiente quedó registrado.</p>
        </div>
        <Link href="/protected/admin/sales" style={{ textDecoration: "none" }}>Volver a ventas</Link>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12, marginBottom: 24 }}>
        {["ELIGIBLE","REQUESTED","RECEIVED","APPROVED","DECLINED","REVOKED"].map((status) => (
          <div key={status} style={{ border: "1px solid rgba(127,127,127,.2)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.58 }}>{status}</div>
            <div style={{ fontSize: 28, marginTop: 6 }}>{counts[status] || 0}</div>
          </div>
        ))}
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        {eligible.length === 0 ? (
          <div style={{ border: "1px dashed rgba(127,127,127,.3)", borderRadius: 18, padding: 28 }}>
            Todavía no hay cuentas elegibles. El testimonio se habilita después de un reporte real y FINAL de día 45.
          </div>
        ) : eligible.map((opportunity) => {
          const testimonial = testimonialByOpportunity.get(opportunity.id);
          const status = testimonial?.status || "ELIGIBLE";
          return (
            <Link key={opportunity.id} href={`/protected/admin/sales/testimonials/${opportunity.id}`} style={{ color: "inherit", textDecoration: "none" }}>
              <article style={{ border: "1px solid rgba(127,127,127,.2)", borderRadius: 18, padding: 20, display: "grid", gridTemplateColumns: "1.6fr .8fr 1fr", gap: 18, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{opportunity.company_name || "Cuenta sin nombre"}</div>
                  <div style={{ marginTop: 5, opacity: 0.62, fontSize: 13 }}>{opportunity.next_step || "Sin próximo paso"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.55 }}>Estado</div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>{status}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.68 }}>
                  Quote: {testimonial?.quote_consent ? "sí" : "no"} · Logo: {testimonial?.logo_consent ? "sí" : "no"} · Métricas: {testimonial?.metrics_consent ? "sí" : "no"}
                </div>
              </article>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
