import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateEditorialSlot } from "./actions";

const STATUS_OPTIONS = ["PLANNED","DRAFT","READY","BLOCKED","PUBLISHED","COMPLETED","SKIPPED"];

function badge(status: string) {
  return { border:"1px solid #d8d4ca", borderRadius:999, padding:"4px 8px", fontSize:12, opacity:.78 } as const;
}

export default async function EditorialCalendarPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: rows, error } = await supabase.from("b2b_editorial_calendar").select("*").order("planned_date", { ascending: true }).order("item_type", { ascending: true });
  if (error) throw error;
  const items = rows || [];
  const weeks = [1,2,3,4];

  const founder = items.filter((x) => x.item_type === "FOUNDER").length;
  const clips = items.filter((x) => x.item_type === "PRODUCT_CLIP").length;
  const brand = items.filter((x) => x.item_type === "REVSCALE_BRAND").length;
  const blocked = items.filter((x) => x.status === "BLOCKED").length;

  return (
    <main style={{ padding:24, maxWidth:1260, margin:"0 auto" }}>
      <p style={{ margin:0, opacity:.62 }}>GTM · Paso 68</p>
      <h1 style={{ margin:"6px 0 8px" }}>Calendario editorial unificado</h1>
      <p style={{ maxWidth:860, opacity:.78, marginTop:0 }}>Una sola cadencia para founder, producto, marca, prueba social y distribución. El objetivo es sostener autoridad y generar conversaciones ICP sin convertir la agenda en una fábrica de posts.</p>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, margin:"22px 0 28px" }}>
        {[["Founder", founder],["Clips", clips],["Marca", brand],["Bloqueados por evidencia", blocked]].map(([label,value]) => (
          <div key={String(label)} style={{ border:"1px solid #ddd", borderRadius:14, padding:16 }}><div style={{ fontSize:28, fontWeight:700 }}>{value}</div><div style={{ opacity:.68 }}>{label}</div></div>
        ))}
      </div>

      <div style={{ border:"1px solid #ddd", borderRadius:14, padding:16, marginBottom:24 }}>
        <strong>Cadencia base</strong>
        <p style={{ margin:"8px 0 0", opacity:.75 }}>3 publicaciones founder/semana · 2 clips de producto/semana · 1 pieza de marca/semana · 2 rituales de distribución/semana. La prueba social entra solo cuando exista evidencia y consentimiento.</p>
      </div>

      <div style={{ display:"grid", gap:24 }}>
        {weeks.map((week) => {
          const weekRows = items.filter((x) => x.week_number === week);
          return (
            <section key={week}>
              <h2 style={{ marginBottom:12 }}>Semana {week}</h2>
              <div style={{ display:"grid", gap:10 }}>
                {weekRows.map((row) => (
                  <form key={row.id} action={updateEditorialSlot} style={{ border:"1px solid #ddd", borderRadius:14, padding:16, display:"grid", gap:12 }}>
                    <input type="hidden" name="id" value={row.id}/>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
                      <div>
                        <div style={{ fontSize:12, opacity:.6 }}>{new Date(`${row.planned_date}T12:00:00`).toLocaleDateString("es-UY", { weekday:"long", day:"2-digit", month:"2-digit" })}</div>
                        <strong>{row.title}</strong>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:7 }}>
                          <span style={badge(row.status)}>{row.status}</span><span style={badge(row.item_type)}>{row.item_type}</span><span style={badge(row.channel)}>{row.channel}</span><span style={badge(row.format)}>{row.format}</span>
                        </div>
                      </div>
                      {row.source_path && <a href={row.source_path} style={{ fontSize:13 }}>Abrir fuente →</a>}
                    </div>
                    <div style={{ fontSize:14, opacity:.76 }}>Objetivo: {row.objective}{row.cta ? ` · CTA: ${row.cta}` : ""}</div>
                    {row.requires_evidence && <div style={{ border:"1px dashed #c9bfae", borderRadius:10, padding:10, fontSize:13 }}><strong>Gate de evidencia:</strong> {row.evidence_requirement}</div>}
                    <div style={{ display:"grid", gridTemplateColumns:"minmax(150px,.6fr) minmax(220px,1fr) minmax(220px,1fr)", gap:8 }}>
                      <select name="status" defaultValue={row.status}>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                      <input name="evidence_reference" defaultValue={row.evidence_reference || ""} placeholder="Referencia de evidencia"/>
                      <input name="publication_url" defaultValue={row.publication_url || ""} placeholder="URL publicada"/>
                    </div>
                    <div style={{ display:"flex", gap:8 }}><input name="notes" defaultValue={row.notes || ""} placeholder="Notas operativas" style={{ flex:1 }}/><button type="submit">Guardar</button></div>
                  </form>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
