import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, ExternalLink, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const CORE_CHECKS = 7;

type SubscriptionRow = { organization_id: string; plan: string; status: string };
type MemberRow = { organization_id: string; role: string; status: string };
type SiteRow = { organization_id: string; is_active: boolean; lead_capture_enabled: boolean };
type SlaRow = { organization_id: string; is_enabled: boolean; auto_reassign_on_breach: boolean };
type WhatsappConnectionRow = { organization_id: string; status: string; webhook_status: string };
type WhatsappSettingsRow = { organization_id: string; mode: string; auto_reply_enabled: boolean };
type PortalConnectionRow = { organization_id: string; provider: string; status: string };
type NurtureRow = { organization_id: string; enabled: boolean };

export default async function PilotReadinessPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: platformAdmin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!platformAdmin) redirect("/protected");

  const { data: requests } = await supabase
    .from("plan_requests")
    .select("id,company,organization_id,status,created_at")
    .not("organization_id", "is", null)
    .order("created_at", { ascending: false });

  const orgIds = Array.from(new Set((requests || []).map((row) => row.organization_id).filter(Boolean))) as string[];
  if (!orgIds.length) return <EmptyState />;

  const [
    subscriptionsResult,
    membersResult,
    propertiesResult,
    leadsResult,
    sitesResult,
    slaResult,
    nurtureResult,
    whatsappConnectionsResult,
    whatsappSettingsResult,
    portalConnectionsResult,
  ] = await Promise.all([
    supabase.from("subscriptions").select("organization_id,plan,status").in("organization_id", orgIds),
    supabase.from("organization_members").select("organization_id,role,status").in("organization_id", orgIds),
    supabase.from("properties").select("organization_id,id").in("organization_id", orgIds),
    supabase.from("leads").select("organization_id,id").in("organization_id", orgIds),
    supabase.from("brokerage_public_sites").select("organization_id,is_active,lead_capture_enabled").in("organization_id", orgIds),
    supabase.from("organization_sla_settings").select("organization_id,is_enabled,auto_reassign_on_breach").in("organization_id", orgIds),
    supabase.from("nurture_sequences").select("organization_id,enabled").in("organization_id", orgIds),
    supabase.from("whatsapp_connections").select("organization_id,status,webhook_status").in("organization_id", orgIds),
    supabase.from("whatsapp_ai_settings").select("organization_id,mode,auto_reply_enabled").in("organization_id", orgIds),
    supabase.from("portal_connections").select("organization_id,provider,status").in("organization_id", orgIds),
  ]);

  const subscriptions = new Map(((subscriptionsResult.data || []) as SubscriptionRow[]).map((row) => [row.organization_id, row]));
  const sites = new Map(((sitesResult.data || []) as SiteRow[]).map((row) => [row.organization_id, row]));
  const sla = new Map(((slaResult.data || []) as SlaRow[]).map((row) => [row.organization_id, row]));
  const waConnections = new Map(((whatsappConnectionsResult.data || []) as WhatsappConnectionRow[]).map((row) => [row.organization_id, row]));
  const waSettings = new Map(((whatsappSettingsResult.data || []) as WhatsappSettingsRow[]).map((row) => [row.organization_id, row]));

  const countByOrg = (rows: Array<{ organization_id: string }>) => rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.organization_id] = (acc[row.organization_id] || 0) + 1;
    return acc;
  }, {});
  const propertyCount = countByOrg((propertiesResult.data || []) as Array<{ organization_id: string }>);
  const leadCount = countByOrg((leadsResult.data || []) as Array<{ organization_id: string }>);

  const membersByOrg = ((membersResult.data || []) as MemberRow[]).reduce<Record<string, MemberRow[]>>((acc, row) => {
    (acc[row.organization_id] ||= []).push(row);
    return acc;
  }, {});
  const nurturesByOrg = ((nurtureResult.data || []) as NurtureRow[]).reduce<Record<string, NurtureRow[]>>((acc, row) => {
    (acc[row.organization_id] ||= []).push(row);
    return acc;
  }, {});
  const portalsByOrg = ((portalConnectionsResult.data || []) as PortalConnectionRow[]).reduce<Record<string, PortalConnectionRow[]>>((acc, row) => {
    (acc[row.organization_id] ||= []).push(row);
    return acc;
  }, {});

  const rows = (requests || []).filter((row) => row.organization_id).map((request) => {
    const orgId = request.organization_id as string;
    const subscription = subscriptions.get(orgId);
    const plan = String(subscription?.plan || "TRIAL").toUpperCase();
    const members = membersByOrg[orgId] || [];
    const activeMembers = members.filter((row) => row.status === "ACTIVE");
    const ownerReady = activeMembers.some((row) => row.role === "OWNER");
    const salesTeamReady = activeMembers.some((row) => row.role === "AGENT" || row.role === "MANAGER");
    const site = sites.get(orgId);
    const slaSettings = sla.get(orgId);
    const waConnection = waConnections.get(orgId);
    const waSetting = waSettings.get(orgId);
    const whatsappLive = waConnection?.status === "CONNECTED" && waConnection.webhook_status === "VERIFIED" && waSetting?.mode === "LIVE" && waSetting.auto_reply_enabled === true;
    const mercadoLibreConnected = (portalsByOrg[orgId] || []).some((row) => row.provider === "MERCADOLIBRE" && row.status === "CONNECTED");
    const checks = [
      { label: "Plan operativo", ok: subscription?.status === "ACTIVE" && ["PROFESSIONAL", "PRO", "ENTERPRISE"].includes(plan), detail: `${plan} · ${subscription?.status || "SIN SUSCRIPCIÓN"}` },
      { label: "Dirección activa", ok: ownerReady, detail: ownerReady ? "Owner activo" : "Falta un owner activo" },
      { label: "Equipo comercial", ok: salesTeamReady, detail: `${activeMembers.filter((row) => row.role === "AGENT" || row.role === "MANAGER").length} usuarios comerciales activos` },
      { label: "Inventario mínimo", ok: (propertyCount[orgId] || 0) >= 5, detail: `${propertyCount[orgId] || 0} propiedades` },
      { label: "Flujo de leads", ok: (leadCount[orgId] || 0) >= 3, detail: `${leadCount[orgId] || 0} leads cargados` },
      { label: "Catálogo + captura", ok: site?.is_active === true && site.lead_capture_enabled === true, detail: site?.is_active ? (site.lead_capture_enabled ? "Activo con captura" : "Activo sin captura") : "Catálogo inactivo" },
      { label: "SLA operativo", ok: slaSettings?.is_enabled === true, detail: slaSettings?.is_enabled ? (slaSettings.auto_reassign_on_breach ? "Activo + auto-reasignación" : "Activo") : "SLA desactivado" },
    ];
    const coreReadyCount = checks.filter((item) => item.ok).length;
    const enabledNurtures = (nurturesByOrg[orgId] || []).filter((row) => row.enabled).length;

    return {
      ...request,
      orgId,
      plan,
      checks,
      coreReadyCount,
      percent: Math.round((coreReadyCount / CORE_CHECKS) * 100),
      coreReady: coreReadyCount === CORE_CHECKS,
      enabledNurtures,
      whatsappLive,
      mercadoLibreConnected,
      enterprise: plan === "ENTERPRISE",
    };
  });

  return <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <Link href="/protected/admin" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a Admin</Link>
    <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Operación interna RevScale</p><h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Pilot readiness</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Control de salida para la primera inmobiliaria real. El score CORE usa únicamente señales internas que RevScale puede verificar; las credenciales de Meta y portales externos se muestran aparte para no fingir que un proveedor está conectado.</p></div><div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] px-5 py-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Organizaciones evaluadas</p><p className="mt-1 font-serif text-3xl">{rows.length}</p></div></div>

    <section className="mt-8 space-y-5">{rows.map((row) => <article key={row.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 shadow-[0_14px_38px_rgba(72,58,40,0.04)] md:p-6">
      <div className="flex flex-col gap-4 border-b border-[#ded2c1] pb-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${row.coreReady ? "border-[#aab89b] bg-[#e4e8dc] text-[#536048]" : "border-[#cbb99f] bg-[#efe3d3] text-[#755c3f]"}`}>{row.coreReady ? "CORE listo" : `${row.percent}% CORE`}</span><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">{row.plan}</span></div><h2 className="mt-3 font-serif text-2xl font-medium">{row.company || "Organización sin nombre"}</h2><p className="mt-2 text-xs text-[#81786d]">Org {row.orgId.slice(0, 8)} · solicitud {row.status}</p></div><div className="min-w-52 rounded-xl border border-[#d8cbb8] bg-[#fffaf2] p-4"><div className="flex items-center justify-between text-xs font-semibold text-[#665f56]"><span>Readiness CORE</span><span>{row.coreReadyCount}/{CORE_CHECKS}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5dac9]"><div className="h-full rounded-full bg-[#71634f]" style={{ width: `${row.percent}%` }}/></div></div></div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{row.checks.map((check) => <div key={check.label} className={`rounded-xl border p-4 ${check.ok ? "border-[#c4ccb8] bg-[#edf0e8]" : "border-[#dcc8b5] bg-[#f4e8dc]"}`}><div className="flex items-center gap-2">{check.ok ? <CheckCircle2 size={16} className="text-[#647156]"/> : <CircleAlert size={16} className="text-[#8c6048]"/>}<p className="text-sm font-semibold">{check.label}</p></div><p className="mt-2 text-xs leading-5 text-[#6f685f]">{check.detail}</p></div>)}</div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3"><ChannelGate title="Nurturing" ready={row.enabledNurtures > 0} detail={row.enabledNurtures > 0 ? `${row.enabledNurtures} secuencia(s) activa(s)` : "Configurar al menos una secuencia antes de probar seguimiento automático."}/><ChannelGate title="WhatsApp LIVE" ready={row.whatsappLive} detail={row.whatsappLive ? "Cuenta, webhook y auto-reply en LIVE." : "Bloqueado hasta vincular WABA/número real y verificar Meta."}/><ChannelGate title="Mercado Libre LIVE" ready={row.mercadoLibreConnected} neutral={!row.enterprise} detail={row.enterprise ? (row.mercadoLibreConnected ? "Cuenta autorizada y lista para sincronizar." : "Enterprise listo a nivel de producto; faltan credenciales/autorización del proveedor.") : "Solo aplica si el piloto se ejecuta en Enterprise."}/></div>

      <div className="mt-5 flex flex-col gap-3 border-t border-[#ded2c1] pt-4 md:flex-row md:items-center md:justify-between"><p className="flex items-center gap-2 text-xs text-[#716a61]"><ShieldCheck size={14}/> {row.coreReady ? "Puede iniciar piloto CORE con tráfico controlado y medir resultados." : "No iniciar tráfico real hasta resolver los checks CORE pendientes."}</p><div className="flex flex-wrap gap-2"><Link href="/protected/admin" className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5f513e]">Gestionar cuenta</Link><a href="https://www.infocasas.com.uy/soyinmobiliaria" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5f513e]">InfoCasas comercial <ExternalLink size={14}/></a></div></div>
    </article>)}</section>
  </div></main>;
}

function ChannelGate({ title, ready, detail, neutral = false }: { title: string; ready: boolean; detail: string; neutral?: boolean }) { const tone = neutral ? "border-[#d2c5b3] bg-[#efe8dc]" : ready ? "border-[#b7c5aa] bg-[#e5eadf]" : "border-[#d9c3ac] bg-[#f2e5d8]"; return <div className={`rounded-xl border p-4 ${tone}`}><div className="flex items-center gap-2">{neutral ? <ShieldCheck size={15} className="text-[#756b5f]"/> : ready ? <CheckCircle2 size={15} className="text-[#607052]"/> : <CircleAlert size={15} className="text-[#8c6048]"/>}<p className="text-sm font-semibold">{title}</p></div><p className="mt-2 text-xs leading-5 text-[#665f56]">{detail}</p></div> }

function EmptyState() { return <main className="min-h-screen bg-[#f3ecdf] p-8 text-[#302d28]"><div className="mx-auto max-w-5xl"><Link href="/protected/admin" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a Admin</Link><div className="mt-8 rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-12 text-center"><h1 className="font-serif text-3xl">Todavía no hay organizaciones para pilotear</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#665f56]">Cuando una solicitud quede vinculada a una organización, este panel calculará automáticamente su readiness real.</p></div></div></main> }
