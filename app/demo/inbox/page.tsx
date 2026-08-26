import Link from "next/link";
import { Bot, CheckCheck, CirclePause, MessageCircle, ShieldAlert, UserRound } from "lucide-react";
import { DEMO_PLAN_CONFIG, demoHref, normalizeDemoPlan } from "@/lib/demo-plan";
import { PageHeader } from "../demo-ui";

const conversations = [
  {
    id: "sofia-fernandez",
    name: "Sofía Fernández",
    zone: "Pocitos",
    score: 91,
    temperature: "HOT",
    state: "AI",
    unread: 1,
    next: "Confirmar si quiere visitar el jueves",
    messages: [
      ["CUSTOMER", "Hola, busco apartamento en Pocitos. Tengo hasta USD 180.000 y quiero mudarme antes de diciembre.", "10:08", "RECEIVED"],
      ["AI", "Perfecto. Registré Pocitos, presupuesto de USD 180.000 y el plazo. Tengo opciones compatibles en la cartera. ¿Preferís 2 o 3 dormitorios?", "10:09", "READ"],
      ["CUSTOMER", "Dos dormitorios. Si tiene garage mejor.", "10:11", "RECEIVED"],
      ["AI", "Bien. Lo agrego a la búsqueda. Hay una opción compatible en Pocitos con garage; si querés puedo ayudarte a avanzar hacia una visita.", "10:12", "DELIVERED"],
    ],
  },
  {
    id: "valentina-mendez",
    name: "Valentina Méndez",
    zone: "Carrasco",
    score: 86,
    temperature: "HOT",
    state: "HUMAN_REQUIRED",
    unread: 3,
    next: "Laura debe responder negociación",
    reason: "La clienta pidió negociar una seña y hablar con una persona.",
    messages: [
      ["CUSTOMER", "La casa me interesa. ¿Puedo hacer una seña menor y negociar el precio? Quiero hablar con un agente.", "09:42", "RECEIVED"],
      ["SYSTEM", "Automatización pausada. La conversación fue derivada a Laura Fernández.", "09:42", "RECEIVED"],
    ],
  },
  {
    id: "diego-cabrera",
    name: "Diego Cabrera",
    zone: "Punta Carretas",
    score: 73,
    temperature: "WARM",
    state: "HUMAN",
    unread: 0,
    next: "Seguimiento humano en curso",
    messages: [
      ["CUSTOMER", "¿Podemos coordinar para mañana a la tarde?", "08:55", "RECEIVED"],
      ["AGENT", "Sí, Diego. Soy Santiago. Estoy confirmando disponibilidad y te escribo con el horario exacto.", "09:02", "READ"],
    ],
  },
] as const;

export default async function DemoInboxPage({ searchParams }: { searchParams: Promise<{ plan?: string; conversation?: string }> }) {
  const params = await searchParams;
  const plan = normalizeDemoPlan(params.plan);
  const config = DEMO_PLAN_CONFIG[plan];
  const selected = conversations.find((item) => item.id === params.conversation) || conversations[0];

  return (
    <main className="min-h-screen p-5 md:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <PageHeader eyebrow={`${config.label} · Demo ficticia`} title="Inbox WhatsApp" subtitle="Así se ve el canal cuando una cuenta de WhatsApp Business real está conectada: IA, mensajes, handoff y gestión humana en una sola bandeja." action={<Link href={demoHref("/demo/whatsapp", plan)} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#554f47]">Ver cómo funciona</Link>} />

        <div className="mb-5 rounded-xl border border-[#cbb99f] bg-[#efe3d3] px-5 py-4 text-sm leading-6 text-[#665f56]">
          <strong className="text-[#403b34]">Datos de demostración.</strong> Estas conversaciones son ficticias y muestran el comportamiento esperado una vez conectados Meta, el número del cliente y las credenciales del proveedor.
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="Sin leer" value="4" /><Metric label="Espera humana" value="1" /><Metric label="IA atendiendo" value="1" />
        </section>

        <section className="mt-6 grid min-h-[650px] overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="border-b border-[#d2c5b3] lg:border-b-0 lg:border-r">
            <div className="border-b border-[#ded3c4] px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#81796e]">Conversaciones · 3</p></div>
            {conversations.map((conversation) => (
              <Link key={conversation.id} href={demoHref(`/demo/inbox?conversation=${conversation.id}`, plan)} className={`block border-b border-[#e1d7ca] p-4 transition ${selected.id === conversation.id ? "bg-[#eadfce]" : "bg-[#fffaf2] hover:bg-[#f2e8db]"}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#39352f]">{conversation.name}</p><p className="mt-1 text-xs text-[#81796e]">{conversation.zone} · {conversation.temperature} · {conversation.score}/100</p></div>{conversation.unread > 0 && <span className="min-w-6 rounded-full bg-[#725d40] px-2 py-1 text-center text-[10px] font-bold text-[#fffaf2]">{conversation.unread}</span>}</div>
                <div className="mt-3"><State value={conversation.state} /></div>
                <p className="mt-3 text-xs leading-5 text-[#716a60]">{conversation.next}</p>
              </Link>
            ))}
          </div>

          <div className="min-w-0 bg-[#eee5d7]">
            <header className="border-b border-[#d2c5b3] bg-[#f7f0e6] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-2xl font-medium text-[#302d28]">{selected.name}</h2><State value={selected.state} /></div><p className="mt-2 text-sm text-[#746d64]">{selected.zone} · Lead {selected.temperature} · Score {selected.score}/100</p></div><Link href={demoHref(`/demo/leads/${selected.id}`, plan)} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#554f47]">Abrir lead</Link></div>
              {"reason" in selected && selected.reason && <div className="mt-4 rounded-xl border border-[#bd9a83] bg-[#efddd1] p-4"><p className="flex items-center gap-2 text-sm font-semibold text-[#704b3c]"><ShieldAlert size={16} /> Handoff automático</p><p className="mt-2 text-xs leading-5 text-[#805f52]">{selected.reason}</p></div>}
            </header>

            <div className="min-h-[430px] space-y-3 p-5 md:p-7">
              {selected.messages.map((message, index) => <Bubble key={`${selected.id}-${index}`} sender={message[0]} body={message[1]} time={message[2]} status={message[3]} />)}
            </div>

            <footer className="border-t border-[#d2c5b3] bg-[#f7f0e6] p-5">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#746d64]"><span>{selected.state === "AI" ? "La IA puede continuar calificando." : "La IA permanece pausada mientras interviene el equipo."}</span><span className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 font-semibold">{selected.state === "AI" ? "Pausar IA" : "Reactivar IA"}</span></div>
              <div className="flex gap-3"><div className="flex-1 rounded-xl border border-[#cdbfa9] bg-[#fffaf2] px-4 py-3 text-sm text-[#998f82]">Escribí una respuesta humana...</div><span className="inline-flex items-center rounded-xl bg-[#302d28] px-5 text-sm font-semibold text-[#fffaf2]">Enviar</span></div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d7468]">{label}</p><p className="mt-3 font-serif text-3xl text-[#302b25]">{value}</p></div>; }
function State({ value }: { value: string }) { if (value === "HUMAN_REQUIRED") return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bd9a83] bg-[#efddd1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#704b3c]"><ShieldAlert size={11} /> Espera humana</span>; if (value === "HUMAN") return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c4ad86] bg-[#eee1cb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6e5b39]"><CirclePause size={11} /> IA pausada</span>; return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#aab89b] bg-[#e4e8dc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#536048]"><Bot size={11} /> IA atendiendo</span>; }
function Bubble({ sender, body, time, status }: { sender: string; body: string; time: string; status: string }) { const outbound = sender !== "CUSTOMER"; const ai = sender === "AI"; return <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl border px-4 py-3 ${outbound ? ai ? "border-[#b7aa97] bg-[#e6dccd]" : sender === "SYSTEM" ? "border-[#c4ad86] bg-[#eee1cb]" : "border-[#aeb69f] bg-[#dfe5d7]" : "border-[#d2c5b3] bg-[#fffaf2]"}`}><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{sender === "AI" ? <><Bot size={11} /> IA</> : sender === "AGENT" ? <><UserRound size={11} /> Agente</> : sender === "SYSTEM" ? <><ShieldAlert size={11} /> Sistema</> : <><MessageCircle size={11} /> Cliente</>}</div><p className="text-sm leading-6 text-[#403b34]">{body}</p><div className="mt-2 flex justify-end gap-2 text-[10px] text-[#948978]"><span>{time}</span>{outbound && status !== "RECEIVED" && <span className="inline-flex items-center gap-1"><CheckCheck size={11} /> {status === "READ" ? "Leído" : "Entregado"}</span>}</div></div></div>; }
