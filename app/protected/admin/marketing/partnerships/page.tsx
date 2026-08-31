import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logPartnerActivity, savePartner } from "./actions";

const input = "w-full rounded-xl border border-[#d2c5b3] bg-white px-3 py-2 text-sm";

export default async function PartnershipsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: partners } = await supabase.from("b2b_partners").select("*").order("priority", { ascending: true }).order("updated_at", { ascending: false });
  const rows = partners || [];
  const counts = {
    total: rows.length,
    active: rows.filter((x) => x.status === "ACTIVE").length,
    meetings: rows.filter((x) => ["MEETING","PROPOSAL"].includes(x.status)).length,
    ready: rows.filter((x) => ["QUALIFIED","READY"].includes(x.status)).length,
  };

  return <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#8d7553]">Fase 9 · Paso 73</p><h1 className="mt-3 font-serif text-4xl">Partnerships</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e665c]">Operación Comercial 360: educación + diagnóstico + material co-branded + implementación prioritaria. Primero valor al ecosistema, después referral.</p></div><Link href="/partners" className="rounded-xl border border-[#bca98e] px-4 py-2 text-sm font-semibold">Ver propuesta pública</Link></div>

    <section className="mt-7 grid gap-3 sm:grid-cols-4">{[["Partners",counts.total],["Ready",counts.ready],["Meetings / propuesta",counts.meetings],["Activos",counts.active]].map(([label,value]) => <div key={label} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-4"><p className="text-xs uppercase tracking-[.12em] text-[#8d7553]">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p></div>)}</section>

    <section className="mt-7 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6"><h2 className="font-serif text-2xl">Agregar partner</h2><form action={savePartner} className="mt-5 grid gap-3 md:grid-cols-3">
      <input name="partner_name" required placeholder="Organización / partner" className={input}/>
      <select name="category" className={input} defaultValue="CHAMBER"><option value="CHAMBER">Cámara</option><option value="ASSOCIATION">Asociación</option><option value="AGENCY">Agencia</option><option value="CONSULTANT">Consultor</option><option value="WHATSAPP_META">WhatsApp / Meta</option><option value="PORTAL_INTEGRATOR">Portal / integrador</option><option value="DEVELOPER">Desarrollador</option><option value="EVENT_EDUCATION">Evento / educación</option><option value="OTHER">Otro</option></select>
      <select name="priority" className={input} defaultValue="P2"><option>P1</option><option>P2</option><option>P3</option></select>
      <input name="website" placeholder="Website" className={input}/><input name="contact_name" placeholder="Contacto" className={input}/><input name="contact_email" type="email" placeholder="Email" className={input}/>
      <input name="why_fit" placeholder="Por qué encaja" className={input}/><input name="audience_reach" placeholder="Audiencia / alcance cualitativo" className={input}/><input name="next_step" placeholder="Próximo paso" className={input}/>
      <select name="incentive_model" className={input} defaultValue="NONE"><option value="NONE">Sin incentivo económico</option><option value="PERCENT_FIRST_YEAR">% primer año</option><option value="FIXED_BOUNTY">Bounty fijo</option></select><input name="incentive_value" type="number" step="0.01" placeholder="Valor incentivo" className={input}/><button className="rounded-xl bg-[#302d28] px-4 py-2 text-sm font-semibold text-white">Guardar partner</button>
    </form></section>

    <section className="mt-7 space-y-4">{rows.length === 0 ? <div className="rounded-2xl border border-dashed border-[#c9baa4] p-8 text-sm text-[#756c61]">Todavía no hay partners cargados. El sistema está listo; los pasos 74–76 van a poblarlo con cámaras, agencias y consultores verificados.</div> : rows.map((p) => <article key={p.id} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex flex-wrap justify-between gap-4"><div><div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[.12em] text-[#8d7553]"><span>{p.priority}</span><span>·</span><span>{p.category}</span><span>·</span><span>{p.status}</span></div><h3 className="mt-2 font-serif text-2xl">{p.partner_name}</h3><p className="mt-2 text-sm text-[#6e665c]">{p.why_fit || "Fit por documentar"}</p></div><div className="text-right text-xs text-[#756c61]"><p>{p.contact_name || "Contacto pendiente"}</p><p>{p.contact_email || "Email pendiente"}</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-3 text-sm"><div><strong>Oferta:</strong> {p.offer_angle}</div><div><strong>Próximo paso:</strong> {p.next_step || "Definir"}</div><div><strong>Incentivo:</strong> {p.incentive_model === "NONE" ? "No definido" : `${p.incentive_model} ${p.incentive_value ?? ""}`}</div></div><form action={logPartnerActivity} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="partner_id" value={p.id}/><select name="activity_type" className={input + " max-w-48"} defaultValue="NOTE"><option>NOTE</option><option>EMAIL</option><option>LINKEDIN</option><option>WHATSAPP</option><option>CALL</option><option>MEETING</option><option>WORKSHOP</option><option>PROPOSAL</option></select><input name="summary" required placeholder="Registrar actividad" className={input + " min-w-72 flex-1"}/><button className="rounded-xl border border-[#bca98e] px-4 py-2 text-sm font-semibold">Registrar</button></form></article>)}</section>
  </div></main>;
}
