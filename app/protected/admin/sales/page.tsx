import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeDollarSign, Building2, Inbox, Radar, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateB2BStage } from "./actions";

type Stage = "NEW" | "CONTACTED" | "QUALIFIED" | "DEMO_BOOKED" | "DEMO_COMPLETED" | "PILOT_PROPOSED" | "PILOT_ACTIVE" | "PAID" | "LOST";
type Opportunity = {
  id: string;
  source_type: "WEBSITE_DIAGNOSTIC" | "PLAN_REQUEST" | "MANUAL";
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  source_status: string | null;
  stage: Stage;
  created_at: string;
};

const stages: Array<{ key: Stage; label: string; description: string }> = [
  { key: "NEW", label: "Nuevo", description: "Entrada comercial pendiente de primer contacto." },
  { key: "CONTACTED", label: "Contactado", description: "Ya hubo un primer contacto o respuesta." },
  { key: "QUALIFIED", label: "Calificado", description: "Encaje, dolor y acceso a decisión validados." },
  { key: "DEMO_BOOKED", label: "Demo agendada", description: "Existe fecha concreta para la demo." },
  { key: "DEMO_COMPLETED", label: "Demo realizada", description: "La demo ocurrió y requiere decisión siguiente." },
  { key: "PILOT_PROPOSED", label: "Pilot propuesto", description: "Se presentó alcance del Revenue Recovery Pilot." },
  { key: "PILOT_ACTIVE", label: "Pilot activo", description: "La activación de 45 días está en curso." },
  { key: "PAID", label: "Pago", description: "Cliente pago o suscripción activa." },
  { key: "LOST", label: "Perdido", description: "La oportunidad salió del proceso comercial." },
];

const sourceLabels: Record<Opportunity["source_type"], string> = {
  WEBSITE_DIAGNOSTIC: "Diagnóstico web",
  PLAN_REQUEST: "Solicitud de plan",
  MANUAL: "Manual",
};

export default async function InternalSalesPipelinePage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: platformAdmin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!platformAdmin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_opportunities")
    .select("id,source_type,company,contact_name,email,phone,source_status,stage,created_at")
    .order("created_at", { ascending: false });

  const opportunities = (data || []) as Opportunity[];
  const newCount = opportunities.filter((item) => item.stage === "NEW").length;
  const paidCount = opportunities.filter((item) => item.stage === "PAID").length;
  const activeCount = opportunities.filter((item) => !["NEW", "PAID", "LOST"].includes(item.stage)).length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1600px]">
        <Link href="/protected/admin" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15} /> Volver a Admin</Link>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Ventas internas RevScale</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Pipeline B2B</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Recorrido comercial desde la entrada hasta el pago. Cada cambio de etapa queda registrado automáticamente para medir después demo → pilot → pago.</p>
          </div>
          <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] px-5 py-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Oportunidades totales</p><p className="mt-1 font-serif text-3xl">{opportunities.length}</p></div>
        </div>

        {params.success && <div className="mt-6 rounded-xl border border-[#b7c5aa] bg-[#e5eadf] px-4 py-3 text-sm text-[#4d5c46]">{params.success}</div>}
        {params.error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] px-4 py-3 text-sm text-[#7b4539]">{params.error}</div>}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat icon={<Inbox size={17} />} label="Nuevas" value={newCount} detail="pendientes de primer contacto" />
          <Stat icon={<Radar size={17} />} label="En proceso" value={activeCount} detail="entre contacto y pilot" />
          <Stat icon={<BadgeDollarSign size={17} />} label="Pagas" value={paidCount} detail="clientes activados o pagos" />
        </section>

        <section className="mt-8 overflow-x-auto pb-4">
          <div className="grid min-w-[2800px] grid-cols-9 gap-4">
            {stages.map((stage) => (
              <PipelineColumn key={stage.key} stage={stage} items={opportunities.filter((item) => item.stage === stage.key)} />
            ))}
          </div>
        </section>

        {!opportunities.length && <div className="mt-8 rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">Todavía no hay oportunidades B2B.</div>}
      </div>
    </main>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#7a674d]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7a67]">{label}</p></div><p className="mt-2 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}

function PipelineColumn({ stage, items }: { stage: { key: Stage; label: string; description: string }; items: Opportunity[] }) {
  return (
    <section className={`rounded-2xl border p-4 ${stage.key === "PAID" ? "border-[#aeb99f] bg-[#e4e8dc]" : stage.key === "LOST" ? "border-[#d5bcb0] bg-[#eee1da]" : "border-[#d2c5b3] bg-[#eee5d8]"}`}>
      <div className="min-h-24 border-b border-[#d7caba] pb-4"><div className="flex items-start justify-between gap-3"><h2 className="font-serif text-xl">{stage.label}</h2><span className="rounded-full border border-[#c8b89f] bg-[#f7f0e6] px-2.5 py-1 text-xs font-semibold text-[#6b5a44]">{items.length}</span></div><p className="mt-2 text-xs leading-5 text-[#746c62]">{stage.description}</p></div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4 shadow-[0_8px_24px_rgba(72,58,40,0.03)]">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d8cbb8] bg-[#efe5d6] text-[#7a674d]"><Building2 size={16} /></span><div className="min-w-0"><h3 className="truncate font-semibold text-[#39342e]">{item.company}</h3><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7a67]">{sourceLabels[item.source_type]}</p></div></div>
            <div className="mt-4 grid gap-2 text-xs text-[#665f56]"><p className="flex items-center gap-2"><UserRound size={13} /> {item.contact_name || "Sin contacto"}</p>{item.email && <p className="break-all">{item.email}</p>}{item.phone && <p>{item.phone}</p>}<p className="text-[#8a8176]">Ingreso: {new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(item.created_at))}</p></div>
            <form action={updateB2BStage} className="mt-4 border-t border-[#e0d5c5] pt-3">
              <input type="hidden" name="opportunity_id" value={item.id} />
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]" htmlFor={`stage-${item.id}`}>Mover etapa</label>
              <div className="mt-2 flex gap-2"><select id={`stage-${item.id}`} name="stage" defaultValue={item.stage} className="min-w-0 flex-1 rounded-lg border border-[#cfc1ad] bg-[#f7f0e6] px-2 py-2 text-xs text-[#4e483f]">{stages.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><button className="rounded-lg bg-[#302d28] px-3 py-2 text-xs font-semibold text-[#fffaf2]">Guardar</button></div>
            </form>
          </article>
        ))}
        {!items.length && <div className="rounded-xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-5 text-center text-xs text-[#81786d]">Sin oportunidades.</div>}
      </div>
    </section>
  );
}
