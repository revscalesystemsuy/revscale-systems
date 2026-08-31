import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateFounderVideoStatus } from "./actions";

export default async function FounderVideosPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");
  const { data: videos } = await supabase.from("b2b_founder_videos").select("*").order("video_key", { ascending: true });

  return <main style={{padding:24,maxWidth:1180,margin:"0 auto"}}>
    <p style={{opacity:.65,margin:0}}>GTM · Paso 69</p><h1>Founder-led videos</h1>
    <p style={{maxWidth:850,opacity:.78}}>Videos cortos de fundador orientados a autoridad y conversación ICP. El founder explica el problema, muestra producto cuando suma y evita claims de clientes no autorizados.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,margin:"22px 0"}}>
      {[["Videos",videos?.length||0],["Guion listo",(videos||[]).filter(v=>v.status==="SCRIPT_READY").length],["Grabados",(videos||[]).filter(v=>v.status==="RECORDED").length],["Publicados",(videos||[]).filter(v=>v.status==="PUBLISHED").length]].map(([l,v])=><div key={String(l)} style={{border:"1px solid #ddd",borderRadius:14,padding:16}}><div style={{fontSize:28,fontWeight:700}}>{v}</div><div style={{opacity:.7}}>{l}</div></div>)}
    </div>
    <div style={{display:"grid",gap:14}}>{(videos||[]).map(video=><section key={video.id} style={{border:"1px solid #ddd",borderRadius:16,padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start"}}><div><strong>{video.title}</strong><div style={{opacity:.65,marginTop:4}}>{video.duration_seconds}s · {video.delivery_style} · {video.claim_mode}</div></div><span>{video.status}</span></div>
      <p style={{fontWeight:600}}>{video.hook}</p><p style={{whiteSpace:"pre-wrap"}}>{video.script}</p>
      <details><summary>Tomas y textos</summary><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:10}}><div><strong>Tomas</strong><ol>{(video.shot_list||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ol></div><div><strong>Texto en pantalla</strong><ul>{(video.on_screen_text||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div></div></details>
      <p><strong>Caption:</strong> {video.caption_copy}</p><p><strong>CTA:</strong> {video.cta}</p>
      <form action={updateFounderVideoStatus} style={{display:"grid",gridTemplateColumns:"180px 1fr 1fr 1fr auto",gap:8,alignItems:"center"}}>
        <input type="hidden" name="id" value={video.id}/><select name="status" defaultValue={video.status}><option>SCRIPT_READY</option><option>RECORDED</option><option>EDIT_READY</option><option>PUBLISHED</option><option>BLOCKED</option><option>ARCHIVED</option></select><input name="raw_video_reference" defaultValue={video.raw_video_reference||""} placeholder="Referencia video bruto"/><input name="edit_reference" defaultValue={video.edit_reference||""} placeholder="Referencia edición"/><input name="publication_url" defaultValue={video.publication_url||""} placeholder="URL publicada"/><button type="submit">Guardar</button>
      </form>
    </section>)}{!videos?.length&&<div style={{border:"1px dashed #ccc",borderRadius:14,padding:18,opacity:.7}}>No hay videos cargados.</div>}</div>
  </main>;
}
