import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveTestimonial, closeTestimonial, markTestimonialRequested, saveTestimonialResponse } from "../actions";

const requestTemplate = `Gracias por participar del piloto de RevScale PropertyOS. Cerramos el día 45 y quiero pedirte una devolución breve y concreta sobre el proceso.

Idealmente: qué problema operativo tenían antes, qué cambió en la rutina del equipo y qué resultado o mejora observaste personalmente.

No vamos a publicar nada sin tu aprobación expresa. También podés autorizar por separado nombre de empresa, nombre/cargo, logo, quote y métricas.`;

export default async function TestimonialDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunity }, { data: report }, { data: testimonial }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company_name,stage,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_pilot_reports").select("id,status,report_day,executive_summary,observed_outcomes,attribution_notes,limitations,recommendation,decision_metric_snapshot,core_metric_snapshot").eq("opportunity_id", id).eq("report_day", 45).maybeSingle(),
    supabase.from("b2b_testimonials").select("*").eq("opportunity_id", id).maybeSingle(),
  ]);

  if (!opportunity) redirect("/protected/admin/sales/testimonials");
  const eligible = report?.status === "FINAL";

  return (
    <main style={{ maxWidth: 1020, margin: "0 auto", padding: "32px 24px 64px" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/protected/admin/sales/testimonials" style={{ textDecoration: "none" }}>← Testimonios</Link>
        <p style={{ margin: "22px 0 0", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, opacity: 0.55 }}>Paso 62 · {testimonial?.status || (eligible ? "ELIGIBLE" : "NO ELIGIBLE")}</p>
        <h1 style={{ margin: "6px 0 8px", fontSize: 34 }}>{opportunity.company_name || "Cuenta"}</h1>
        <p style={{ margin: 0, opacity: 0.68 }}>{opportunity.next_step || "Sin próximo paso"}</p>
      </div>

      {query.error ? <div style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(180,70,70,.35)", marginBottom: 18 }}>{query.error}</div> : null}
      {query.success ? <div style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(70,150,90,.35)", marginBottom: 18 }}>{query.success}</div> : null}

      {!eligible ? (
        <section style={{ border: "1px dashed rgba(127,127,127,.3)", borderRadius: 18, padding: 24 }}>
          Se requiere reporte FINAL de día 45. No se debe pedir testimonio antes de cerrar evidencia, atribución y limitaciones del piloto.
        </section>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ border: "1px solid rgba(127,127,127,.2)", borderRadius: 18, padding: 22 }}>
            <h2 style={{ marginTop: 0 }}>Evidencia antes de pedirlo</h2>
            <p><strong>Resultados observados:</strong> {report?.observed_outcomes}</p>
            <p><strong>Atribución:</strong> {report?.attribution_notes}</p>
            <p><strong>Limitaciones:</strong> {report?.limitations}</p>
          </section>

          {(!testimonial || testimonial.status === "ELIGIBLE" || testimonial.status === "REQUESTED") && !["DECLINED","REVOKED","APPROVED"].includes(testimonial?.status || "") ? (
            <section style={{ border: "1px solid rgba(127,127,127,.2)", borderRadius: 18, padding: 22 }}>
              <h2 style={{ marginTop: 0 }}>1. Registrar solicitud</h2>
              <form action={markTestimonialRequested} style={{ display: "grid", gap: 12 }}>
                <input type="hidden" name="opportunity_id" value={id} />
                <label>Canal<input name="request_channel" defaultValue={testimonial?.request_channel || "Email / WhatsApp"} required style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <label>Copy exacto<textarea name="request_copy" defaultValue={testimonial?.request_copy || requestTemplate} rows={9} required style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <button type="submit" style={{ width: "fit-content", padding: "10px 16px" }}>Registrar solicitud enviada</button>
              </form>
            </section>
          ) : null}

          {testimonial && ["REQUESTED","RECEIVED"].includes(testimonial.status) ? (
            <section style={{ border: "1px solid rgba(127,127,127,.2)", borderRadius: 18, padding: 22 }}>
              <h2 style={{ marginTop: 0 }}>2. Registrar respuesta y permisos</h2>
              <form action={saveTestimonialResponse} style={{ display: "grid", gap: 12 }}>
                <input type="hidden" name="opportunity_id" value={id} />
                <label>Nombre de quien responde<input name="respondent_name" defaultValue={testimonial.respondent_name || ""} style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <label>Cargo<input name="respondent_role" defaultValue={testimonial.respondent_role || ""} style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <label>Testimonio recibido<textarea name="testimonial_text" defaultValue={testimonial.testimonial_text || ""} rows={7} required style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <label>Resultado específico mencionado<textarea name="specific_outcome_reference" defaultValue={testimonial.specific_outcome_reference || ""} rows={3} style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <label>Evidencia de consentimiento<textarea name="consent_evidence" defaultValue={testimonial.consent_evidence || ""} rows={4} required placeholder="Ej.: email del 15/09/2026 donde autoriza quote y nombre de empresa." style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <div style={{ display: "grid", gap: 7 }}>
                  {[
                    ["company_name_consent","Usar nombre de empresa"],
                    ["person_name_consent","Usar nombre de la persona"],
                    ["role_consent","Usar cargo"],
                    ["logo_consent","Usar logo"],
                    ["metrics_consent","Usar métricas identificadas"],
                    ["quote_consent","Publicar la quote"],
                    ["anonymized_metrics_consent","Usar métricas anonimizadas"],
                  ].map(([name,label]) => <label key={name}><input type="checkbox" name={name} defaultChecked={Boolean(testimonial[name as keyof typeof testimonial])} /> {label}</label>)}
                </div>
                <label>Notas<textarea name="notes" defaultValue={testimonial.notes || ""} rows={3} style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <button type="submit" style={{ width: "fit-content", padding: "10px 16px" }}>Guardar respuesta</button>
              </form>
            </section>
          ) : null}

          {testimonial?.status === "RECEIVED" ? (
            <section style={{ border: "1px solid rgba(127,127,127,.2)", borderRadius: 18, padding: 22 }}>
              <h2 style={{ marginTop: 0 }}>3. Aprobar copy publicable</h2>
              <p style={{ opacity: 0.68 }}>Solo se habilita si existe consentimiento explícito para publicar la quote.</p>
              <form action={approveTestimonial} style={{ display: "grid", gap: 12 }}>
                <input type="hidden" name="opportunity_id" value={id} />
                <label>Copy exacto aprobado<textarea name="approved_copy" defaultValue={testimonial.approved_copy || testimonial.testimonial_text || ""} rows={7} required style={{ width: "100%", padding: 10, marginTop: 5 }} /></label>
                <button type="submit" disabled={!testimonial.quote_consent} style={{ width: "fit-content", padding: "10px 16px" }}>Aprobar testimonio</button>
              </form>
            </section>
          ) : null}

          {testimonial?.status === "APPROVED" ? (
            <section style={{ border: "1px solid rgba(127,127,127,.2)", borderRadius: 18, padding: 22 }}>
              <h2 style={{ marginTop: 0 }}>Aprobado</h2>
              <blockquote style={{ margin: "12px 0", paddingLeft: 16, borderLeft: "3px solid rgba(127,127,127,.3)" }}>{testimonial.approved_copy}</blockquote>
              <p style={{ fontSize: 13, opacity: 0.65 }}>Permisos: empresa {testimonial.company_name_consent ? "sí" : "no"} · persona {testimonial.person_name_consent ? "sí" : "no"} · cargo {testimonial.role_consent ? "sí" : "no"} · logo {testimonial.logo_consent ? "sí" : "no"} · métricas {testimonial.metrics_consent ? "sí" : "no"}.</p>
            </section>
          ) : null}

          {testimonial && !["DECLINED","REVOKED"].includes(testimonial.status) ? (
            <section style={{ display: "flex", gap: 10 }}>
              <form action={closeTestimonial}><input type="hidden" name="opportunity_id" value={id} /><input type="hidden" name="status" value="DECLINED" /><button type="submit">Registrar que declinó</button></form>
              <form action={closeTestimonial}><input type="hidden" name="opportunity_id" value={id} /><input type="hidden" name="status" value="REVOKED" /><button type="submit">Revocar permiso</button></form>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
