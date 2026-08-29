import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { saveNegotiation } from "../actions";

const concessions = [
  ["NONE", "Sin concesión"],
  ["ONBOARDING_WAIVED", "Onboarding bonificado"],
  ["PILOT_EXTENSION", "Extensión de piloto"],
  ["ANNUAL_TWO_MONTHS_FREE", "Anual con 2 meses bonificados"],
  ["FOUNDING_PRICE", "Founding price limitado"],
  ["REDUCED_SCOPE", "Reducir alcance"],
] as const;

export default async function NegotiationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const qs = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunity } = await supabase.from("b2b_opportunities").select("id,company,contact_name,stage,next_step,plan_interest").eq("id", id).maybeSingle();
  if (!opportunity) notFound();
  const { data: proposal } = await supabase.from("b2b_proposals").select("id,status,plan_name,quoted_price_usd,pilot_days").eq("opportunity_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: pilot } = await supabase.from("b2b_pilot_agreements").select("id,status,pilot_days,sponsor_name,decision_metrics").eq("opportunity_id", id).maybeSingle();
  const { data: history } = await supabase.from("b2b_negotiations").select("id,status,objection_type,objection_detail,concession_type,concession_detail,give_get,revised_price_usd,revised_pilot_days,revised_scope,next_step,created_at").eq("opportunity_id", id).order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/protected/admin/sales/negotiation" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a negociación</Link>
        <div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 53 · {opportunity.stage}</p><h1 className="mt-3 font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#716a61]">{opportunity.contact_name || "Contacto pendiente"}</p></div>
        {qs.error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{qs.error}</div>}
        {qs.success && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{qs.success}</div>}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Card label="Propuesta" value={proposal ? `${proposal.status} · ${proposal.plan_name} · USD ${proposal.quoted_price_usd}` : "Sin propuesta"}/>
          <Card label="Piloto" value={pilot ? `${pilot.status} · ${pilot.pilot_days} días` : "Sin acuerdo"}/>
          <Card label="Próximo paso" value={opportunity.next_step || "Sin próximo paso"}/>
        </section>

        <form action={saveNegotiation} className="mt-8 space-y-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8">
          <input type="hidden" name="opportunity_id" value={id}/>
          <input type="hidden" name="proposal_id" value={proposal?.id || ""}/>
          <input type="hidden" name="pilot_agreement_id" value={pilot?.id || ""}/>
          <div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Objeción principal</label><input name="objection_type" className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm" placeholder="Precio, migración, adopción, integración, timing..."/></div>
          <div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Qué significa realmente / detalle</label><textarea name="objection_detail" rows={3} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm"/></div>
          <div className="grid gap-4 md:grid-cols-2"><div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Concesión</label><select name="concession_type" defaultValue="NONE" className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm">{concessions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Contraprestación obligatoria</label><input name="give_get" className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm" placeholder="Anualidad, case study, decisión antes de..., menor scope..."/></div></div>
          <div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Detalle de concesión</label><textarea name="concession_detail" rows={2} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm"/></div>
          <div className="grid gap-4 md:grid-cols-2"><div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Precio revisado USD</label><input name="revised_price_usd" type="number" min="0" className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm"/></div><div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Piloto revisado (días)</label><input name="revised_pilot_days" type="number" min="1" className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm"/></div></div>
          <div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Alcance revisado</label><textarea name="revised_scope" rows={2} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm"/></div>
          <div className="grid gap-4 md:grid-cols-2"><div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Próximo paso</label><input name="next_step" className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm"/></div><div><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#776b5b]">Fecha</label><input name="next_step_due_at" type="datetime-local" className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-white px-3 py-2.5 text-sm"/></div></div>
          <div className="flex flex-wrap gap-3"><button name="status" value="OPEN" className="rounded-lg border border-[#b9aa94] px-4 py-2.5 text-sm font-semibold">Registrar negociación</button><button name="status" value="AGREED" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Marcar acuerdo</button><button name="status" value="WALK_AWAY" className="rounded-lg border border-[#b69281] px-4 py-2.5 text-sm font-semibold text-[#754c3b]">Cerrar sin acuerdo</button></div>
        </form>

        <section className="mt-8"><h2 className="font-serif text-2xl">Historial</h2><div className="mt-4 space-y-3">{(history || []).map((h) => <div key={h.id} className="rounded-xl border border-[#d8cbb9] bg-[#fffaf2] p-4 text-sm"><div className="flex flex-wrap justify-between gap-3"><strong>{h.status} · {h.concession_type || "NONE"}</strong><span className="text-xs text-[#8a8176]">{new Date(h.created_at).toLocaleString("es-UY", { timeZone: "America/Montevideo" })}</span></div><p className="mt-2 text-[#665f56]">{h.objection_type || "Sin objeción tipificada"}{h.objection_detail ? ` — ${h.objection_detail}` : ""}</p>{h.give_get && <p className="mt-2 text-[#665f56]"><strong>Give/Get:</strong> {h.give_get}</p>}</div>)}{!history?.length && <p className="text-sm text-[#716a61]">Sin registros todavía.</p>}</div></section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 text-sm leading-6">{value}</p></div>; }
