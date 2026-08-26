import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, CheckCheck, CirclePause, Clock3, MessageCircle, Send, ShieldAlert, UserRound } from "lucide-react";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { markWhatsAppConversationRead, pauseWhatsAppAutomation, resumeWhatsAppAutomation, sendWhatsAppMessage } from "./actions";

type InboxParams = { conversation?: string; status?: string; q?: string; error?: string };

export default async function WhatsAppInboxPage({ searchParams }: { searchParams: Promise<InboxParams> }) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.subscriptionStatus !== "ACTIVE") redirect("/protected");
  if (!planHasFeature(context.plan, "whatsapp_ai")) redirect("/protected/billing");

  const params = await searchParams;
  const statusFilter = String(params.status || "ALL").toUpperCase();
  const q = String(params.q || "").trim().toLowerCase();

  const [{ data: conversationsData }, { data: settings }, connectionResult] = await Promise.all([
    context.supabase
      .from("whatsapp_conversations")
      .select("id,lead_id,connection_id,wa_contact_id,status,automation_paused,handoff_reason,handoff_requested_at,handoff_resolved_at,handoff_requested_by,priority,next_action,context_property_id,last_message_at,last_inbound_at,last_outbound_at,unread_count")
      .order("last_message_at", { ascending: false })
      .limit(150),
    context.supabase
      .from("whatsapp_ai_settings")
      .select("mode,auto_reply_enabled,assistant_name,business_hours_only")
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
    context.role === "OWNER"
      ? context.supabase
          .from("whatsapp_connections")
          .select("id,status,webhook_status,display_phone_number,verified_name,last_webhook_at,last_error")
          .eq("organization_id", context.organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const conversations = conversationsData || [];
  const leadIds = [...new Set(conversations.map((item) => item.lead_id).filter(Boolean))];
  const propertyIds = [...new Set(conversations.map((item) => item.context_property_id).filter(Boolean))] as string[];

  const [{ data: leadsData }, { data: propertiesData }] = await Promise.all([
    leadIds.length
      ? context.supabase
          .from("leads")
          .select("id,full_name,phone,operation,property_type,primary_zone,budget_max,currency,bedrooms_min,lead_score,lead_temperature,next_action,requires_human,assigned_to,first_human_response_at,sla_deadline")
          .in("id", leadIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? context.supabase.from("properties").select("id,title,zone,price,currency").in("id", propertyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const leads = new Map((leadsData || []).map((lead) => [lead.id, lead]));
  const properties = new Map((propertiesData || []).map((property) => [property.id, property]));
  const assigneeIds = [...new Set((leadsData || []).map((lead) => lead.assigned_to).filter(Boolean))] as string[];
  const { data: profilesData } = assigneeIds.length
    ? await context.supabase.from("profiles").select("id,full_name").in("id", assigneeIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const profiles = new Map((profilesData || []).map((profile) => [profile.id, profile.full_name || "Agente"]));

  const rows = conversations
    .map((conversation) => ({ conversation, lead: leads.get(conversation.lead_id) }))
    .filter((row) => row.lead)
    .filter((row) => statusFilter === "ALL" || row.conversation.status === statusFilter || (statusFilter === "AI" && row.conversation.status === "OPEN" && !row.conversation.automation_paused) || (statusFilter === "HUMAN" && row.conversation.automation_paused))
    .filter((row) => !q || [row.lead?.full_name, row.lead?.phone, row.lead?.primary_zone, row.conversation.next_action].some((value) => String(value || "").toLowerCase().includes(q)));

  const selectedId = params.conversation && rows.some((row) => row.conversation.id === params.conversation)
    ? params.conversation
    : rows[0]?.conversation.id || null;
  const selected = selectedId ? rows.find((row) => row.conversation.id === selectedId) || null : null;

  const { data: messagesData } = selectedId
    ? await context.supabase
        .from("whatsapp_messages")
        .select("id,direction,sender_type,sender_user_id,body,message_type,status,detected_intent,confidence,requires_human,provider_timestamp,sent_at,delivered_at,read_at,failed_at,error_message,created_at")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true })
        .limit(300)
    : { data: [] };

  const needsHuman = conversations.filter((item) => item.status === "HUMAN_REQUIRED").length;
  const unread = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
  const aiActive = conversations.filter((item) => item.status === "OPEN" && !item.automation_paused).length;
  const connection = connectionResult.data;
  const liveReady = connection?.status === "CONNECTED" && connection?.webhook_status === "VERIFIED" && settings?.mode === "LIVE";

  return (
    <main className="min-h-screen p-5 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">WhatsApp Business</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Inbox comercial</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Conversaciones, calificación automática y handoff humano en un mismo lugar. La IA se detiene cuando una conversación requiere intervención.</p>
          </div>
          {context.role === "OWNER" && (
            <Link href="/protected/settings/whatsapp" className="rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-2.5 text-sm font-semibold text-[#554f47]">Configurar WhatsApp</Link>
          )}
        </div>

        {context.role === "OWNER" && (
          <section className={`mt-6 rounded-xl border p-4 ${liveReady ? "border-[#aab89b] bg-[#e4e8dc]" : "border-[#cbb99f] bg-[#efe3d3]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#cdbfa9] bg-[#fffaf2] text-[#725d40]"><MessageCircle size={17} /></span>
                <div>
                  <p className="font-medium text-[#37332d]">{liveReady ? "Canal LIVE" : "Conexión pendiente"}</p>
                  <p className="mt-1 text-xs text-[#746d64]">{connection ? `${connection.verified_name || "WhatsApp Business"}${connection.display_phone_number ? ` · ${connection.display_phone_number}` : ""}` : "Todavía no hay una cuenta de Meta WhatsApp conectada a esta organización."}</p>
                </div>
              </div>
              <span className="rounded-full border border-[#c6b69f] bg-[#fffaf2] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#705d43]">{connection?.status || "DISCONNECTED"} · {connection?.webhook_status || "NOT_CONFIGURED"}</span>
            </div>
            {connection?.last_error && <p className="mt-3 text-xs text-[#805a4a]">Último error operativo: {connection.last_error}</p>}
          </section>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric title="Sin leer" value={unread} />
          <Metric title="Espera humana" value={needsHuman} />
          <Metric title="IA atendiendo" value={aiActive} />
        </section>

        <form className="mt-6 flex flex-wrap gap-3 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4">
          <input name="q" defaultValue={params.q || ""} placeholder="Buscar nombre, teléfono, zona..." className="min-w-[220px] flex-1 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#403b34] outline-none" />
          <select name="status" defaultValue={statusFilter} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#4f4941]">
            <option value="ALL">Todas</option><option value="HUMAN_REQUIRED">Espera humana</option><option value="AI">IA atendiendo</option><option value="HUMAN">IA pausada</option><option value="CLOSED">Cerradas</option>
          </select>
          <button className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]">Filtrar</button>
        </form>

        {params.error && <div className="mt-4 rounded-xl border border-[#bd9a83] bg-[#efddd1] px-4 py-3 text-sm text-[#704b3c]">{params.error}</div>}

        <section className="mt-6 grid min-h-[650px] overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] lg:grid-cols-[390px_minmax(0,1fr)]">
          <div className="border-b border-[#d2c5b3] lg:border-b-0 lg:border-r">
            <div className="border-b border-[#ded3c4] px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#81796e]">Conversaciones visibles · {rows.length}</p></div>
            <div className="max-h-[700px] overflow-y-auto">
              {rows.map(({ conversation, lead }) => {
                const active = conversation.id === selectedId;
                return (
                  <Link key={conversation.id} href={`/protected/inbox?conversation=${conversation.id}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`} className={`block border-b border-[#e1d7ca] p-4 transition ${active ? "bg-[#eadfce]" : "bg-[#fffaf2] hover:bg-[#f2e8db]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate font-semibold text-[#39352f]">{lead?.full_name || "Lead de WhatsApp"}</p><p className="mt-1 text-xs text-[#81796e]">{lead?.primary_zone || "Zona por calificar"} · {lead?.lead_temperature || "COLD"}</p></div>
                      {Number(conversation.unread_count || 0) > 0 && <span className="min-w-6 rounded-full bg-[#725d40] px-2 py-1 text-center text-[10px] font-bold text-[#fffaf2]">{conversation.unread_count}</span>}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2"><ConversationState conversation={conversation} /><span className="text-[10px] text-[#948978]">{shortDate(conversation.last_message_at)}</span></div>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#716a60]">{conversation.next_action || lead?.next_action || "Revisar conversación"}</p>
                  </Link>
                );
              })}
              {!rows.length && <div className="p-7 text-sm leading-6 text-[#81796e]">No hay conversaciones de WhatsApp en este alcance. Cuando Meta entregue el primer mensaje de una cuenta conectada, aparecerá acá automáticamente.</div>}
            </div>
          </div>

          <div className="min-w-0 bg-[#eee5d7]">
            {selected ? (
              <>
                <header className="border-b border-[#d2c5b3] bg-[#f7f0e6] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-2xl font-medium text-[#302d28]">{selected.lead?.full_name}</h2><ConversationState conversation={selected.conversation} /></div>
                      <p className="mt-2 text-sm text-[#746d64]">{selected.lead?.phone || selected.conversation.wa_contact_id} · {selected.lead?.operation || "Operación por calificar"} · {selected.lead?.primary_zone || "Zona por calificar"}</p>
                      <p className="mt-1 text-xs text-[#81796e]">Responsable: {selected.lead?.assigned_to ? profiles.get(selected.lead.assigned_to) || "Asignado" : "Sin asignar"} · Score {selected.lead?.lead_score ?? 0}/100</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/protected/leads/${selected.lead?.id}`} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#554f47]">Abrir lead</Link>
                      {Number(selected.conversation.unread_count || 0) > 0 && <form action={markWhatsAppConversationRead}><input type="hidden" name="conversation_id" value={selected.conversation.id} /><button className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#554f47]">Marcar leído</button></form>}
                    </div>
                  </div>
                  {selected.conversation.status === "HUMAN_REQUIRED" && <div className="mt-4 rounded-xl border border-[#bd9a83] bg-[#efddd1] p-4"><p className="flex items-center gap-2 text-sm font-semibold text-[#704b3c]"><ShieldAlert size={16} /> Requiere atención humana</p><p className="mt-2 text-xs leading-5 text-[#805f52]">{selected.conversation.handoff_reason || "La IA detuvo la conversación por seguridad comercial."}</p></div>}
                  {selected.conversation.context_property_id && properties.get(selected.conversation.context_property_id) && <div className="mt-4 rounded-xl border border-[#d6cbbb] bg-[#fffaf2] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">Propiedad en contexto</p><p className="mt-2 font-medium text-[#403b34]">{properties.get(selected.conversation.context_property_id)?.title}</p><p className="mt-1 text-xs text-[#81796e]">{properties.get(selected.conversation.context_property_id)?.zone}</p></div>}
                </header>

                <div className="max-h-[520px] min-h-[390px] space-y-3 overflow-y-auto p-5 md:p-6">
                  {(messagesData || []).map((message) => <MessageBubble key={message.id} message={message} />)}
                  {!messagesData?.length && <p className="py-16 text-center text-sm text-[#81796e]">Todavía no hay mensajes guardados en esta conversación.</p>}
                </div>

                <footer className="border-t border-[#d2c5b3] bg-[#f7f0e6] p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#746d64]">
                    <span>{selected.conversation.automation_paused ? "IA pausada · el humano conserva el control" : "IA habilitada para continuar si la organización está LIVE"}</span>
                    <div className="flex gap-2">
                      {selected.conversation.automation_paused ? <form action={resumeWhatsAppAutomation}><input type="hidden" name="conversation_id" value={selected.conversation.id} /><button className="rounded-lg border border-[#aab89b] bg-[#e5e9dd] px-3 py-2 font-semibold text-[#536048]">Reactivar IA</button></form> : <form action={pauseWhatsAppAutomation}><input type="hidden" name="conversation_id" value={selected.conversation.id} /><button className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 font-semibold text-[#625d55]">Pausar IA</button></form>}
                    </div>
                  </div>
                  <form action={sendWhatsAppMessage} className="flex gap-3">
                    <input type="hidden" name="conversation_id" value={selected.conversation.id} />
                    <textarea name="body" rows={2} maxLength={3500} placeholder="Escribí una respuesta humana..." className="min-h-[54px] flex-1 resize-none rounded-xl border border-[#cdbfa9] bg-[#fffaf2] px-4 py-3 text-sm text-[#403b34] outline-none" />
                    <button className="inline-flex items-center gap-2 self-stretch rounded-xl bg-[#302d28] px-5 text-sm font-semibold !text-[#fffaf2]"><Send size={15} /> Enviar</button>
                  </form>
                  {!connection && context.role === "OWNER" && <p className="mt-3 text-xs text-[#8b6f55]">El envío permanecerá bloqueado hasta conectar una cuenta real de Meta WhatsApp Business.</p>}
                </footer>
              </>
            ) : (
              <div className="flex min-h-[650px] items-center justify-center p-8 text-center"><div className="max-w-md"><MessageCircle className="mx-auto h-9 w-9 text-[#99856a]" /><h2 className="mt-4 font-serif text-2xl text-[#37332d]">Inbox listo para recibir</h2><p className="mt-3 text-sm leading-6 text-[#81796e]">La infraestructura ya está preparada. La primera conversación real aparecerá cuando Dirección conecte una cuenta de WhatsApp Business y Meta entregue mensajes al webhook.</p>{context.role === "OWNER" && <Link href="/protected/settings/whatsapp" className="mt-5 inline-block rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#554f47]">Ver activación</Link>}</div></div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#80786e]">{title}</p><p className="mt-3 font-serif text-[2rem] leading-none text-[#2f2c27]">{value}</p></div>;
}

function ConversationState({ conversation }: { conversation: { status: string; automation_paused: boolean } }) {
  if (conversation.status === "HUMAN_REQUIRED") return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bd9a83] bg-[#efddd1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#704b3c]"><ShieldAlert size={11} /> Espera humana</span>;
  if (conversation.automation_paused) return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c4ad86] bg-[#eee1cb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6e5b39]"><CirclePause size={11} /> IA pausada</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#aab89b] bg-[#e4e8dc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#536048]"><Bot size={11} /> IA atendiendo</span>;
}

function MessageBubble({ message }: { message: { direction: string; sender_type: string; body: string; status: string; detected_intent: string | null; confidence: number | null; created_at: string; delivered_at: string | null; read_at: string | null; failed_at: string | null; error_message: string | null } }) {
  const outbound = message.direction === "OUTBOUND";
  const ai = message.sender_type === "AI";
  return <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl border px-4 py-3 ${outbound ? ai ? "border-[#b7aa97] bg-[#e6dccd]" : "border-[#aeb69f] bg-[#dfe5d7]" : "border-[#d2c5b3] bg-[#fffaf2]"}`}><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{outbound ? ai ? <><Bot size={11} /> IA</> : <><UserRound size={11} /> Humano</> : <><MessageCircle size={11} /> Cliente</>}</div><p className="whitespace-pre-wrap text-sm leading-6 text-[#403b34]">{message.body}</p>{message.detected_intent && <p className="mt-2 text-[10px] text-[#81796e]">Intención: {message.detected_intent}{message.confidence != null ? ` · ${Math.round(Number(message.confidence) * 100)}% confianza` : ""}</p>}<div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[#948978]"><Clock3 size={10} /> {shortDate(message.created_at)}{outbound && <><span>·</span><DeliveryStatus status={message.status} /></>}</div>{message.failed_at && <p className="mt-2 text-[10px] text-[#8a5544]">No entregado{message.error_message ? ` · ${message.error_message}` : ""}</p>}</div></div>;
}

function DeliveryStatus({ status }: { status: string }) {
  if (status === "READ") return <span className="inline-flex items-center gap-1"><CheckCheck size={11} /> Leído</span>;
  if (status === "DELIVERED") return <span className="inline-flex items-center gap-1"><CheckCheck size={11} /> Entregado</span>;
  if (status === "FAILED") return <span>Falló</span>;
  return <span>{status === "SENT" ? "Enviado" : status}</span>;
}

function shortDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Montevideo" }).format(new Date(value));
}
