import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartNoAxesCombined, CircleDollarSign, MousePointerClick, ReceiptText, Target } from "lucide-react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { createMarketingSpend, deleteMarketingSpend } from "./actions";

type Touch = { lead_id: string; channel: string | null; provider: string | null; campaign: string | null; ad: string | null; touched_at: string };
type Lead = { id: string; pipeline_stage: string; source_channel: string | null; source_provider: string | null; source_campaign: string | null; source_ad: string | null };
type Spend = { id: string; period_start: string; period_end: string; channel: string | null; provider: string | null; campaign: string | null; ad: string | null; amount: number | string; currency: string; source: string; notes: string | null };
type Commission = { lead_id: string; currency: string; gross_commission: number | string | null; office_commission: number | string | null; collected_amount: number | string | null };
type StageEvent = { lead_id: string; to_stage: string };
type Model = "first" | "last" | "linear";

type Bucket = {
  key: string;
  label: string;
  spend: number;
  leads: number;
  qualified: number;
  visits: number;
  reservations: number;
  won: number;
  gross: number;
  revenue: number;
  collected: number;
};

const STAGE_RANK: Record<string, number> = { NEW: 0, CONTACTED: 1, QUALIFIED: 2, VISIT: 3, NEGOTIATION: 4, RESERVATION: 5, WON: 6, LOST: -1 };

function dimension(touch: Pick<Touch, "campaign" | "provider" | "channel">) {
  return touch.campaign || touch.provider || touch.channel || "Sin atribución";
}
function money(currency: string, value: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
}
function pct(value: number | null) { return value == null ? "—" : `${Math.round(value)}%`; }
function ratio(value: number | null) { return value == null ? "—" : `${value.toFixed(2)}x`; }
function cost(spend: number, count: number) { return count > 0 ? spend / count : null; }
function formatCost(currency: string, value: number | null) { return value == null ? "—" : money(currency, value); }

export default async function MarketingRoiPage({ searchParams }: { searchParams: Promise<{ model?: string; currency?: string }> }) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "analytics")) {
    return <UpgradePlanGate title="Marketing ROI" description="Conectá inversión, origen, visitas, cierres y comisiones para saber qué marketing produce ingresos reales." requiredPlan="Professional" />;
  }
  if (!["OWNER", "MANAGER"].includes(context.role)) redirect("/protected");

  const params = await searchParams;
  const model: Model = params.model === "last" || params.model === "linear" ? params.model : "first";

  const [{ data: leads }, { data: touches }, { data: spend }, { data: commissions }, { data: stageEvents }] = await Promise.all([
    context.supabase.from("leads").select("id,pipeline_stage,source_channel,source_provider,source_campaign,source_ad").eq("organization_id", context.organizationId),
    context.supabase.from("lead_attribution_touches").select("lead_id,channel,provider,campaign,ad,touched_at").eq("organization_id", context.organizationId).order("touched_at", { ascending: true }),
    context.supabase.from("marketing_spend_entries").select("id,period_start,period_end,channel,provider,campaign,ad,amount,currency,source,notes").eq("organization_id", context.organizationId).order("period_start", { ascending: false }),
    context.supabase.from("commissions").select("lead_id,currency,gross_commission,office_commission,collected_amount").eq("organization_id", context.organizationId),
    context.supabase.from("lead_stage_events").select("lead_id,to_stage").eq("organization_id", context.organizationId),
  ]);

  const allLeads = (leads || []) as Lead[];
  const allTouches = (touches || []) as Touch[];
  const allSpend = (spend || []) as Spend[];
  const allCommissions = (commissions || []) as Commission[];
  const events = (stageEvents || []) as StageEvent[];
  const currencies = Array.from(new Set(["USD", ...allSpend.map((row) => row.currency), ...allCommissions.map((row) => row.currency)])).sort();
  const selectedCurrency = currencies.includes(String(params.currency || "").toUpperCase()) ? String(params.currency).toUpperCase() : currencies[0];

  const stagesByLead = new Map<string, Set<string>>();
  for (const event of events) {
    if (!stagesByLead.has(event.lead_id)) stagesByLead.set(event.lead_id, new Set());
    stagesByLead.get(event.lead_id)?.add(event.to_stage);
  }
  for (const lead of allLeads) {
    if (!stagesByLead.has(lead.id)) stagesByLead.set(lead.id, new Set());
    stagesByLead.get(lead.id)?.add(lead.pipeline_stage);
  }

  const touchesByLead = new Map<string, Touch[]>();
  for (const touch of allTouches) {
    const current = touchesByLead.get(touch.lead_id) || [];
    current.push(touch);
    touchesByLead.set(touch.lead_id, current);
  }

  const commissionByLead = new Map<string, { gross: number; revenue: number; collected: number }>();
  for (const commission of allCommissions.filter((row) => row.currency === selectedCurrency)) {
    const current = commissionByLead.get(commission.lead_id) || { gross: 0, revenue: 0, collected: 0 };
    current.gross += Number(commission.gross_commission || 0);
    current.revenue += Number(commission.office_commission || 0);
    current.collected += Number(commission.collected_amount || 0);
    commissionByLead.set(commission.lead_id, current);
  }

  const buckets = new Map<string, Bucket>();
  const ensure = (key: string) => {
    if (!buckets.has(key)) buckets.set(key, { key, label: key, spend: 0, leads: 0, qualified: 0, visits: 0, reservations: 0, won: 0, gross: 0, revenue: 0, collected: 0 });
    return buckets.get(key)!;
  };

  for (const row of allSpend.filter((item) => item.currency === selectedCurrency)) {
    ensure(row.campaign || row.provider || row.channel || "Sin campaña").spend += Number(row.amount || 0);
  }

  for (const lead of allLeads) {
    const leadTouches = touchesByLead.get(lead.id) || [];
    const fallback: Touch = { lead_id: lead.id, channel: lead.source_channel, provider: lead.source_provider, campaign: lead.source_campaign, ad: lead.source_ad, touched_at: "" };
    const sourceTouches = leadTouches.length ? leadTouches : [fallback];
    const selected = model === "first" ? [sourceTouches[0]] : model === "last" ? [sourceTouches[sourceTouches.length - 1]] : sourceTouches;
    const uniqueKeys = Array.from(new Set(selected.map(dimension)));
    const share = uniqueKeys.length ? 1 / uniqueKeys.length : 1;
    const reached = stagesByLead.get(lead.id) || new Set<string>();
    const maxRank = Math.max(...Array.from(reached).map((stage) => STAGE_RANK[stage] ?? 0), 0);
    const commission = commissionByLead.get(lead.id) || { gross: 0, revenue: 0, collected: 0 };

    for (const key of uniqueKeys.length ? uniqueKeys : ["Sin atribución"]) {
      const bucket = ensure(key);
      bucket.leads += share;
      if (maxRank >= STAGE_RANK.QUALIFIED) bucket.qualified += share;
      if (reached.has("VISIT") || maxRank >= STAGE_RANK.VISIT) bucket.visits += share;
      if (reached.has("RESERVATION") || maxRank >= STAGE_RANK.RESERVATION) bucket.reservations += share;
      if (lead.pipeline_stage === "WON" || reached.has("WON")) bucket.won += share;
      bucket.gross += commission.gross * share;
      bucket.revenue += commission.revenue * share;
      bucket.collected += commission.collected * share;
    }
  }

  const rows = Array.from(buckets.values()).sort((a, b) => (b.revenue - b.spend) - (a.revenue - a.spend));
  const totals = rows.reduce<Bucket>((acc, row) => ({
    ...acc,
    spend: acc.spend + row.spend,
    leads: acc.leads + row.leads,
    qualified: acc.qualified + row.qualified,
    visits: acc.visits + row.visits,
    reservations: acc.reservations + row.reservations,
    won: acc.won + row.won,
    gross: acc.gross + row.gross,
    revenue: acc.revenue + row.revenue,
    collected: acc.collected + row.collected,
  }), { key: "total", label: "Total", spend: 0, leads: 0, qualified: 0, visits: 0, reservations: 0, won: 0, gross: 0, revenue: 0, collected: 0 });
  const roi = totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : null;
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : null;

  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Revenue Intelligence</p><h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Marketing ROI</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">De la inversión al cierre: RevScale conecta origen, progreso comercial y comisión que realmente queda en la inmobiliaria. Las monedas se calculan por separado.</p></div><div className="flex flex-wrap gap-2">{currencies.map((currency) => <Link key={currency} href={`/protected/marketing-roi?model=${model}&currency=${currency}`} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${currency === selectedCurrency ? "border-[#7a6344] bg-[#d9ccb9] text-[#302b24]" : "border-[#cdbfa9] bg-[#fffaf2] text-[#6d655b]"}`}>{currency}</Link>)}</div></div>

    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={<ReceiptText size={18}/>} label="Inversión" value={money(selectedCurrency, totals.spend)}/><Metric icon={<CircleDollarSign size={18}/>} label="Ingreso oficina" value={money(selectedCurrency, totals.revenue)}/><Metric icon={<Target size={18}/>} label="ROI" value={pct(roi)}/><Metric icon={<ChartNoAxesCombined size={18}/>} label="Revenue / Spend" value={ratio(roas)}/><Metric icon={<MousePointerClick size={18}/>} label="CAC" value={formatCost(selectedCurrency, cost(totals.spend, totals.won))}/></section>

    <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Modelo de atribución</p><h2 className="mt-2 font-serif text-2xl">Cómo repartir el mérito</h2><p className="mt-2 text-sm text-[#71695f]">First touch muestra qué originó el lead; last touch, el último origen registrado; linear reparte el valor entre todos los touchpoints conocidos.</p></div><div className="flex gap-2">{(["first","last","linear"] as Model[]).map((item) => <Link key={item} href={`/protected/marketing-roi?model=${item}&currency=${selectedCurrency}`} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${model === item ? "border-[#7a6344] bg-[#d9ccb9]" : "border-[#cdbfa9] bg-[#fffaf2]"}`}>{item === "first" ? "First touch" : item === "last" ? "Last touch" : "Linear"}</Link>)}</div></div></section>

    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><Mini label="Leads" value={round(totals.leads)}/><Mini label="Calificados" value={round(totals.qualified)}/><Mini label="Visitas" value={round(totals.visits)}/><Mini label="Reservas" value={round(totals.reservations)}/><Mini label="Cierres" value={round(totals.won)}/><Mini label="Comisión bruta" value={money(selectedCurrency, totals.gross)}/></section>

    <section className="mt-8 overflow-x-auto rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]"><div className="border-b border-[#ded2c1] px-6 py-5"><h2 className="font-serif text-2xl">Rendimiento por campaña / origen</h2><p className="mt-1 text-sm text-[#756e64]">Costo y conversión hasta comisión retenida.</p></div><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[0.12em] text-[#887861]"><tr><th className="px-5 py-3">Origen</th><th>Gasto</th><th>Leads</th><th>CPL</th><th>Visitas</th><th>Reservas</th><th>Cierres</th><th>CAC</th><th>Ingreso oficina</th><th>ROI</th></tr></thead><tbody>{rows.map((row) => { const rowRoi = row.spend > 0 ? ((row.revenue-row.spend)/row.spend)*100 : null; return <tr key={row.key} className="border-t border-[#e1d6c7]"><td className="px-5 py-4 font-semibold text-[#3c3832]">{row.label}</td><td>{money(selectedCurrency,row.spend)}</td><td>{round(row.leads)}</td><td>{formatCost(selectedCurrency,cost(row.spend,row.leads))}</td><td>{round(row.visits)}</td><td>{round(row.reservations)}</td><td>{round(row.won)}</td><td>{formatCost(selectedCurrency,cost(row.spend,row.won))}</td><td>{money(selectedCurrency,row.revenue)}</td><td className="font-semibold">{pct(rowRoi)}</td></tr>; })}{!rows.length && <tr><td colSpan={10} className="px-6 py-12 text-center text-[#81796e]">Todavía no hay inversión ni atribución suficiente.</td></tr>}</tbody></table></section>

    <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><h2 className="font-serif text-2xl">Cargar inversión</h2><p className="mt-2 text-sm text-[#756e64]">Registrá el gasto real del período. Si indicás campaña, RevScale la cruza con la atribución de los leads.</p><form action={createMarketingSpend} className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Desde" name="period_start" type="date" required/><Field label="Hasta" name="period_end" type="date" required/><Field label="Canal" name="channel" placeholder="Paid social"/><Field label="Proveedor" name="provider" placeholder="Meta Ads"/><Field label="Campaña" name="campaign" placeholder="Pocitos agosto"/><Field label="Anuncio" name="ad" placeholder="Video 02"/><Field label="Monto" name="amount" type="number" step="0.01" min="0.01" required/><label className="text-sm font-medium text-[#554f47]">Moneda<select name="currency" defaultValue={selectedCurrency} className="mt-2 w-full rounded-xl border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5">{currencies.map((currency)=><option key={currency}>{currency}</option>)}{!currencies.includes("UYU")&&<option>UYU</option>}</select></label><label className="sm:col-span-2 text-sm font-medium text-[#554f47]">Notas<textarea name="notes" rows={2} className="mt-2 w-full rounded-xl border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5"/></label><button className="sm:col-span-2 rounded-xl bg-[#302d28] px-4 py-3 text-sm font-semibold !text-[#fffaf2]">Guardar inversión</button></form></div><div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><h2 className="font-serif text-2xl">Inversiones registradas</h2><div className="mt-5 space-y-3">{allSpend.slice(0,12).map((row)=><div key={row.id} className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{row.campaign || row.provider || row.channel || "Inversión sin campaña"}</p><p className="mt-1 text-xs text-[#81796e]">{row.period_start} → {row.period_end}</p><p className="mt-2 font-serif text-xl">{money(row.currency,Number(row.amount))}</p></div><form action={deleteMarketingSpend}><input type="hidden" name="id" value={row.id}/><button className="text-xs font-semibold text-[#806c51]">Eliminar</button></form></div></div>)}{!allSpend.length&&<p className="text-sm text-[#81796e]">No hay gasto cargado todavía. El ROI aparecerá cuando exista inversión real para comparar.</p>}</div></div></section>
  </div></main>;
}

function round(value:number){ return String(Math.round(value*10)/10); }
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium">{value}</p></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">{label}</p><p className="mt-2 font-serif text-2xl">{value}</p></div>}
function Field({label,name,...props}:{label:string;name:string}&React.InputHTMLAttributes<HTMLInputElement>){return <label className="text-sm font-medium text-[#554f47]">{label}<input name={name} {...props} className="mt-2 w-full rounded-xl border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5"/></label>}
