import { redirect } from "next/navigation";
import { Bell, Building2, CalendarClock, CheckCircle2, Clock3, Users, Zap } from "lucide-react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { toggleAutomationRule, updateAutomationTiming } from "./actions";

type Rule = {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  condition_json: Record<string, number> | null;
  action_type: string;
  action_config: Record<string, number> | null;
  enabled: boolean;
};

type Run = {
  id: string;
  summary: string;
  entity_type: string;
  created_at: string;
  automation_rules: { name: string } | { name: string }[] | null;
};

const TRIGGER_COPY: Record<string, string> = {
  LEAD_UNCONTACTED: "un lead queda sin contacto",
  VISIT_RECORDED: "un lead entra en Visita",
  PROPERTY_CREATED: "se crea una propiedad",
  RESERVATION_CREATED: "una venta entra en Reserva",
  CLOSING_SOON: "se acerca una fecha de cierre",
};

const CONDITION_COPY: Record<string, string> = {
  LEAD_UNCONTACTED: "sigue sin contacto saliente",
  VISIT_RECORDED: "la visita quedó registrada",
  PROPERTY_CREATED: "la propiedad está disponible",
  RESERVATION_CREATED: "la reserva quedó confirmada en pipeline",
  CLOSING_SOON: "la oportunidad sigue abierta",
};

const ACTION_COPY: Record<string, string> = {
  NOTIFY_AGENT: "avisar al agente",
  CREATE_FOLLOWUP: "crear seguimiento",
  CALCULATE_MATCHES: "calcular matches",
  NOTIFY_ADMIN: "avisar a Dirección",
  NOTIFY_AGENT_AND_DIRECTOR: "avisar al agente y Dirección",
};

export default async function AutomationsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.role !== "OWNER") redirect("/protected");

  if (!planHasFeature(context.plan, "automations")) {
    return <UpgradePlanGate title="Automatizaciones inmobiliarias" description="Automatizá alertas, seguimientos, matching y cierres sin depender de tareas manuales." requiredPlan="Professional" />;
  }

  const [{ data: rulesData, error: rulesError }, { data: runsData, error: runsError }] = await Promise.all([
    context.supabase
      .from("automation_rules")
      .select("id,name,description,trigger_type,condition_json,action_type,action_config,enabled")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: true }),
    context.supabase
      .from("automation_runs")
      .select("id,summary,entity_type,created_at,automation_rules(name)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const rules = (rulesData || []) as Rule[];
  const runs = (runsData || []) as Run[];
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date());
  const runsToday = runs.filter((run) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date(run.created_at)) === today).length;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Operación automática</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Automatizaciones</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">Reglas inmobiliarias simples que trabajan aunque nadie tenga RevScale abierto.</p>
          </div>
          <div className="rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]">
            <span className="font-semibold">Motor activo</span> · revisa reglas por tiempo cada 15 minutos
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric icon={<Zap size={18} strokeWidth={1.7} />} label="Reglas activas" value={`${enabledCount}/${rules.length}`} />
          <Metric icon={<CheckCircle2 size={18} strokeWidth={1.7} />} label="Ejecuciones hoy" value={String(runsToday)} />
          <Metric icon={<Clock3 size={18} strokeWidth={1.7} />} label="Frecuencia" value="15 min" />
        </section>

        {(rulesError || runsError) && <div className="mt-6 rounded-xl border border-[#d3b7ae] bg-[#f1dfd8] p-4 text-sm text-[#704b3d]">No se pudo cargar una parte del motor de automatizaciones.</div>}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="font-serif text-2xl font-medium text-[#302d28]">Reglas prediseñadas</h2><p className="mt-1 text-sm text-[#756d63]">Activá, desactivá y ajustá los plazos sin tocar configuración técnica.</p></div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {rules.map((rule) => <RuleCard key={rule.id} rule={rule} />)}
          </div>
        </section>

        <section className="mt-9 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <div className="border-b border-[#ddd1c0] px-5 py-4 md:px-6"><h2 className="font-serif text-2xl font-medium text-[#302d28]">Historial reciente</h2><p className="mt-1 text-xs leading-5 text-[#81796e]">Cada acción automática queda registrada para que Dirección sepa qué hizo el sistema.</p></div>
          {runs.map((run) => {
            const relation = Array.isArray(run.automation_rules) ? run.automation_rules[0] : run.automation_rules;
            return <article key={run.id} className="flex flex-col gap-2 border-b border-[#e2d7c8] px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between md:px-6"><div><p className="text-sm font-semibold text-[#474038]">{relation?.name || "Automatización"}</p><p className="mt-1 text-sm text-[#71695f]">{run.summary}</p></div><p className="shrink-0 text-xs text-[#8a8176]">{formatDate(run.created_at)}</p></article>;
          })}
          {!runs.length && <div className="px-6 py-12 text-center text-sm text-[#81796e]">Las próximas ejecuciones aparecerán acá.</div>}
        </section>
      </div>
    </main>
  );
}

function RuleCard({ rule }: { rule: Rule }) {
  const icon = rule.trigger_type === "PROPERTY_CREATED" ? <Building2 size={18} strokeWidth={1.7} /> : rule.trigger_type === "CLOSING_SOON" ? <CalendarClock size={18} strokeWidth={1.7} /> : rule.trigger_type === "LEAD_UNCONTACTED" ? <Users size={18} strokeWidth={1.7} /> : <Bell size={18} strokeWidth={1.7} />;
  const timing = getTiming(rule);

  return (
    <article className={`rounded-2xl border p-5 transition ${rule.enabled ? "border-[#c9b99f] bg-[#f7f0e6]" : "border-[#d8cdbd] bg-[#eee6db] opacity-75"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3"><div className="rounded-lg border border-[#d1c3ad] bg-[#eee4d5] p-2 text-[#765f43]">{icon}</div><div><h3 className="font-serif text-xl font-medium text-[#37312a]">{rule.name}</h3><p className="mt-1 text-xs leading-5 text-[#81796e]">{rule.description}</p></div></div>
        <form action={toggleAutomationRule}><input type="hidden" name="id" value={rule.id} /><input type="hidden" name="enabled" value={rule.enabled ? "false" : "true"} /><button className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${rule.enabled ? "border-[#b7bea8] bg-[#e7eadf] text-[#596146]" : "border-[#cfc2b1] bg-[#f3ece2] text-[#7a7167]"}`}>{rule.enabled ? "Activa" : "Pausada"}</button></form>
      </div>

      <div className="mt-5 rounded-xl border border-[#ded2c1] bg-[#fffaf2] p-4 text-sm leading-6 text-[#514a41]">
        <span className="font-semibold text-[#795f3e]">Cuando</span> {TRIGGER_COPY[rule.trigger_type] || rule.trigger_type}
        <span className="mx-2 text-[#a08f79]">+</span><span className="font-semibold text-[#795f3e]">si</span> {CONDITION_COPY[rule.trigger_type] || "se cumple la condición"}
        <span className="mx-2 text-[#a08f79]">→</span><span className="font-semibold text-[#795f3e]">hacer</span> {ACTION_COPY[rule.action_type] || rule.action_type}.
      </div>

      {timing && <form action={updateAutomationTiming} className="mt-4 flex flex-wrap items-center gap-3"><input type="hidden" name="id" value={rule.id} /><input type="hidden" name="trigger_type" value={rule.trigger_type} /><label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#81796e]">{timing.label}</label><select name="value" defaultValue={timing.value} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-sm text-[#4f473d]">{timing.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button className="rounded-lg border border-[#bfae94] bg-[#eee4d5] px-3 py-2 text-xs font-semibold text-[#62533f] hover:bg-[#e7dac8]">Guardar plazo</button></form>}
    </article>
  );
}

function getTiming(rule: Rule) {
  if (rule.trigger_type === "LEAD_UNCONTACTED") return { label: "Esperar", value: rule.condition_json?.hours || 24, options: [{ value: 24, label: "24 horas" }, { value: 48, label: "48 horas" }] };
  if (rule.trigger_type === "VISIT_RECORDED") return { label: "Crear seguimiento en", value: rule.action_config?.hours_after || 24, options: [{ value: 24, label: "24 horas" }, { value: 48, label: "48 horas" }] };
  if (rule.trigger_type === "CLOSING_SOON") return { label: "Avisar con", value: rule.condition_json?.days || 2, options: [{ value: 1, label: "1 día" }, { value: 2, label: "2 días" }, { value: 3, label: "3 días" }, { value: 7, label: "7 días" }] };
  return null;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", { timeZone: "America/Montevideo", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
