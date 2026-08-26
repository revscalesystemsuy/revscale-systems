import { redirect } from "next/navigation";
import { CalendarClock, MessageCircle, PauseCircle, PlayCircle, ShieldCheck } from "lucide-react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

export default async function NurturingPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.role !== "OWNER") redirect("/protected");

  if (!planHasFeature(context.plan, "automations")) {
    return <UpgradePlanGate title="Nurturing automático" description="Mantené vivos los leads durante semanas o meses sin perseguirlos manualmente." requiredPlan="Professional" />;
  }

  const [{ data: sequences }, { data: enrollments }, { data: actions }] = await Promise.all([
    context.supabase.from("nurture_sequences").select("id,name,operation,enabled").eq("organization_id", context.organizationId).order("name"),
    context.supabase.from("nurture_enrollments").select("id,status,next_action_at,lead_id,nurture_sequences(name),leads(full_name)").eq("organization_id", context.organizationId).order("updated_at", { ascending: false }).limit(40),
    context.supabase.from("nurture_actions").select("id,status,scheduled_at,message_body,reason,lead_id,leads(full_name)").eq("organization_id", context.organizationId).order("created_at", { ascending: false }).limit(20),
  ]);

  const active = (enrollments || []).filter((item) => item.status === "ACTIVE").length;
  const paused = (enrollments || []).filter((item) => item.status.startsWith("PAUSED_")).length;
  const blocked = (actions || []).filter((item) => item.status === "BLOCKED_META").length;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Autopilot comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Nurturing</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">Secuencias inteligentes que acompañan leads de compra y alquiler y se detienen solas cuando el cliente responde, avanza de etapa o requiere atención humana.</p>
          </div>
          <div className="rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]"><span className="font-semibold">Motor activo</span> · revisión cada 15 minutos</div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric icon={<PlayCircle size={18} />} label="Leads activos" value={String(active)} />
          <Metric icon={<PauseCircle size={18} />} label="Pausados automáticamente" value={String(paused)} />
          <Metric icon={<MessageCircle size={18} />} label="Esperando Meta" value={String(blocked)} />
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 text-[#765f43]" /><div><h2 className="font-serif text-2xl text-[#302d28]">Guardrails automáticos</h2><p className="mt-2 text-sm leading-6 text-[#6d655b]">RevScale no continúa una secuencia si detecta una respuesta entrante, si el lead pasa a Visita/Negociación/Reserva/Cierre, o si WhatsApp exige handoff humano. Mientras Meta no esté LIVE, prepara la acción pero no envía nada.</p></div></div>
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-2xl font-medium text-[#302d28]">Secuencias base</h2>
          <p className="mt-1 text-sm text-[#756d63]">Días 1 · 3 · 7 · 14 · 30 · 60 · 90, separadas por tipo de operación.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(sequences || []).map((sequence) => <article key={sequence.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a7556]">{sequence.operation === "COMPRA" ? "Compra" : "Alquiler"}</p><h3 className="mt-2 font-serif text-xl text-[#37312a]">{sequence.name}</h3></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${sequence.enabled ? "border-[#b7bea8] bg-[#e7eadf] text-[#596146]" : "border-[#cfc2b1] bg-[#f3ece2] text-[#7a7167]"}`}>{sequence.enabled ? "Activa" : "Pausada"}</span></div><div className="mt-4 flex items-center gap-2 text-sm text-[#6d655b]"><CalendarClock size={16} /> 7 contactos máximos en 90 días</div></article>)}
          </div>
        </section>

        <section className="mt-9 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]">
          <div className="border-b border-[#ddd1c0] px-5 py-4 md:px-6"><h2 className="font-serif text-2xl font-medium text-[#302d28]">Actividad reciente</h2><p className="mt-1 text-xs leading-5 text-[#81796e]">Preparada, bloqueada por Meta o lista para despacho.</p></div>
          {(actions || []).map((action) => <article key={action.id} className="flex flex-col gap-2 border-b border-[#e2d7c8] px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between md:px-6"><div><p className="text-sm font-semibold text-[#474038]">{relationName(action.leads) || "Lead"}</p><p className="mt-1 max-w-3xl text-sm text-[#71695f]">{action.message_body}</p>{action.reason && <p className="mt-1 text-xs text-[#9a6d4b]">{action.reason}</p>}</div><span className="shrink-0 rounded-full border border-[#d1c3ad] bg-[#fffaf2] px-3 py-1 text-xs font-semibold text-[#665842]">{statusLabel(action.status)}</span></article>)}
          {!actions?.length && <div className="px-6 py-12 text-center text-sm text-[#81796e]">Las próximas acciones del Autopilot aparecerán acá.</div>}
        </section>
      </div>
    </main>
  );
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return relationName(value[0]);
  if (value && typeof value === "object" && "full_name" in value) {
    const name = (value as { full_name?: unknown }).full_name;
    return typeof name === "string" ? name : null;
  }
  return null;
}
function statusLabel(status: string) { return status === "BLOCKED_META" ? "Esperando Meta" : status === "READY" ? "Lista" : status === "SENT" ? "Enviada" : status; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p></div>; }
