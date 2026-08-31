import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveSocialProofPublication, markSocialProofPublished, saveSocialProofPublication, withdrawSocialProofPublication } from "../actions";

export default async function SocialProofDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const qs = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: study }, { data: testimonial }, { data: publications }] = await Promise.all([
    supabase.from("b2b_case_studies").select("*").eq("opportunity_id", id).eq("status", "READY").maybeSingle(),
    supabase.from("b2b_testimonials").select("*").eq("opportunity_id", id).eq("status", "APPROVED").maybeSingle(),
    supabase.from("b2b_social_proof_publications").select("*").eq("opportunity_id", id).order("updated_at", { ascending: false }),
  ]);
  if (!study || !testimonial) redirect("/protected/admin/sales/social-proof");

  const permissions = [
    ["Empresa", testimonial.company_name_consent], ["Persona", testimonial.person_name_consent], ["Cargo", testimonial.role_consent],
    ["Logo", testimonial.logo_consent], ["Métricas", testimonial.metrics_consent || testimonial.anonymized_metrics_consent], ["Quote", testimonial.quote_consent],
  ];

  return (
    <main style={{ padding: 24, maxWidth: 1080, margin: "0 auto" }}>
      <p style={{ margin: 0, opacity: 0.6 }}>GTM · Paso 64 · Prueba social</p>
      <h1 style={{ margin: "6px 0" }}>{study.title}</h1>
      <p style={{ opacity: 0.72 }}>{study.visibility_mode} · solo activos y datos con permiso vigente.</p>
      {qs.error && <div style={{ padding: 12, border: "1px solid #d88", borderRadius: 10, marginBottom: 14 }}>{qs.error}</div>}
      {qs.success && <div style={{ padding: 12, border: "1px solid #8b8", borderRadius: 10, marginBottom: 14 }}>{qs.success}</div>}

      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <strong>Permisos vigentes</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>{permissions.map(([label, allowed]) => <span key={String(label)} style={{ border: "1px solid #ddd", borderRadius: 999, padding: "6px 10px" }}>{String(label)}: {allowed ? "sí" : "no"}</span>)}</div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 18, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Crear activo</h2>
        <form action={saveSocialProofPublication} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="opportunity_id" value={id} />
          <label>Canal<select name="channel" defaultValue="WEBSITE" style={{ display: "block", width: "100%", padding: 9 }}><option>WEBSITE</option><option>SALES_DECK</option><option>LINKEDIN</option><option>EMAIL</option><option>PROPOSAL</option><option>OTHER</option></select></label>
          <label>Tipo<select name="asset_type" defaultValue="CASE_STUDY" style={{ display: "block", width: "100%", padding: 9 }}><option>CASE_STUDY</option><option>QUOTE</option><option>METRIC_CARD</option><option>MINI_CASE</option><option>SCREENSHOT</option></select></label>
          <label>Placement<input name="placement" placeholder="Ej. Home / sección resultados" style={{ display: "block", width: "100%", padding: 9 }} /></label>
          <label>Copy<textarea name="publication_copy" rows={5} style={{ display: "block", width: "100%", padding: 9 }} /></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <label><input type="checkbox" name="uses_company_name" /> empresa</label><label><input type="checkbox" name="uses_person_name" /> persona</label><label><input type="checkbox" name="uses_role" /> cargo</label><label><input type="checkbox" name="uses_logo" /> logo</label><label><input type="checkbox" name="uses_metrics" /> métricas</label><label><input type="checkbox" name="uses_quote" /> quote</label>
          </div>
          <label>Referencias de activos<textarea name="asset_references" rows={3} placeholder="Una por línea" style={{ display: "block", width: "100%", padding: 9 }} /></label>
          <label>Referencias de evidencia<textarea name="evidence_references" rows={3} placeholder="Una por línea" style={{ display: "block", width: "100%", padding: 9 }} /></label>
          <label>Notas de aprobación<textarea name="approval_notes" rows={3} style={{ display: "block", width: "100%", padding: 9 }} /></label>
          <button type="submit" style={{ padding: 11 }}>Guardar borrador</button>
        </form>
      </section>

      <section>
        <h2>Activos</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {(publications || []).map((item) => <article key={item.id} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{item.channel} · {item.asset_type}</strong><span>{item.status}</span></div>
            <p style={{ whiteSpace: "pre-wrap" }}>{item.publication_copy}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {item.status === "DRAFT" && <form action={approveSocialProofPublication}><input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="publication_id" value={item.id}/><button type="submit">Aprobar</button></form>}
              {item.status === "APPROVED" && <form action={markSocialProofPublished} style={{ display: "flex", gap: 6 }}><input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="publication_id" value={item.id}/><input name="external_reference" placeholder="URL/ref externa"/><button type="submit">Marcar publicado</button></form>}
              {["APPROVED","PUBLISHED"].includes(item.status) && <form action={withdrawSocialProofPublication}><input type="hidden" name="opportunity_id" value={id}/><input type="hidden" name="publication_id" value={item.id}/><button type="submit">Retirar</button></form>}
            </div>
          </article>)}
          {!publications?.length && <div style={{ opacity: 0.65 }}>Todavía no hay activos de prueba social.</div>}
        </div>
      </section>
    </main>
  );
}
