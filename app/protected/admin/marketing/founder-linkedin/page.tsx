import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { founderLinkedInCalendar } from "./calendar";
import { initializeFounderLinkedInCalendar, updateFounderLinkedInPost } from "./actions";

export default async function FounderLinkedInPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: posts } = await supabase.from("b2b_founder_linkedin_posts").select("*").order("day_number", { ascending: true });
  const rows = posts || [];
  const ready = rows.filter((x) => x.status === "READY").length;
  const blocked = rows.filter((x) => x.status === "BLOCKED").length;
  const published = rows.filter((x) => ["PUBLISHED","COMPLETED"].includes(x.status)).length;
  const conversations = rows.reduce((sum, x) => sum + (x.icp_conversations || 0), 0);

  return (
    <main style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <p style={{ margin: 0, opacity: 0.65 }}>GTM · Paso 65</p>
        <h1 style={{ margin: "6px 0 8px" }}>LinkedIn founder</h1>
        <p style={{ margin: 0, maxWidth: 820, opacity: 0.78 }}>El canal del fundador debe generar conversaciones ICP y autoridad sobre operación comercial inmobiliaria. No se optimiza por seguidores.</p>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <strong>Perfil recomendado</strong>
        <p><b>Headline:</b> Construyendo RevScale PropertyOS | Inteligencia comercial para inmobiliarias | Menos leads perdidos, más operaciones avanzando</p>
        <p style={{ marginBottom: 0 }}><b>About:</b> Estoy construyendo RevScale PropertyOS desde Uruguay para resolver una parte concreta de la operación inmobiliaria: qué pasa después de que entra una consulta. Priorización, respuesta humana, próximo paso, matching entre demanda e inventario y visibilidad de dirección. Compartimos aprendizajes de producto y operación comercial, no promesas de IA.</p>
      </div>

      {params.error && <div style={{ padding: 12, border: "1px solid #b91c1c", borderRadius: 10, marginBottom: 14 }}>{params.error}</div>}
      {params.success && <div style={{ padding: 12, border: "1px solid #15803d", borderRadius: 10, marginBottom: 14 }}>{params.success}</div>}

      {!rows.length && (
        <form action={initializeFounderLinkedInCalendar} style={{ marginBottom: 20 }}>
          <button type="submit">Cargar calendario de 30 días</button>
          <p style={{ opacity: 0.65, marginBottom: 0 }}>Se crearán {founderLinkedInCalendar.length} acciones. Días 26 y 27 quedan BLOCKED hasta tener evidencia real.</p>
        </form>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 22 }}>
        {[["READY",ready],["BLOCKED",blocked],["Publicados/completados",published],["Conversaciones ICP",conversations]].map(([label,value]) => (
          <div key={String(label)} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}><div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div><div style={{ opacity: 0.7 }}>{label}</div></div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {rows.map((post) => (
          <details key={post.id} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }} open={post.day_number === 1}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Día {post.day_number} · {post.theme} · {post.format} · {post.status}</summary>
            <form action={updateFounderLinkedInPost} style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <input type="hidden" name="id" value={post.id} />
              <label>Pilar<input value={post.pillar} readOnly style={{ width: "100%" }} /></label>
              <label>Copy<textarea name="post_copy" defaultValue={post.post_copy || ""} rows={8} style={{ width: "100%" }} /></label>
              <label>Brief / pieza<textarea name="asset_brief" defaultValue={post.asset_brief || ""} rows={3} style={{ width: "100%" }} /></label>
              <label>CTA<input name="cta" defaultValue={post.cta || ""} style={{ width: "100%" }} /></label>
              {post.requires_evidence && <label>Evidencia requerida<input value={post.evidence_requirement || ""} readOnly style={{ width: "100%" }} /></label>}
              {post.requires_evidence && <label>Referencia de evidencia<input name="evidence_reference" defaultValue={post.evidence_reference || ""} style={{ width: "100%" }} /></label>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                <label>Estado<select name="status" defaultValue={post.status} style={{ width: "100%" }}>{["PLANNED","DRAFT","READY","BLOCKED","PUBLISHED","COMPLETED","SKIPPED"].map((s) => <option key={s}>{s}</option>)}</select></label>
                <label>Fecha<input type="date" name="scheduled_for" defaultValue={post.scheduled_for || ""} style={{ width: "100%" }} /></label>
                <label>URL LinkedIn<input name="linkedin_url" defaultValue={post.linkedin_url || ""} style={{ width: "100%" }} /></label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <label>Conversaciones ICP<input type="number" min="0" name="icp_conversations" defaultValue={post.icp_conversations || 0} /></label>
                <label>Owners/managers<input type="number" min="0" name="owner_manager_interactions" defaultValue={post.owner_manager_interactions || 0} /></label>
                <label>Demos influenciadas<input type="number" min="0" name="demos_influenced" defaultValue={post.demos_influenced || 0} /></label>
                <label>Referrals<input type="number" min="0" name="referrals" defaultValue={post.referrals || 0} /></label>
              </div>
              <label>Notas<textarea name="notes" defaultValue={post.notes || ""} rows={2} style={{ width: "100%" }} /></label>
              <button type="submit">Guardar</button>
            </form>
          </details>
        ))}
      </div>
    </main>
  );
}
