import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CheckCircle2, CircleDollarSign, Clock3, ShieldCheck, Users } from "lucide-react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { updateCommission, upsertCommissionRule } from "./actions";

type Commission = {
  id: string;
  lead_id: string;
  agent_id: string | null;
  operation: string | null;
  currency: string;
  deal_amount: number | null;
  deal_amount_source: string;
  brokerage_rate: number;
  gross_commission: number;
  agent_split_rate: number;
  agent_commission: number;
  office_commission: number;
  collected_amount: number;
  payment_status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

type Rule = {
  id: string;
  agent_id: string | null;
  operation: string;
  brokerage_rate: number;
  agent_split_rate: number;
  is_active: boolean;
};

const STATUS_COPY: Record<string, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Cobro parcial",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
};

const AGENT_STATUS_COPY: Record<string, string> = {
  PENDING: "Pendiente de cobro",
  PARTIAL: "Cobro parcial",
  PAID: "Honorarios cobrados",
  CANCELLED: "Cancelada",
};

export default async function CommissionsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");

  if (!planHasFeature(context.plan, "commissions")) {
    return <UpgradePlanGate title="Comisiones y liquidaciones" description="Calculá honorarios por cierre, distribuí el split del agente y controlá qué está pendiente, cobrado o pagado." requiredPlan="Professional" />;
  }

  const isManagement = context.role === "OWNER" || context.role === "MANAGER";
  const orgId = context.organizationId;
  let commissionsQuery = context.supabase
    .from("commissions")
    .select("id,lead_id,agent_id,operation,currency,deal_amount,deal_amount_source,brokerage_rate,gross_commission,agent_split_rate,agent_commission,office_commission,collected_amount,payment_status,due_date,notes,created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (!isManagement) {
    commissionsQuery = commissionsQuery.eq("agent_id", context.userId);
  }

  const { data: commissionsData, error: commissionsError } = await commissionsQuery;
  const commissions = (commissionsData || []) as Commission[];
  const leadIds = [...new Set(commissions.map((item) => item.lead_id))];
  const leadsResult = leadIds.length
    ? await context.supabase.from("leads").select("id,full_name").eq("organization_id", orgId).in("id", leadIds)
    : { data: [], error: null };
  const leadNameById = new Map((leadsResult.data || []).map((lead) => [lead.id, lead.full_name || "Lead sin nombre"]));

  if (!isManagement) {
    return <AgentCommissionView commissions={commissions} leadNameById={leadNameById} hasError={Boolean(commissionsError || leadsResult.error)} />;
  }

  const [{ data: rulesData, error: rulesError }, { data: membersData, error: membersError }] = await Promise.all([
    context.supabase.from("commission_rules").select("id,agent_id,operation,brokerage_rate,agent_split_rate,is_active").eq("organization_id", orgId).order("created_at", { ascending: true }),
    context.supabase.from("organization_members").select("user_id,role").eq("organization_id", orgId).eq("status", "ACTIVE"),
  ]);

  const memberIds = [...new Set((membersData || []).map((member) => member.user_id))];
  const profilesResult = memberIds.length
    ? await context.supabase.from("profiles").select("id,full_name").in("id", memberIds)
    : { data: [], error: null };
  const rules = (rulesData || []) as Rule[];
  const profileNameById = new Map((profilesResult.data || []).map((profile) => [profile.id, profile.full_name]));
  const agents = (membersData || [])
    .filter((member) => member.role === "AGENT")
    .map((member) => ({ id: member.user_id, name: profileNameById.get(member.user_id) || "Agente" }));

  return (
    <ManagementCommissionView
      role={context.role}
      commissions={commissions}
      rules={rules}
      agents={agents}
      leadNameById={leadNameById}
      profileNameById={profileNameById}
      hasError={Boolean(commissionsError || leadsResult.error || rulesError || membersError || profilesResult.error)}
    />
  );
}

function AgentCommissionView({ commissions, leadNameById, hasError }: { commissions: Commission[]; leadNameById: Map<string, string>; hasError: boolean }) {
  const pendingCount = commissions.filter((item) => item.payment_status === "PENDING" || item.payment_status === "PARTIAL").length;
  const paidCount = commissions.filter((item) => item.payment_status === "PAID").length;
  const personalByCurrency = new Map<string, number>();

  for (const item of commissions.filter((commission) => commission.payment_status !== "CANCELLED")) {
    const currency = (item.currency || "USD").toUpperCase();
    personalByCurrency.set(currency, (personalByCurrency.get(currency) || 0) + Number(item.agent_commission || 0));
  }

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Vista privada del agente</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Mi comisión</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">Acá ves únicamente las comisiones asociadas a tus propios cierres. No tenés acceso a comisiones, reglas ni totales de otros agentes.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]"><ShieldCheck size={17} strokeWidth={1.7} /><span><b>Privado</b> · visible para vos y Gerencia</span></div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric icon={<CircleDollarSign size={18} strokeWidth={1.7} />} label="Mis liquidaciones" value={String(commissions.length)} />
          <Metric icon={<Clock3 size={18} strokeWidth={1.7} />} label="Con cobro pendiente" value={String(pendingCount)} />
          <Metric icon={<CheckCircle2 size={18} strokeWidth={1.7} />} label="Cobro completado" value={String(paidCount)} />
        </section>

        {personalByCurrency.size > 0 && <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...personalByCurrency.entries()].map(([currency, value]) => <MoneyMetric key={currency} label={`Mi comisión generada · ${currency}`} value={formatMoney(currency, value)} />)}
        </section>}

        {hasError && <div className="mt-6 rounded-xl border border-[#d3b7ae] bg-[#f1dfd8] p-4 text-sm text-[#704b3d]">No se pudo cargar una parte de tus comisiones.</div>}

        <section className="mt-9 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <div className="border-b border-[#ddd1c0] px-5 py-4 md:px-6">
            <h2 className="font-serif text-2xl font-medium text-[#302d28]">Mis cierres liquidados</h2>
            <p className="mt-1 text-xs leading-5 text-[#81796e]">La vista del agente no muestra la parte de la oficina ni información de compañeros.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-[#eee4d6] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7f7568]"><tr><Th>Lead</Th><Th>Operación</Th><Th>Valor</Th><Th>Mi split</Th><Th>Mi comisión</Th><Th>Estado del cobro</Th></tr></thead>
              <tbody>
                {commissions.map((item) => <tr key={item.id} className="border-t border-[#e2d7c8] text-[#514a41]">
                  <Td><p className="font-semibold text-[#37312a]">{leadNameById.get(item.lead_id) || "Operación cerrada"}</p><p className="mt-1 text-xs text-[#8a8176]">{item.deal_amount_source === "ACTUAL" ? "Valor confirmado" : "Valor estimado"}</p></Td>
                  <Td>{operationLabel(item.operation)}</Td>
                  <Td>{formatMoney(item.currency, Number(item.deal_amount || 0))}</Td>
                  <Td>{formatPercent(item.agent_split_rate)}</Td>
                  <Td><span className="font-semibold text-[#3f392f]">{formatMoney(item.currency, Number(item.agent_commission || 0))}</span></Td>
                  <Td><StatusBadge value={item.payment_status} copy={AGENT_STATUS_COPY} /></Td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {!commissions.length && <div className="px-6 py-12 text-center"><p className="font-serif text-xl text-[#474038]">Todavía no tenés comisiones registradas.</p><p className="mt-2 text-sm text-[#81796e]">Cuando uno de tus leads llegue a Cierre, tu liquidación aparecerá acá automáticamente.</p></div>}
        </section>
      </div>
    </main>
  );
}

function ManagementCommissionView({ role, commissions, rules, agents, leadNameById, profileNameById, hasError }: {
  role: "OWNER" | "MANAGER" | "AGENT";
  commissions: Commission[];
  rules: Rule[];
  agents: { id: string; name: string }[];
  leadNameById: Map<string, string>;
  profileNameById: Map<string, string | null>;
  hasError: boolean;
}) {
  const moneyByCurrency = new Map<string, { gross: number; collected: number; pending: number; agent: number }>();
  for (const item of commissions.filter((commission) => commission.payment_status !== "CANCELLED")) {
    const currency = (item.currency || "USD").toUpperCase();
    const current = moneyByCurrency.get(currency) || { gross: 0, collected: 0, pending: 0, agent: 0 };
    current.gross += Number(item.gross_commission || 0);
    current.collected += Number(item.collected_amount || 0);
    current.pending += Math.max(Number(item.gross_commission || 0) - Number(item.collected_amount || 0), 0);
    current.agent += Number(item.agent_commission || 0);
    moneyByCurrency.set(currency, current);
  }
  const pendingCount = commissions.filter((commission) => commission.payment_status === "PENDING" || commission.payment_status === "PARTIAL").length;
  const paidCount = commissions.filter((commission) => commission.payment_status === "PAID").length;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">{role === "OWNER" ? "Dirección comercial" : "Gerencia comercial"}</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Comisiones</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">Cada cierre ganado genera una liquidación. Gerencia puede controlar valores, honorarios, splits y estado de cobro; los agentes solo ven su propia parte.</p>
          </div>
          <div className="rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]"><span className="font-semibold">Vista de gestión</span> · no visible entre agentes</div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric icon={<CircleDollarSign size={18} strokeWidth={1.7} />} label="Liquidaciones" value={String(commissions.length)} />
          <Metric icon={<Clock3 size={18} strokeWidth={1.7} />} label="Pendientes" value={String(pendingCount)} />
          <Metric icon={<CheckCircle2 size={18} strokeWidth={1.7} />} label="Pagadas" value={String(paidCount)} />
        </section>

        {moneyByCurrency.size > 0 && <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...moneyByCurrency.entries()].flatMap(([currency, item]) => [
            <MoneyMetric key={`${currency}-gross`} label={`Honorarios · ${currency}`} value={formatMoney(currency, item.gross)} />,
            <MoneyMetric key={`${currency}-collected`} label={`Cobrado · ${currency}`} value={formatMoney(currency, item.collected)} />,
            <MoneyMetric key={`${currency}-pending`} label={`Por cobrar · ${currency}`} value={formatMoney(currency, item.pending)} />,
            <MoneyMetric key={`${currency}-agent`} label={`Agentes · ${currency}`} value={formatMoney(currency, item.agent)} />,
          ])}
        </section>}

        {hasError && <div className="mt-6 rounded-xl border border-[#d3b7ae] bg-[#f1dfd8] p-4 text-sm text-[#704b3d]">No se pudo cargar una parte del módulo de comisiones.</div>}

        <section className="mt-9 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <div className="border-b border-[#ddd1c0] px-5 py-4 md:px-6"><h2 className="font-serif text-2xl font-medium text-[#302d28]">Liquidaciones por cierre</h2><p className="mt-1 text-xs leading-5 text-[#81796e]">Las monedas se mantienen separadas; RevScale nunca mezcla USD y UYU en un mismo total.</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="bg-[#eee4d6] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7f7568]"><tr><Th>Lead</Th><Th>Operación</Th><Th>Agente</Th><Th>Valor</Th><Th>Honorarios</Th><Th>Comisión bruta</Th><Th>Split</Th><Th>Agente</Th><Th>Oficina</Th><Th>Cobrado</Th><Th>Estado</Th><Th>Editar</Th></tr></thead>
              <tbody>
                {commissions.map((item) => <tr key={item.id} className="border-t border-[#e2d7c8] align-top text-[#514a41]">
                  <Td><p className="font-semibold text-[#37312a]">{leadNameById.get(item.lead_id) || "Lead"}</p><p className="mt-1 text-xs text-[#8a8176]">{item.deal_amount_source === "ACTUAL" ? "Valor confirmado" : "Valor estimado"}</p></Td>
                  <Td>{operationLabel(item.operation)}</Td>
                  <Td>{item.agent_id ? profileNameById.get(item.agent_id) || "Agente" : "Sin asignar"}</Td>
                  <Td>{formatMoney(item.currency, Number(item.deal_amount || 0))}</Td>
                  <Td>{formatPercent(item.brokerage_rate)}</Td>
                  <Td>{formatMoney(item.currency, Number(item.gross_commission || 0))}</Td>
                  <Td>{formatPercent(item.agent_split_rate)}</Td>
                  <Td>{formatMoney(item.currency, Number(item.agent_commission || 0))}</Td>
                  <Td>{formatMoney(item.currency, Number(item.office_commission || 0))}</Td>
                  <Td>{formatMoney(item.currency, Number(item.collected_amount || 0))}</Td>
                  <Td><StatusBadge value={item.payment_status} /></Td>
                  <Td><details><summary className="cursor-pointer text-xs font-semibold text-[#755f43]">Ajustar</summary><CommissionForm item={item} /></details></Td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {!commissions.length && <div className="px-6 py-12 text-center"><p className="font-serif text-xl text-[#474038]">Todavía no hay cierres liquidados.</p><p className="mt-2 text-sm text-[#81796e]">La próxima oportunidad que llegue a Cierre generará su comisión automáticamente.</p></div>}
        </section>

        <section className="mt-9 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <div className="flex items-start gap-3"><div className="rounded-lg border border-[#d1c3ad] bg-[#eee4d5] p-2 text-[#765f43]"><Users size={18} strokeWidth={1.7} /></div><div><h2 className="font-serif text-2xl font-medium text-[#302d28]">Reglas de comisión</h2><p className="mt-1 text-sm leading-6 text-[#756d63]">Definí una regla general o una excepción para un agente. Las nuevas liquidaciones guardan una copia del porcentaje aplicado.</p></div></div>
            <div className="mt-5 space-y-3">
              {rules.map((rule) => <div key={rule.id} className="flex flex-col gap-2 rounded-xl border border-[#ded2c1] bg-[#fffaf2] p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-[#474038]">{rule.agent_id ? profileNameById.get(rule.agent_id) || "Agente" : "Regla general"} · {operationLabel(rule.operation)}</p><p className="mt-1 text-xs text-[#81796e]">Honorarios {formatPercent(rule.brokerage_rate)} · split agente {formatPercent(rule.agent_split_rate)}</p></div><span className="text-xs font-semibold text-[#65704d]">{rule.is_active ? "Activa" : "Pausada"}</span></div>)}
              {!rules.length && <div className="rounded-xl border border-[#decfba] bg-[#f3eadc] p-4 text-sm leading-6 text-[#6f6250]">Todavía no definiste reglas. El motor usa como respaldo 3% de honorarios y 50% de split hasta que guardes tu primera configuración.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <h2 className="font-serif text-2xl font-medium text-[#302d28]">Configurar regla</h2>
            <p className="mt-2 text-sm leading-6 text-[#756d63]">Guardar la misma combinación actualiza la regla existente.</p>
            <form action={upsertCommissionRule} className="mt-5 space-y-4">
              <Field label="Aplicar a"><select name="agent_id" className={inputClass}><option value="">Todos los agentes</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></Field>
              <Field label="Operación"><select name="operation" className={inputClass}><option value="ALL">Todas</option><option value="COMPRA">Venta</option><option value="ALQUILER">Alquiler</option></select></Field>
              <Field label="Honorarios de la inmobiliaria (%)"><input name="brokerage_rate" type="number" min="0" max="100" step="0.01" defaultValue="3" required className={inputClass} /></Field>
              <Field label="Split del agente (%)"><input name="agent_split_rate" type="number" min="0" max="100" step="0.01" defaultValue="50" required className={inputClass} /></Field>
              <button className="w-full rounded-lg bg-[#302b25] px-4 py-3 text-sm font-semibold text-[#fffaf2] hover:bg-[#211e1a]">Guardar regla</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass = "w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-sm text-[#37332d] outline-none focus:border-[#8d7553]";

function CommissionForm({ item }: { item: Commission }) {
  return <form action={updateCommission} className="mt-3 w-72 space-y-2 rounded-xl border border-[#d6c9b7] bg-[#fffaf2] p-3 shadow-lg">
    <input type="hidden" name="commission_id" value={item.id} />
    <div className="grid grid-cols-2 gap-2"><input name="deal_amount" type="number" min="0" step="0.01" defaultValue={item.deal_amount ?? ""} placeholder="Valor" className={inputClass} /><input name="currency" maxLength={3} defaultValue={item.currency} className={inputClass} /></div>
    <div className="grid grid-cols-2 gap-2"><input name="brokerage_rate" type="number" min="0" max="100" step="0.01" defaultValue={item.brokerage_rate} className={inputClass} /><input name="agent_split_rate" type="number" min="0" max="100" step="0.01" defaultValue={item.agent_split_rate} className={inputClass} /></div>
    <input name="collected_amount" type="number" min="0" step="0.01" defaultValue={item.collected_amount} placeholder="Cobrado" className={inputClass} />
    <select name="payment_status" defaultValue={item.payment_status} className={inputClass}><option value="PENDING">Pendiente</option><option value="PARTIAL">Cobro parcial</option><option value="PAID">Pagada</option><option value="CANCELLED">Cancelada</option></select>
    <input name="due_date" type="date" defaultValue={item.due_date || ""} className={inputClass} />
    <textarea name="notes" defaultValue={item.notes || ""} rows={2} placeholder="Notas" className={inputClass} />
    <button className="w-full rounded-lg bg-[#302b25] px-3 py-2 text-xs font-semibold text-[#fffaf2]">Guardar cambios</button>
  </form>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p></div>; }
function MoneyMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#eee4d6] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{label}</p><p className="mt-2 font-serif text-2xl text-[#37312a]">{value}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#655d53]">{label}</span>{children}</label>; }
function Th({ children }: { children: ReactNode }) { return <th className="px-4 py-3">{children}</th>; }
function Td({ children }: { children: ReactNode }) { return <td className="px-4 py-4">{children}</td>; }
function StatusBadge({ value, copy = STATUS_COPY }: { value: string; copy?: Record<string, string> }) { const cls = value === "PAID" ? "border-[#b8c1a4] bg-[#e7eadf] text-[#596146]" : value === "CANCELLED" ? "border-[#ccb7ae] bg-[#eee0db] text-[#775247]" : value === "PARTIAL" ? "border-[#c8b58d] bg-[#eee5ce] text-[#735f34]" : "border-[#cfc2b1] bg-[#f3ece2] text-[#756b61]"; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{copy[value] || value}</span>; }
function operationLabel(value: string | null) { if (value === "ALQUILER") return "Alquiler"; if (value === "COMPRA") return "Venta"; if (value === "ALL") return "Todas"; return "Venta"; }
function formatPercent(value: number) { return `${Number(value || 0).toLocaleString("es-UY", { maximumFractionDigits: 2 })}%`; }
function formatMoney(currency: string, value: number) { return new Intl.NumberFormat("es-UY", { style: "currency", currency: (currency || "USD").toUpperCase(), maximumFractionDigits: 0 }).format(Number(value || 0)); }
