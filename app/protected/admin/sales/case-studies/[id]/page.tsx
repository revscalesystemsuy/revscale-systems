import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markCaseStudyReady, revokeCaseStudy, saveCaseStudy } from "../actions";

export default async function CaseStudyDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const qs = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opp }, { data: testimonial }, { data: report }, { data: study }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company_name,stage,next_step").eq("id", id).maybeSingle(),
    supabase.from("b2b_testimonials").select("*").eq("opportunity_id", id).maybeSingle(),
    supabase.from("b2b_pilot_reports").select("*").eq("opportunity_id", id).eq("report_day", 45).eq("status", "FINAL").maybeSingle(),
    supabase.from("b2b_case_studies").select("*").eq("opportunity_id", id).maybeSingle(),
  ]);
  if (!opp) redirect("/protected/admin/sales/case-studies");
  const eligible = testimonial?.status === "APPROVED" && Boolean(report);

  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <div><p className="text-sm text-muted-foreground">Paso 63 · Case study</p><h1 className="text-2xl font-semibold">{opp.company_name}</h1><p className="text-sm text-muted-foreground">{opp.next_step || "Sin próximo paso"}</p></div>
    {qs.error ? <div className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{qs.error}</div> : null}
    {qs.success ? <div className="rounded-lg border p-3 text-sm">{qs.success}</div> : null}
    {!eligible ? <div className="rounded-xl border p-4">Se requiere reporte FINAL día 45 y testimonio APPROVED antes de construir el caso.</div> : <>
      <section className="rounded-xl border p-4 text-sm"><div className="font-medium">Permisos vigentes</div><div className="mt-2 grid gap-2 md:grid-cols-4"><span>Empresa: {testimonial.company_name_consent ? "sí" : "no"}</span><span>Logo: {testimonial.logo_consent ? "sí" : "no"}</span><span>Quote: {testimonial.quote_consent ? "sí" : "no"}</span><span>Métricas: {testimonial.metrics_consent || testimonial.anonymized_metrics_consent ? "sí" : "no"}</span></div></section>
      <form action={saveCaseStudy} className="space-y-4 rounded-xl border p-5">
        <input type="hidden" name="opportunity_id" value={id} />
        <label className="block text-sm">Visibilidad<select name="visibility_mode" defaultValue={study?.visibility_mode || "ANONYMIZED"} className="mt-1 w-full rounded-md border bg-background p-2"><option value="ANONYMIZED">Anonimizado</option><option value="IDENTIFIED" disabled={!testimonial.company_name_consent}>Identificado</option></select></label>
        <label className="block text-sm">Nombre de empresa a mostrar<input name="company_display" defaultValue={study?.company_display || opp.company_name} disabled={!testimonial.company_name_consent} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
        {[['title','Título'],['situation','Situación'],['finding','Hallazgo'],['intervention','Intervención'],['result_summary','Resultado observado'],['commercial_result','Resultado comercial (solo si atribuible)'],['attribution_notes','Atribución'],['limitations','Limitaciones']].map(([name,label]) => <label key={name} className="block text-sm">{label}<textarea name={name} defaultValue={study?.[name] || ""} rows={name === 'title' ? 2 : 4} className="mt-1 w-full rounded-md border bg-background p-2" /></label>)}
        <label className="block text-sm">Screenshots / referencias, una por línea<textarea name="screenshot_references" defaultValue={(study?.screenshot_references || []).join("\n")} rows={3} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
        <label className="block text-sm">Evidencia / referencias, una por línea<textarea name="evidence_references" defaultValue={(study?.evidence_references || []).join("\n")} rows={3} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
        <div className="rounded-lg bg-muted p-3 text-sm"><div className="font-medium">Quote aprobada</div><div className="mt-1">{testimonial.quote_consent ? testimonial.approved_copy || "Sin copy aprobado" : "No autorizada"}</div></div>
        <button className="rounded-md border px-4 py-2 text-sm" disabled={study?.status === "READY"}>Guardar draft</button>
      </form>
      <div className="flex flex-wrap gap-3">
        <form action={markCaseStudyReady}><input type="hidden" name="opportunity_id" value={id} /><button className="rounded-md border px-4 py-2 text-sm" disabled={study?.status === "READY" || !study}>Marcar READY</button></form>
        <form action={revokeCaseStudy}><input type="hidden" name="opportunity_id" value={id} /><button className="rounded-md border px-4 py-2 text-sm" disabled={!study || study?.status === "REVOKED"}>Revocar</button></form>
      </div>
    </>}
  </main>;
}
