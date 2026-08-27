import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Facebook, Globe2, Instagram, MessageCircle, PlugZap, Radio, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { disconnectMercadoLibre, startMercadoLibreConnection } from "./actions";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ portal?: string; result?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!membership?.organization_id || membership.role !== "OWNER") redirect("/protected");

  const [{ data: organization }, { data: connection }, { data: whatsappSettings }, { data: subscription }, { data: portalConnections }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase
      .from("whatsapp_connections")
      .select("status,webhook_status,display_phone_number,verified_name,last_webhook_at")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
    supabase
      .from("whatsapp_ai_settings")
      .select("mode,auto_reply_enabled")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
    supabase.from("subscriptions").select("plan,status").eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("portal_connections").select("provider,status,external_account_id,external_account_name,connected_at,last_sync_at,last_error").eq("organization_id", membership.organization_id),
  ]);

  const whatsappConnected = connection?.status === "CONNECTED";
  const webhookVerified = connection?.webhook_status === "VERIFIED";
  const whatsappLive = whatsappConnected && webhookVerified && whatsappSettings?.mode === "LIVE" && whatsappSettings?.auto_reply_enabled === true;
  const whatsappStatus = whatsappLive ? "LIVE" : whatsappConnected ? "CONECTADO" : "PENDIENTE DE CONEXIÓN";
  const enterprise = String(subscription?.status || "").toUpperCase() === "ACTIVE" && String(subscription?.plan || "").toUpperCase() === "ENTERPRISE";
  const mercadoLibre = (portalConnections || []).find((item) => item.provider === "MERCADOLIBRE");
  const mlConnected = mercadoLibre?.status === "CONNECTED";
  const mlStatus = mlConnected ? "CONECTADO" : mercadoLibre?.status === "ERROR" ? "ERROR" : mercadoLibre?.status === "PENDING" ? "PENDIENTE" : enterprise ? "LISTO PARA CONECTAR" : "ENTERPRISE";
  const resultMessage = params.portal === "mercadolibre" ? portalResultMessage(params.result) : null;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected/settings" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c] transition hover:text-[#403b34]"><ArrowLeft className="h-4 w-4" /> Volver a configuración</Link>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Canales y entradas</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Integraciones</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Conectá canales de consulta y portales inmobiliarios sin exponer credenciales al navegador. Las conexiones LIVE externas están reservadas para Enterprise.</p>
          </div>
          <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Organización</p><p className="mt-1 font-semibold text-[#403b34]">{organization?.name || "Tu inmobiliaria"}</p></div>
        </div>

        {resultMessage && <div className={`mt-6 rounded-xl border p-4 text-sm ${params.result === "connected" ? "border-[#b7c5aa] bg-[#e5eadf] text-[#4d5c46]" : "border-[#d9b7aa] bg-[#f4e4dc] text-[#7b4539]"}`}>{resultMessage}</div>}

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <IntegrationCard icon={<Globe2 className="h-5 w-5" />} title="Sitio web" description="Recibí automáticamente las consultas que llegan desde los formularios de tu página web." status="DISPONIBLE" statusTone="ready">
            <div className="mt-5 space-y-3 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4 text-sm text-[#625d55]"><Feature text="Recibe leads sin carga manual." /><Feature text="Deduplica por ID externo, teléfono y email." /><Feature text="Conserva origen, campaña, UTM y propiedad." /><Feature text="Alimenta SLA, matching y próximas acciones." /></div>
          </IntegrationCard>

          <IntegrationCard icon={<MessageCircle className="h-5 w-5" />} title="WhatsApp Business" description="Centralizá conversaciones de WhatsApp Business, calificá consultas y derivá a una persona cuando haga falta." status={whatsappStatus} statusTone={whatsappLive ? "live" : whatsappConnected ? "ready" : "pending"}>
            <div className="mt-5 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4">
              <p className="text-sm font-semibold text-[#403b34]">{whatsappConnected ? connection?.verified_name || "Cuenta conectada" : "Infraestructura lista"}</p>
              <p className="mt-2 text-sm leading-6 text-[#665f56]">{whatsappConnected ? `${connection?.display_phone_number || "Número vinculado"} · webhook ${webhookVerified ? "verificado" : "pendiente"}.` : "Falta vincular una cuenta y número reales de Meta WhatsApp Business. RevScale no simula una conexión que todavía no existe."}</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2"><Link href="/protected/settings/whatsapp" className="rounded-lg border border-[#cdbfa9] bg-[#eee4d5] px-4 py-2.5 text-center text-sm font-semibold text-[#554f47]">Ver activación</Link><Link href="/protected/inbox" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-center text-sm font-semibold !text-[#fffaf2]">Abrir Inbox</Link></div>
          </IntegrationCard>

          <IntegrationCard icon={<Radio className="h-5 w-5" />} title="Mercado Libre Inmuebles" description="OAuth oficial por inmobiliaria, tokens rotativos cifrados y publicación/sincronización desde RevScale." status={mlStatus} statusTone={mlConnected ? "live" : enterprise ? "pending" : "future"}>
            <div className="mt-5 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4 text-sm text-[#665f56]">
              {mlConnected ? <><p className="font-semibold text-[#403b34]">{mercadoLibre?.external_account_name || `Cuenta ${mercadoLibre?.external_account_id}`}</p><p className="mt-2">Autorización guardada de forma cifrada. {mercadoLibre?.last_sync_at ? `Última sincronización: ${new Date(mercadoLibre.last_sync_at).toLocaleString("es-UY")}.` : "Todavía no se sincronizaron avisos."}</p>{mercadoLibre?.last_error && <p className="mt-2 text-[#8a4e42]">Último error: {mercadoLibre.last_error}</p>}</> : <p>{enterprise ? "RevScale está preparado para iniciar el consentimiento OAuth de la cuenta principal de Mercado Libre de la inmobiliaria." : "La distribución preparada sigue disponible en Professional; la conexión API LIVE requiere Enterprise."}</p>}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {mlConnected ? <><Link href="/protected/distribution/mercadolibre" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-center text-sm font-semibold !text-[#fffaf2]">Administrar avisos</Link><form action={disconnectMercadoLibre}><button className="w-full rounded-lg border border-[#cdbfa9] bg-[#eee4d5] px-4 py-2.5 text-sm font-semibold text-[#554f47]">Desconectar</button></form></> : enterprise ? <form action={startMercadoLibreConnection} className="sm:col-span-2"><button className="w-full rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">Conectar Mercado Libre</button></form> : <Link href="/protected/billing" className="sm:col-span-2 rounded-lg border border-[#cdbfa9] bg-[#eee4d5] px-4 py-2.5 text-center text-sm font-semibold text-[#554f47]">Ver Enterprise</Link>}
            </div>
          </IntegrationCard>

          <IntegrationCard icon={<Radio className="h-5 w-5" />} title="InfoCasas" description="Conector reservado para sincronizar stock y avisos cuando la inmobiliaria disponga del contrato técnico oficial del portal." status="CONVENIO REQUERIDO" statusTone="pending">
            <div className="mt-5 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4 text-sm leading-6 text-[#665f56]">No mostramos una integración ficticia: el adaptador queda contemplado en la arquitectura, pero la activación LIVE se habilitará cuando InfoCasas entregue credenciales y especificación de integración para la cuenta de la inmobiliaria.</div>
          </IntegrationCard>

          <IntegrationCard icon={<Instagram className="h-5 w-5" />} title="Instagram" description="Centralizá consultas que llegan por mensajes de una cuenta profesional de Instagram." status="PRÓXIMAMENTE" statusTone="future"><p className="mt-5 text-sm leading-6 text-[#81796e]">Las consultas podrán sumarse al perfil comercial del lead para evitar revisar distintos canales por separado.</p></IntegrationCard>
          <IntegrationCard icon={<Facebook className="h-5 w-5" />} title="Facebook" description="Centralizá consultas de Messenger y leads provenientes de campañas." status="PRÓXIMAMENTE" statusTone="future"><p className="mt-5 text-sm leading-6 text-[#81796e]">RevScale podrá identificar el origen de cada oportunidad y conservar su actividad dentro del mismo lead.</p></IntegrationCard>
        </section>

        <section className="mt-8 rounded-xl border border-[#cdbfa9] bg-[#eee4d5] p-6"><div className="flex gap-4"><div className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] p-2.5 text-[#705f47]"><PlugZap className="h-5 w-5" /></div><div><h2 className="font-serif text-xl font-medium text-[#37332d]">Conexiones aisladas por inmobiliaria</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#665f56]">RevScale guarda únicamente metadatos operativos en tablas visibles. Los tokens de proveedores se cifran y se leen solo desde funciones backend autorizadas.</p><div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#625d55]"><ShieldCheck className="h-4 w-4" /> Credenciales fuera del navegador y del repositorio</div></div></div></section>
      </div>
    </main>
  );
}

function portalResultMessage(result?: string) {
  const messages: Record<string,string> = { connected: "Mercado Libre quedó conectado correctamente.", authorization_denied: "La autorización fue cancelada en Mercado Libre.", provider_not_configured: "Faltan las credenciales de la aplicación de Mercado Libre en el backend de RevScale.", invalid_callback: "Mercado Libre devolvió una respuesta incompleta.", invalid_state: "La autorización venció o no corresponde a esta sesión. Iniciá la conexión nuevamente.", token_exchange_failed: "Mercado Libre no pudo completar el intercambio de autorización.", account_validation_failed: "No se pudo validar la cuenta principal de Mercado Libre.", connection_save_failed: "No se pudo guardar la conexión.", credential_save_failed: "La cuenta fue autorizada, pero no se pudieron guardar las credenciales cifradas." };
  return messages[result || ""] || null;
}
function Feature({ text }: { text: string }) { return <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6d7557]" /><span>{text}</span></div>; }
function IntegrationCard({ icon, title, description, status, statusTone, children }: { icon: React.ReactNode; title: string; description: string; status: string; statusTone: "live" | "ready" | "pending" | "future"; children: React.ReactNode }) { const tone = statusTone === "live" ? "border-[#aab89b] bg-[#e4e8dc] text-[#536048]" : statusTone === "ready" ? "border-[#c4b795] bg-[#eee4d5] text-[#66583f]" : statusTone === "pending" ? "border-[#cbb99f] bg-[#efe3d3] text-[#755c3f]" : "border-[#d2c5b3] bg-[#f0e8dc] text-[#81796e]"; return <article className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_14px_38px_rgba(72,58,40,0.04)]"><div className="flex items-start justify-between gap-4"><div className="rounded-xl border border-[#d2c5b3] bg-[#eee4d5] p-3 text-[#786448]">{icon}</div><span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${tone}`}>{status}</span></div><h2 className="mt-5 font-serif text-2xl font-medium text-[#37332d]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#665f56]">{description}</p>{children}</article>; }
