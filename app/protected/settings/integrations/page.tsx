import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Facebook, Globe2, Instagram, MessageCircle, PlugZap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function IntegrationsPage() {
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

  const [{ data: organization }, { data: connection }, { data: whatsappSettings }] = await Promise.all([
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
  ]);

  const whatsappConnected = connection?.status === "CONNECTED";
  const webhookVerified = connection?.webhook_status === "VERIFIED";
  const whatsappLive = whatsappConnected && webhookVerified && whatsappSettings?.mode === "LIVE" && whatsappSettings?.auto_reply_enabled === true;
  const whatsappStatus = whatsappLive ? "LIVE" : whatsappConnected ? "CONECTADO" : "PENDIENTE DE CONEXIÓN";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected/settings" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c] transition hover:text-[#403b34]"><ArrowLeft className="h-4 w-4" /> Volver a configuración</Link>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Canales y entradas</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Integraciones</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Conectá los canales donde recibe consultas tu inmobiliaria para que los leads entren automáticamente a RevScale y el equipo pueda trabajarlos desde un solo lugar.</p>
          </div>
          <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#81796e]">Organización</p><p className="mt-1 font-semibold text-[#403b34]">{organization?.name || "Tu inmobiliaria"}</p></div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <IntegrationCard icon={<Globe2 className="h-5 w-5" />} title="Sitio web" description="Recibí automáticamente las consultas que llegan desde los formularios de tu página web." status="DISPONIBLE" statusTone="ready">
            <div className="mt-5 space-y-3 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4 text-sm text-[#625d55]"><Feature text="Recibe leads sin carga manual." /><Feature text="Deduplica por ID externo, teléfono y email." /><Feature text="Conserva origen, campaña, UTM y propiedad." /><Feature text="Alimenta SLA, matching y próximas acciones." /></div>
          </IntegrationCard>

          <IntegrationCard icon={<MessageCircle className="h-5 w-5" />} title="WhatsApp Business" description="Centralizá conversaciones de WhatsApp Business, calificá consultas y derivá a una persona cuando haga falta." status={whatsappStatus} statusTone={whatsappLive ? "live" : whatsappConnected ? "ready" : "pending"}>
            <div className="mt-5 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4">
              <p className="text-sm font-semibold text-[#403b34]">{whatsappConnected ? connection?.verified_name || "Cuenta conectada" : "Infraestructura lista"}</p>
              <p className="mt-2 text-sm leading-6 text-[#665f56]">{whatsappConnected ? `${connection?.display_phone_number || "Número vinculado"} · webhook ${webhookVerified ? "verificado" : "pendiente"}.` : "Falta vincular una cuenta y número reales de Meta WhatsApp Business. RevScale no simula una conexión que todavía no existe."}</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link href="/protected/settings/whatsapp" className="rounded-lg border border-[#cdbfa9] bg-[#eee4d5] px-4 py-2.5 text-center text-sm font-semibold text-[#554f47]">Ver activación</Link>
              <Link href="/protected/inbox" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-center text-sm font-semibold !text-[#fffaf2]">Abrir Inbox</Link>
            </div>
          </IntegrationCard>

          <IntegrationCard icon={<Instagram className="h-5 w-5" />} title="Instagram" description="Centralizá consultas que llegan por mensajes de una cuenta profesional de Instagram." status="PRÓXIMAMENTE" statusTone="future"><p className="mt-5 text-sm leading-6 text-[#81796e]">Las consultas podrán sumarse al perfil comercial del lead para evitar revisar distintos canales por separado.</p></IntegrationCard>
          <IntegrationCard icon={<Facebook className="h-5 w-5" />} title="Facebook" description="Centralizá consultas de Messenger y leads provenientes de campañas." status="PRÓXIMAMENTE" statusTone="future"><p className="mt-5 text-sm leading-6 text-[#81796e]">RevScale podrá identificar el origen de cada oportunidad y conservar su actividad dentro del mismo lead.</p></IntegrationCard>
        </section>

        <section className="mt-8 rounded-xl border border-[#cdbfa9] bg-[#eee4d5] p-6">
          <div className="flex gap-4"><div className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] p-2.5 text-[#705f47]"><PlugZap className="h-5 w-5" /></div><div><h2 className="font-serif text-xl font-medium text-[#37332d]">Todo llega a un mismo lugar</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#665f56]">RevScale organiza cada oportunidad para priorización, seguimiento, SLA y matching. Los secretos de los proveedores permanecen en backend y nunca se muestran al equipo comercial.</p><div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#625d55]"><ShieldCheck className="h-4 w-4" /> Integraciones con aislamiento por organización y equipo</div></div></div>
        </section>
      </div>
    </main>
  );
}

function Feature({ text }: { text: string }) { return <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6d7557]" /><span>{text}</span></div>; }

function IntegrationCard({ icon, title, description, status, statusTone, children }: { icon: React.ReactNode; title: string; description: string; status: string; statusTone: "live" | "ready" | "pending" | "future"; children: React.ReactNode }) {
  const tone = statusTone === "live" ? "border-[#aab89b] bg-[#e4e8dc] text-[#536048]" : statusTone === "ready" ? "border-[#c4b795] bg-[#eee4d5] text-[#66583f]" : statusTone === "pending" ? "border-[#cbb99f] bg-[#efe3d3] text-[#755c3f]" : "border-[#d2c5b3] bg-[#f0e8dc] text-[#81796e]";
  return <article className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_14px_38px_rgba(72,58,40,0.04)]"><div className="flex items-start justify-between gap-4"><div className="rounded-xl border border-[#d2c5b3] bg-[#eee4d5] p-3 text-[#786448]">{icon}</div><span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${tone}`}>{status}</span></div><h2 className="mt-5 font-serif text-2xl font-medium text-[#37332d]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#665f56]">{description}</p>{children}</article>;
}
