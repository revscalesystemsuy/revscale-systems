import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, Clock3, Radar, RefreshCw, Sparkles } from "lucide-react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { updateReactivationOpportunity } from "./actions";

export default async function ReactivationPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "matching")) {
    return <UpgradePlanGate title="Opportunity Radar" description="Detectá motivos reales para reactivar leads dormidos usando matching, cambios de precio y disponibilidad." requiredPlan="Professional" />;
  }

  const { data: opportunities } = await context.supabase
    .from("reactivation_opportunities")
    .select("id,opportunity_type,score,compatibility,reason,status,detected_at,context,lead_id,property_id,leads(full_name,lead_temperature,pipeline_stage,budget_max,currency),properties(title,price,currency,zone)")
    .eq("organization_id", context.organizationId)
    .order("score", { ascending: false })
    .order("detected_at", { ascending: false })
    .limit(100);

  const rows = opportunities || [];
  const open = rows.filter((item) => item.status === "OPEN");
  const high = open.filter((item) => item.score >= 90).length;
  const contacted = rows.filter((item) => item.status === "CONTACTED").length;
  const potential = open.reduce((sum, item) => sum + Number(relation(item.leads)?.budget_max || 0), 0);

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Opportunity Radar</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Reactivación inteligente</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">RevScale busca una razón concreta para volver a contactar: match nuevo, baja de precio, disponibilidad recuperada, nueva unidad o una búsqueda dormida que sigue teniendo una coincidencia fuerte.</p>
          </div>
          <div className="rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]"><span className="font-semibold">Radar activo</span> · actualización cada 15 minutos</div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Radar size={18}/>} label="Oportunidades abiertas" value={String(open.length)} />
          <Metric icon={<Sparkles size={18}/>} label="Prioridad 90+" value={String(high)} />
          <Metric icon={<RefreshCw size={18}/>} label="Ya contactadas" value={String(contacted)} />
          <Metric icon={<ArrowDownRight size={18}/>} label="Pipeline recuperable" value={formatMoney(potential)} />
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <div className="flex items-start gap-3"><Clock3 size={20} className="mt-0.5 text-[#765f43]"/><div><h2 className="font-serif text-2xl text-[#302d28]">No dispara mensajes por insistir</h2><p className="mt-2 text-sm leading-6 text-[#6d655b]">El Radar genera oportunidades y explica por qué. El contacto queda en manos del agente —y más adelante podrá usar templates aprobados de Meta— para evitar mensajes irrelevantes o fuera de contexto.</p></div></div>
        </section>

        <section className="mt-9 space-y-4">
          {rows.map((item) => {
            const lead = relation(item.leads);
            const property = relation(item.properties);
            const ctx = item.context && typeof item.context === "object" ? item.context as Record<string, unknown> : {};
            return <article key={item.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#c7b89f] bg-[#eee4d5] px-3 py-1 text-[11px] font-semibold text-[#6d5a40]">{typeLabel(item.opportunity_type)}</span><span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${item.score >= 90 ? "border-[#b2b99f] bg-[#e5e9dc] text-[#515b42]" : "border-[#d1c3ad] bg-[#fffaf2] text-[#665842]"}`}>Score {item.score}</span>{item.compatibility != null && <span className="text-xs text-[#81796e]">Match {item.compatibility}%</span>}</div>
                  <h2 className="mt-4 font-serif text-2xl text-[#302d28]">{lead?.full_name || "Lead"}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#625d55]">{item.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#81796e]">{property?.title && <span>{property.title}</span>}{property?.zone && <span>{property.zone}</span>}{lead?.lead_temperature && <span>{lead.lead_temperature}</span>}<span>{formatDate(item.detected_at)}</span></div>
                  {typeof ctx.old_price === "number" && typeof ctx.new_price === "number" && <p className="mt-3 text-xs font-semibold text-[#705f47]">Precio: {formatMoney(ctx.old_price)} → {formatMoney(ctx.new_price)}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                  {item.lead_id && <Link href={`/protected/leads/${item.lead_id}`} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3.5 py-2 text-xs font-semibold text-[#554f47]">Ver lead</Link>}
                  {item.status === "OPEN" && <><form action={updateReactivationOpportunity}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="CONTACTED"/><button className="rounded-lg bg-[#302d28] px-3.5 py-2 text-xs font-semibold !text-[#fffaf2]">Marcar contactado</button></form><form action={updateReactivationOpportunity}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="DISMISSED"/><button className="rounded-lg border border-[#cdbfa9] px-3.5 py-2 text-xs font-semibold text-[#6d655b]">Descartar</button></form></>}
                  {item.status !== "OPEN" && <span className="rounded-lg border border-[#cdbfa9] bg-[#eee4d5] px-3.5 py-2 text-xs font-semibold text-[#655842]">{statusLabel(item.status)}</span>}
                </div>
              </div>
            </article>;
          })}
          {!rows.length && <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] px-6 py-14 text-center"><Radar size={28} className="mx-auto text-[#8d7553]"/><p className="mt-4 font-serif text-xl text-[#302d28]">No hay oportunidades de reactivación todavía</p><p className="mt-2 text-sm text-[#756e64]">El Radar las crea automáticamente cuando aparece un motivo comercial relevante.</p></div>}
        </section>
      </div>
    </main>
  );
}

function relation(value: unknown): Record<string, unknown> | null { if (Array.isArray(value)) return relation(value[0]); return value && typeof value === "object" ? value as Record<string, unknown> : null; }
function typeLabel(type: string) { return ({ NEW_MATCH: "Nuevo match", PRICE_DROP: "Baja de precio", BACK_AVAILABLE: "Volvió disponible", NEW_UNIT: "Nueva unidad", DORMANT_STRONG_MATCH: "Lead dormido" } as Record<string,string>)[type] || type; }
function statusLabel(status: string) { return ({ CONTACTED: "Contactada", DISMISSED: "Descartada", CONVERTED: "Convertida" } as Record<string,string>)[status] || status; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value)); }
function formatMoney(value: unknown) { const number = Number(value || 0); return number ? new Intl.NumberFormat("es-UY", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(number) : "USD 0"; }
function Metric({ icon,label,value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p></div>; }
