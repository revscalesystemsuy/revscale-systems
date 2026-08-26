import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, CircleDashed, CirclePause, MessageCircle, Radio, ShieldCheck } from "lucide-react";
import { requireCompanyAdminFeature } from "@/lib/organization-role";
import { activateWhatsAppLive, pauseWhatsAppLive, saveWhatsAppAiPreparation } from "./actions";

export default async function WhatsAppAiSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const context = await requireCompanyAdminFeature("whatsapp_ai");
  if (context.role !== "OWNER") redirect("/protected");
  const params = await searchParams;

  const [{ data: settings }, { data: connection }] = await Promise.all([
    context.supabase
      .from("whatsapp_ai_settings")
      .select("mode,auto_reply_enabled,assistant_name,tone,address_style,emoji_level,response_length,business_hours_only")
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
    context.supabase
      .from("whatsapp_connections")
      .select("status,webhook_status,display_phone_number,verified_name,phone_number_id,waba_id,connected_at,last_webhook_at,last_error")
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
  ]);

  const current = {
    mode: settings?.mode || "PREPARATION",
    autoReply: settings?.auto_reply_enabled ?? false,
    assistantName: settings?.assistant_name || "RevScale",
    tone: settings?.tone || "PROFESSIONAL_FRIENDLY",
    addressStyle: settings?.address_style || "VOS",
    emojiLevel: settings?.emoji_level || "LOW",
    responseLength: settings?.response_length || "SHORT",
    businessHoursOnly: settings?.business_hours_only ?? false,
  };

  const connected = connection?.status === "CONNECTED" && Boolean(connection?.phone_number_id);
  const webhookVerified = connection?.webhook_status === "VERIFIED";
  const canActivate = connected && webhookVerified;
  const isLive = current.mode === "LIVE" && current.autoReply;
  const webhookUrl = "https://pctcbawzeflnyeeiidqi.supabase.co/functions/v1/whatsapp-webhook";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Canal comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">WhatsApp Business + IA</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">La infraestructura de recepción, inbox, calificación y handoff ya está preparada. El canal solo pasa a LIVE cuando existe una cuenta Meta real conectada y el webhook fue verificado.</p>
          </div>
          <ModePill mode={current.mode} live={isLive} />
        </div>

        {params.error && <div className="mt-5 rounded-xl border border-[#bd9a83] bg-[#efddd1] px-4 py-3 text-sm text-[#704b3c]">{params.error}</div>}
        {params.success && <div className="mt-5 rounded-xl border border-[#aab89b] bg-[#e4e8dc] px-4 py-3 text-sm text-[#536048]">{params.success}</div>}

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <StateCard label="Cuenta Meta" value={connected ? "Conectada" : "Pendiente"} done={connected} detail={connection?.display_phone_number || connection?.verified_name || "Sin número vinculado"} />
          <StateCard label="Webhook" value={webhookVerified ? "Verificado" : "Pendiente"} done={webhookVerified} detail={connection?.last_webhook_at ? `Último evento ${formatDate(connection.last_webhook_at)}` : "Sin eventos reales todavía"} />
          <StateCard label="Automatización" value={isLive ? "LIVE" : current.mode === "PAUSED" ? "Pausada" : "Preparación"} done={isLive} detail={isLive ? "Puede responder automáticamente." : "No realiza auto-respuestas."} />
        </section>

        <section className="mt-6 rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex max-w-3xl items-start gap-4">
              <div className="rounded-lg border border-[#cdbfa9] bg-[#eee4d5] p-2.5 text-[#705f47]"><ShieldCheck size={20} /></div>
              <div><h2 className="font-serif text-xl font-medium text-[#37332d]">Activación segura, sin credenciales en pantalla</h2><p className="mt-2 text-sm leading-6 text-[#665f56]">Los tokens de Meta y del proveedor de IA viven únicamente como secretos del backend. Esta pantalla nunca los muestra ni los guarda en la base. Si no hay conexión real, el envío permanece bloqueado.</p></div>
            </div>
            <Link href="/protected/inbox" className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#554f47]">Abrir Inbox</Link>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form action={saveWhatsAppAiPreparation} className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <div className="flex items-center gap-3"><MessageCircle size={20} className="text-[#786448]" /><div><h2 className="font-serif text-xl font-medium text-[#37332d]">Personalidad y reglas</h2><p className="mt-1 text-sm text-[#6b6359]">Podés editar esto incluso con el canal LIVE sin apagarlo.</p></div></div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Nombre del asistente" className="md:col-span-2"><input name="assistant_name" defaultValue={current.assistantName} maxLength={80} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm" /></Field>
              <Field label="Tono"><select name="tone" defaultValue={current.tone} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm"><option value="PROFESSIONAL_FRIENDLY">Profesional y cercano</option><option value="FORMAL">Formal</option><option value="CLOSE">Cercano y comercial</option></select></Field>
              <Field label="Cómo dirigirse al cliente"><select name="address_style" defaultValue={current.addressStyle} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm"><option value="VOS">Vos</option><option value="TU">Tú</option><option value="USTED">Usted</option></select></Field>
              <Field label="Uso de emojis"><select name="emoji_level" defaultValue={current.emojiLevel} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm"><option value="NONE">Sin emojis</option><option value="LOW">Muy pocos</option><option value="MEDIUM">Moderado</option></select></Field>
              <Field label="Extensión"><select name="response_length" defaultValue={current.responseLength} className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm"><option value="SHORT">Breve</option><option value="MEDIUM">Media</option></select></Field>
            </div>
            <div className="mt-6 space-y-3 border-t border-[#ddd1c0] pt-5">
              <div className="flex items-start gap-3 rounded-xl border border-[#cdbfa9] bg-[#eee4d5] p-4 text-sm text-[#554f47]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#705f47]" /><span><strong className="font-semibold text-[#37332d]">Handoff de seguridad obligatorio.</strong> Negociación, asuntos legales, reclamos, pedido de hablar con una persona o baja confianza siempre detienen la IA. Esta protección no puede desactivarse.</span></div>
              <label className="flex items-start gap-3 text-sm text-[#554f47]"><input type="checkbox" name="business_hours_only" defaultChecked={current.businessHoursOnly} className="mt-1" /><span><strong className="font-semibold text-[#37332d]">Solo horario comercial.</strong> Si se activa, la IA responde de lunes a viernes de 09:00 a 18:00, hora de Uruguay.</span></label>
            </div>
            <button className="mt-6 rounded-lg bg-[#302d28] px-5 py-2.5 text-sm font-semibold !text-[#fffaf2]">Guardar configuración</button>
          </form>

          <div className="space-y-6">
            <section className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
              <h2 className="font-serif text-xl font-medium text-[#37332d]">Checklist LIVE</h2>
              <div className="mt-5 space-y-4">
                <Status done label="Base de conversaciones" detail="Inbox, mensajes, estados y RLS listos." />
                <Status done label="Procesamiento del webhook" detail="Idempotencia, creación de leads y handoff listos." />
                <Status done label="Envío humano" detail="Función autenticada y conectada al SLA." />
                <Status done label="Handoff de seguridad" detail="Obligatorio y no desactivable." />
                <Status done={Boolean(settings)} label="Reglas de IA" detail={settings ? "Configuradas." : "Guardá la personalidad del asistente."} />
                <Status done={connected} label="Cuenta Meta WhatsApp" detail={connected ? "Número vinculado." : "Falta vincular el número real del cliente."} />
                <Status done={webhookVerified} label="Webhook Meta" detail={webhookVerified ? "Meta ya entregó un evento válido." : "Falta verificarlo con Meta."} />
              </div>
            </section>

            <section className="rounded-xl border border-[#d2c5b3] bg-[#eee4d5] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#806d50]">Endpoint del webhook</p>
              <code className="mt-3 block break-all rounded-lg border border-[#cdbfa9] bg-[#fffaf2] p-3 text-xs text-[#554f47]">{webhookUrl}</code>
              <p className="mt-3 text-xs leading-5 text-[#716a60]">Meta usa este callback. El Verify Token y App Secret no se muestran aquí.</p>
              {isLive ? (
                <form action={pauseWhatsAppLive}><button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#bd9a83] bg-[#efddd1] px-4 py-2.5 text-sm font-semibold text-[#704b3c]"><CirclePause size={15} /> Pausar automatización</button></form>
              ) : (
                <form action={activateWhatsAppLive}><button disabled={!canActivate} className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${canActivate ? "bg-[#302d28] !text-[#fffaf2]" : "cursor-not-allowed border border-[#c9bca9] bg-[#ded2c1] text-[#766e63]"}`}><Radio size={15} /> Activar WhatsApp LIVE</button></form>
              )}
              {!canActivate && <p className="mt-3 text-xs leading-5 text-[#7a6d5c]">El botón se habilita únicamente después de conectar el número real y verificar el webhook.</p>}
            </section>
            {connection?.last_error && <section className="rounded-xl border border-[#bd9a83] bg-[#efddd1] p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#704b3c]">Último error operativo</p><p className="mt-2 text-sm text-[#805f52]">{connection.last_error}</p></section>}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`text-sm font-medium text-[#4f4941] ${className}`}>{label}{children}</label>; }
function Status({ done, label, detail }: { done: boolean; label: string; detail: string }) { return <div className="flex items-start gap-3">{done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#6d7557]" /> : <CircleDashed size={18} className="mt-0.5 shrink-0 text-[#9a8c78]" />}<div><p className="text-sm font-semibold text-[#403b34]">{label}</p><p className="mt-0.5 text-xs leading-5 text-[#756e64]">{detail}</p></div></div>; }
function StateCard({ label, value, detail, done }: { label: string; value: string; detail: string; done: boolean }) { return <div className={`rounded-xl border p-5 ${done ? "border-[#b8c0aa] bg-[#e6e9df]" : "border-[#d2c5b3] bg-[#f7f0e6]"}`}><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{label}</p><p className="mt-2 font-serif text-2xl text-[#302d28]">{value}</p><p className="mt-2 text-xs text-[#81796e]">{detail}</p></div>; }
function ModePill({ mode, live }: { mode: string; live: boolean }) { return <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${live ? "border-[#aab89b] bg-[#e4e8dc] text-[#536048]" : mode === "PAUSED" ? "border-[#c4ad86] bg-[#eee1cb] text-[#6e5b39]" : "border-[#cdbfa9] bg-[#f7f0e6] text-[#655842]"}`}>{live ? <Radio size={14} /> : mode === "PAUSED" ? <CirclePause size={14} /> : <CircleDashed size={14} />}{live ? "LIVE" : mode === "PAUSED" ? "Pausado" : "Preparación"}</span>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value)); }
