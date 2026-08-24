import { redirect } from "next/navigation";
import { CheckCircle2, CircleDashed, MessageCircle, ShieldCheck } from "lucide-react";
import { requireCompanyAdminFeature } from "@/lib/organization-role";
import { saveWhatsAppAiPreparation } from "./actions";

export default async function WhatsAppAiSettingsPage() {
  const context = await requireCompanyAdminFeature("whatsapp_ai");
  if (context.role !== "OWNER") redirect("/protected");

  const [{ data: settings }, { data: connection }] = await Promise.all([
    context.supabase
      .from("whatsapp_ai_settings")
      .select("mode,auto_reply_enabled,assistant_name,tone,address_style,emoji_level,response_length,human_handoff_enabled,business_hours_only")
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
    context.supabase
      .from("whatsapp_connections")
      .select("status,webhook_status,display_phone_number,verified_name,connected_at")
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
    humanHandoff: settings?.human_handoff_enabled ?? true,
    businessHoursOnly: settings?.business_hours_only ?? false,
  };

  const connected = connection?.status === "CONNECTED";
  const webhookVerified = connection?.webhook_status === "VERIFIED";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Canal comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">WhatsApp IA</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">
              Prepará cómo responderá RevScale cuando conectes el WhatsApp Business de la inmobiliaria. Hoy permanece desconectado y no envía mensajes ni consume servicios externos.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-2 text-xs font-semibold text-[#655842]">
            <CircleDashed size={14} /> Modo preparación
          </span>
        </div>

        <section className="mt-8 rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.05)]">
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-[#cdbfa9] bg-[#eee4d5] p-2.5 text-[#705f47]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-[#37332d]">Sin costos externos hasta que lo actives</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#665f56]">
                Guardar esta configuración no conecta Meta, no habilita respuestas automáticas y no llama a ningún modelo de IA. La activación real quedará bloqueada hasta incorporar las credenciales del primer cliente.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <form action={saveWhatsAppAiPreparation} className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <div className="flex items-center gap-3">
              <MessageCircle size={20} className="text-[#786448]" />
              <div>
                <h2 className="font-serif text-xl font-medium text-[#37332d]">Personalidad de respuesta</h2>
                <p className="mt-1 text-sm text-[#6b6359]">Define el estilo que usará la automatización cuando pase a producción.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Nombre del asistente" className="md:col-span-2">
                <input name="assistant_name" defaultValue={current.assistantName} maxLength={80} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm" />
              </Field>

              <Field label="Tono">
                <select name="tone" defaultValue={current.tone} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm">
                  <option value="PROFESSIONAL_FRIENDLY">Profesional y cercano</option>
                  <option value="FORMAL">Formal</option>
                  <option value="CLOSE">Cercano y comercial</option>
                </select>
              </Field>

              <Field label="Cómo dirigirse al cliente">
                <select name="address_style" defaultValue={current.addressStyle} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm">
                  <option value="VOS">Vos</option>
                  <option value="TU">Tú</option>
                  <option value="USTED">Usted</option>
                </select>
              </Field>

              <Field label="Uso de emojis">
                <select name="emoji_level" defaultValue={current.emojiLevel} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm">
                  <option value="NONE">Sin emojis</option>
                  <option value="LOW">Muy pocos</option>
                  <option value="MEDIUM">Moderado</option>
                </select>
              </Field>

              <Field label="Extensión de respuesta">
                <select name="response_length" defaultValue={current.responseLength} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm">
                  <option value="SHORT">Breve</option>
                  <option value="MEDIUM">Media</option>
                </select>
              </Field>
            </div>

            <div className="mt-6 space-y-3 border-t border-[#ddd1c0] pt-5">
              <label className="flex items-start gap-3 text-sm text-[#554f47]">
                <input type="checkbox" name="human_handoff_enabled" defaultChecked={current.humanHandoff} className="mt-1" />
                <span><strong className="font-semibold text-[#37332d]">Derivación humana automática.</strong> Si la consulta requiere negociación, asesor, reclamo o baja confianza, RevScale dejará de responder y avisará al equipo.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-[#554f47]">
                <input type="checkbox" name="business_hours_only" defaultChecked={current.businessHoursOnly} className="mt-1" />
                <span><strong className="font-semibold text-[#37332d]">Restringir a horario comercial.</strong> Queda configurado desde ahora y se aplicará al activar la automatización.</span>
              </label>
            </div>

            <button type="submit" className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#302d28] px-5 py-2.5 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">
              Guardar preparación
            </button>
          </form>

          <div className="space-y-6">
            <section className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
              <h2 className="font-serif text-xl font-medium text-[#37332d]">Estado de activación</h2>
              <div className="mt-5 space-y-4">
                <Status done label="Base de conversaciones y mensajes" detail="Lista y aislada por inmobiliaria." />
                <Status done={Boolean(settings)} label="Personalidad comercial" detail={settings ? "Configurada." : "Pendiente de guardar."} />
                <Status done={connected} label="Cuenta WhatsApp Business" detail={connected ? connection?.display_phone_number || "Conectada" : "Se conectará con el primer cliente."} />
                <Status done={webhookVerified} label="Webhook de Meta" detail={webhookVerified ? "Verificado." : "Pendiente de credenciales Meta."} />
                <Status done={false} label="Proveedor de IA" detail="Desactivado para evitar consumo." />
                <Status done={current.mode === "LIVE" && current.autoReply} label="Respuestas automáticas" detail="Bloqueadas hasta activación comercial." />
              </div>
            </section>

            <section className="rounded-xl border border-[#d2c5b3] bg-[#eee4d5] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#806d50]">Cuando llegue el primer cliente</p>
              <p className="mt-3 text-sm leading-6 text-[#554f47]">
                Conectaremos su número, verificaremos el webhook, habilitaremos el proveedor de IA, haremos pruebas de preguntas reales y recién entonces cambiaremos este canal a LIVE.
              </p>
              <button disabled className="mt-5 w-full cursor-not-allowed rounded-lg border border-[#c9bca9] bg-[#ded2c1] px-4 py-2.5 text-sm font-semibold text-[#766e63] opacity-80">
                Conectar al activar primer cliente
              </button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium text-[#4f4941] ${className}`}>{label}{children}</label>;
}

function Status({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      {done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#6d7557]" /> : <CircleDashed size={18} className="mt-0.5 shrink-0 text-[#9a8c78]" />}
      <div>
        <p className="text-sm font-semibold text-[#403b34]">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#756e64]">{detail}</p>
      </div>
    </div>
  );
}
