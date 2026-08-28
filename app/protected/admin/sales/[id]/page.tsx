import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, Mail, Phone, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateB2BCommercialFields } from "../actions";

function localInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default async function B2BOpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunity } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,email,phone,stage,primary_channel,plan_interest,next_step,next_step_due_at,last_contact_at,notes,source_type,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!opportunity) notFound();

  const { data: history } = await supabase
    .from("b2b_stage_history")
    .select("id,from_stage,to_stage,changed_at")
    .eq("opportunity_id", id)
    .order("changed_at", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
        <div className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Ficha comercial B2B</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-4xl">{opportunity.company}</h1><p className="mt-2 text-sm text-[#746c62]">Etapa actual: <strong>{opportunity.stage}</strong></p></div><span className="rounded-full border border-[#cbbda8] bg-[#efe5d6] px-3 py-1 text-xs font-semibold text-[#6d5d48]">{opportunity.source_type}</span></div>
          <div className="mt-6 grid gap-3 md:grid-cols-3"><Info icon={<UserRound size={14}/>} label="Contacto" value={opportunity.contact_name}/><Info icon={<Mail size={14}/>} label="Email" value={opportunity.email}/><Info icon={<Phone size={14}/>} label="Teléfono" value={opportunity.phone}/></div>
        </div>

        {messages.success && <div className="mt-5 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{messages.success}</div>}
        {messages.error && <div className="mt-5 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{messages.error}</div>}

        <form action={updateB2BCommercialFields} className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
          <input type="hidden" name="opportunity_id" value={opportunity.id}/>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Canal principal"><select name="primary_channel" defaultValue={opportunity.primary_channel} className="field"><option value="WEB">Web</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="LINKEDIN">LinkedIn</option><option value="PHONE">Teléfono</option><option value="OTHER">Otro</option></select></Field>
            <Field label="Plan de interés"><select name="plan_interest" defaultValue={opportunity.plan_interest} className="field"><option value="UNKNOWN">Sin definir</option><option value="STARTER">Starter</option><option value="PROFESSIONAL">Professional</option><option value="ENTERPRISE">Enterprise</option></select></Field>
            <Field label="Próximo paso"><input name="next_step" defaultValue={opportunity.next_step || ""} required className="field"/></Field>
            <Field label="Fecha del próximo paso"><input type="datetime-local" name="next_step_due_at" defaultValue={localInputValue(opportunity.next_step_due_at)} required className="field"/></Field>
            <Field label="Último contacto"><input type="datetime-local" name="last_contact_at" defaultValue={localInputValue(opportunity.last_contact_at)} className="field"/></Field>
            <div className="rounded-xl border border-[#d8cbb8] bg-[#efe5d6] p-4"><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]"><CalendarClock size={13}/> Regla operativa</p><p className="mt-2 text-sm leading-6 text-[#625d55]">Toda oportunidad que no esté perdida debe conservar un próximo paso y una fecha. La base de datos lo exige.</p></div>
          </div>
          <Field label="Notas comerciales" wide><textarea name="notes" defaultValue={opportunity.notes || ""} rows={5} className="field resize-y" placeholder="Contexto útil para la próxima acción, objeciones o decisión pendiente."/></Field>
          <button className="mt-6 rounded-lg bg-[#302d28] px-6 py-3 text-sm font-semibold text-[#fffaf2]">Guardar ficha comercial</button>
        </form>

        <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
          <h2 className="font-serif text-2xl">Historial de etapas</h2>
          <div className="mt-4 divide-y divide-[#ded2c1]">{history?.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span><strong>{event.from_stage || "—"}</strong> → <strong>{event.to_stage}</strong></span><span className="text-[#81786d]">{new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.changed_at))}</span></div>)}{!history?.length && <p className="py-4 text-sm text-[#81786d]">Todavía no hay cambios manuales de etapa.</p>}</div>
        </section>
      </div>
      <style>{`.field{width:100%;border:1px solid #cfc1ad;background:#fffaf2;border-radius:.5rem;padding:.7rem .8rem;color:#403b34;outline:none}.field:focus{border-color:#9d8767}`}</style>
    </main>
  );
}

function Field({ label, children, wide=false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={wide ? "mt-5 block" : "block"}><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</span>{children}</label> }
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) { return <div className="rounded-xl border border-[#ddd1c0] bg-[#f7f0e6] p-4"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{icon}{label}</p><p className="mt-2 break-words text-sm font-medium">{value || "—"}</p></div> }
