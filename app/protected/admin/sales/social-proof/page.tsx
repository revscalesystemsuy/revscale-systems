import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SocialProofPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: studies }, { data: publications }] = await Promise.all([
    supabase.from("b2b_case_studies").select("opportunity_id,title,visibility_mode,status").eq("status", "READY").order("ready_at", { ascending: false }),
    supabase.from("b2b_social_proof_publications").select("opportunity_id,status,channel,asset_type,published_at").order("updated_at", { ascending: false }),
  ]);

  const byOpportunity = new Map<string, typeof publications>();
  for (const item of publications || []) {
    const list = byOpportunity.get(item.opportunity_id) || [];
    list.push(item);
    byOpportunity.set(item.opportunity_id, list);
  }

  return (
    <main style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, opacity: 0.65 }}>GTM · Paso 64</p>
        <h1 style={{ margin: "6px 0 8px" }}>Prueba social</h1>
        <p style={{ margin: 0, maxWidth: 780, opacity: 0.78 }}>Goberná qué evidencia READY puede salir a web, ventas, LinkedIn, email o propuestas sin exceder los permisos concedidos.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          ["Case studies READY", studies?.length || 0],
          ["Activos publicados", (publications || []).filter((x) => x.status === "PUBLISHED").length],
          ["Pendientes de aprobación", (publications || []).filter((x) => ["DRAFT","APPROVED"].includes(x.status)).length],
        ].map(([label, value]) => <div key={String(label)} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}><div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div><div style={{ opacity: 0.7 }}>{label}</div></div>)}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {(studies || []).map((study) => {
          const items = byOpportunity.get(study.opportunity_id) || [];
          return (
            <Link key={study.opportunity_id} href={`/protected/admin/sales/social-proof/${study.opportunity_id}`} style={{ textDecoration: "none", color: "inherit", border: "1px solid #ddd", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                <div><strong>{study.title || "Case study"}</strong><div style={{ marginTop: 6, opacity: 0.65 }}>{study.visibility_mode} · {items.length} activos configurados</div></div>
                <span>Gestionar →</span>
              </div>
            </Link>
          );
        })}
        {!studies?.length && <div style={{ border: "1px dashed #ccc", borderRadius: 14, padding: 20, opacity: 0.7 }}>Todavía no hay case studies READY. No se fabrica prueba social.</div>}
      </div>
    </main>
  );
}
