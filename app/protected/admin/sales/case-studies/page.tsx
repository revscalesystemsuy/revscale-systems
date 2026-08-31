import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CaseStudiesPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const [{ data: opportunities }, { data: studies }, { data: testimonials }] = await Promise.all([
    supabase.from("b2b_opportunities").select("id,company_name,stage,next_step,updated_at").in("stage", ["PILOT_ACTIVE","PAID"]).order("updated_at", { ascending: false }),
    supabase.from("b2b_case_studies").select("opportunity_id,status,visibility_mode,title,ready_at,updated_at"),
    supabase.from("b2b_testimonials").select("opportunity_id,status,quote_consent,company_name_consent,metrics_consent,anonymized_metrics_consent"),
  ]);

  const studyByOpp = new Map((studies || []).map((x) => [x.opportunity_id, x]));
  const testimonialByOpp = new Map((testimonials || []).map((x) => [x.opportunity_id, x]));
  const rows = (opportunities || []).filter((opp) => testimonialByOpp.get(opp.id)?.status === "APPROVED");
  const ready = rows.filter((x) => studyByOpp.get(x.id)?.status === "READY").length;
  const draft = rows.filter((x) => studyByOpp.get(x.id)?.status === "DRAFT").length;

  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <div><p className="text-sm text-muted-foreground">Proof Engine · Paso 63</p><h1 className="text-2xl font-semibold">Case studies</h1><p className="text-sm text-muted-foreground">Construí prueba social únicamente con evidencia y permisos vigentes.</p></div>
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">Elegibles</div><div className="text-2xl font-semibold">{rows.length}</div></div>
      <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">Draft</div><div className="text-2xl font-semibold">{draft}</div></div>
      <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">Ready</div><div className="text-2xl font-semibold">{ready}</div></div>
    </div>
    <div className="space-y-3">{rows.map((opp) => { const study = studyByOpp.get(opp.id); const testimonial = testimonialByOpp.get(opp.id); return <Link key={opp.id} href={`/protected/admin/sales/case-studies/${opp.id}`} className="block rounded-xl border p-4 hover:bg-muted/40"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{opp.company_name}</div><div className="text-sm text-muted-foreground">{study?.title || "Sin case study todavía"}</div></div><div className="text-right text-sm"><div>{study?.status || "ELIGIBLE"}</div><div className="text-muted-foreground">{testimonial?.company_name_consent ? "empresa identificable" : "anonimizado"} · {testimonial?.quote_consent ? "quote OK" : "sin quote"}</div></div></div></Link>; })}</div>
  </main>;
}
