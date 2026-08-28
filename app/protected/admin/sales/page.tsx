import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeDollarSign, Building2, Inbox, Radar, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Opportunity = {
  id: string;
  source_type: "WEBSITE_DIAGNOSTIC" | "PLAN_REQUEST" | "MANUAL";
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  source_status: string | null;
  stage: string;
  created_at: string;
};

const sourceLabels: Record<Opportunity["source_type"], string> = {
  WEBSITE_DIAGNOSTIC: "Diagnóstico web",
  PLAN_REQUEST: "Solicitud de plan",
  MANUAL: "Manual",
};

export default async function InternalSalesPipelinePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!platformAdmin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_opportunities")
    .select("id,source_type,company,contact_name,email,phone,source_status,stage,created_at")
    .order("created_at", { ascending: false });

  const opportunities = (data || []) as Opportunity[];
  const newCount = opportunities.filter((item) => item.stage === "NEW").length;
  const paidCount = opportunities.filter((item) => item.stage === "PAID").length;
  const sourceCount = new Set(opportunities.map((item) => item.source_type)).size;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/admin" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]">
          <ArrowLeft size={15} /> Volver a Admin
        </Link>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Ventas internas RevScale</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Pipeline B2B</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">
              Una sola vista para oportunidades de RevScale. Se alimenta automáticamente desde diagnósticos comerciales y solicitudes de plan, sin mezclarse con los leads inmobiliarios de clientes.
            </p>
          </div>
          <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Oportunidades totales</p>
            <p className="mt-1 font-serif text-3xl">{opportunities.length}</p>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat icon={<Inbox size={17} />} label="Nuevas" value={newCount} detail="requieren clasificación comercial" />
          <Stat icon={<BadgeDollarSign size={17} />} label="Pagas / activas" value={paidCount} detail="ya llegaron a activación o pago" />
          <Stat icon={<Radar size={17} />} label="Fuentes" value={sourceCount} detail="orígenes B2B activos" />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <PipelineColumn title="Nuevas" subtitle="Entradas comerciales sin etapa de venta definida todavía." items={opportunities.filter((item) => item.stage === "NEW")} />
          <PipelineColumn title="Pagas / activas" subtitle="Solicitudes ya activadas o con pago registrado." items={opportunities.filter((item) => item.stage === "PAID")} />
        </section>

        {!opportunities.length && (
          <div className="mt-8 rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center text-sm text-[#716a61]">
            Todavía no hay oportunidades B2B. Cuando entre un diagnóstico o una solicitud de plan, aparecerá automáticamente acá.
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return (
    <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
      <div className="flex items-center gap-2 text-[#7a674d]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7a67]">{label}</p></div>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      <p className="mt-1 text-xs text-[#81786d]">{detail}</p>
    </div>
  );
}

function PipelineColumn({ title, subtitle, items }: { title: string; subtitle: string; items: Opportunity[] }) {
  return (
    <section className="rounded-2xl border border-[#d2c5b3] bg-[#eee5d8] p-4 md:p-5">
      <div className="flex items-start justify-between gap-4 border-b border-[#d7caba] pb-4">
        <div><h2 className="font-serif text-2xl">{title}</h2><p className="mt-1 text-xs leading-5 text-[#746c62]">{subtitle}</p></div>
        <span className="rounded-full border border-[#c8b89f] bg-[#f7f0e6] px-3 py-1 text-xs font-semibold text-[#6b5a44]">{items.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-[#d7caba] bg-[#fffaf2] p-4 shadow-[0_8px_24px_rgba(72,58,40,0.03)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d8cbb8] bg-[#efe5d6] text-[#7a674d]"><Building2 size={16} /></span>
                <div className="min-w-0"><h3 className="truncate font-semibold text-[#39342e]">{item.company}</h3><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7a67]">{sourceLabels[item.source_type]}</p></div>
              </div>
              {item.source_status && <span className="rounded-full border border-[#d8cbb8] bg-[#f4ecdf] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#766a5c]">{item.source_status}</span>}
            </div>
            <div className="mt-4 grid gap-2 text-xs text-[#665f56]">
              <p className="flex items-center gap-2"><UserRound size={13} /> {item.contact_name || "Sin contacto"}</p>
              {item.email && <p className="break-all">{item.email}</p>}
              {item.phone && <p>{item.phone}</p>}
              <p className="text-[#8a8176]">Ingreso: {new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(item.created_at))}</p>
            </div>
          </article>
        ))}
        {!items.length && <div className="rounded-xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-6 text-center text-xs text-[#81786d]">Sin oportunidades en esta etapa.</div>}
      </div>
    </section>
  );
}
