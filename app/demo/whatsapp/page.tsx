import { BrainCircuit, MessageCircle, ShieldCheck, UserRoundCheck } from "lucide-react"

export default function DemoWhatsAppPage() {
  return (
    <main className="min-h-screen bg-[#eee5d7] p-6 text-[#292722] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Professional · USD 249+</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">WhatsApp IA</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">RevScale entiende la consulta, usa el contexto del lead y de la propiedad, actualiza el CRM y deriva a una persona cuando la conversación necesita criterio comercial.</p>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric label="Conversaciones hoy" value="47" />
          <Metric label="Respondidas por IA" value="38" />
          <Metric label="Leads HOT" value="9" />
          <Metric label="Derivadas a humano" value="6" />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <div className="flex items-center justify-between gap-4 border-b border-[#ddd1c0] pb-4">
              <div>
                <p className="font-serif text-xl font-medium">Sofía Pereira</p>
                <p className="mt-1 text-xs text-[#756e64]">Apartamento en Pocitos · Lead score 89/100</p>
              </div>
              <span className="rounded-full bg-[#d8c3a8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#5c442d]">HOT</span>
            </div>

            <div className="mt-6 space-y-4">
              <Bubble customer>Hola, vi el apartamento de Pocitos. ¿Acepta banco y tiene garage?</Bubble>
              <Bubble>Si, tiene garage incluido. Sobre financiacion bancaria figura como apto, aunque antes de avanzar lo confirmaria con el agente responsable. ¿Lo estas buscando para vivir o como inversion?</Bubble>
              <Bubble customer>Para vivir. Tengo hasta USD 180.000 y quisiera mudarme antes de diciembre.</Bubble>
              <Bubble>Perfecto. Tome nota del presupuesto y del plazo. Encontre opciones compatibles dentro de tu rango. ¿Queres que te las muestre?</Bubble>
            </div>

            <div className="mt-6 rounded-xl border border-[#cdbfa9] bg-[#eee4d5] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#463f36]"><BrainCircuit size={17} /> Detectado automaticamente</div>
              <div className="mt-3 grid gap-2 text-xs text-[#625d55] sm:grid-cols-2">
                <p><strong className="text-[#403a33]">Intencion:</strong> compra para vivienda</p>
                <p><strong className="text-[#403a33]">Presupuesto:</strong> USD 180.000</p>
                <p><strong className="text-[#403a33]">Zona:</strong> Pocitos</p>
                <p><strong className="text-[#403a33]">Plazo:</strong> antes de diciembre</p>
              </div>
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
              <div className="flex items-center gap-2"><MessageCircle size={18} className="text-[#786448]" /><h2 className="font-serif text-lg font-medium">Acciones de RevScale</h2></div>
              <div className="mt-4 space-y-3 text-sm text-[#5f5951]">
                <Action text="Actualizo presupuesto" />
                <Action text="Guardo plazo de compra" />
                <Action text="Subio el lead a HOT" />
                <Action text="Busco propiedades compatibles" />
              </div>
            </section>

            <section className="rounded-2xl border border-[#c8b79f] bg-[#e7dac7] p-5">
              <div className="flex items-center gap-2"><UserRoundCheck size={18} className="text-[#705a3f]" /><h2 className="font-serif text-lg font-medium">Derivacion humana</h2></div>
              <p className="mt-3 text-sm leading-6 text-[#5d554b]">Si aparece una negociacion, reclamo, pedido de hablar con un agente o baja confianza, RevScale pausa la automatizacion y avisa al equipo.</p>
            </section>

            <section className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
              <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-[#786448]" /><div><p className="text-sm font-semibold text-[#403a33]">Respuestas con datos reales</p><p className="mt-1 text-xs leading-5 text-[#756e64]">La IA consulta la informacion registrada en PropertyOS antes de responder sobre propiedades.</p></div></div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d7468]">{label}</p><p className="mt-3 font-serif text-3xl text-[#302b25]">{value}</p></div>
}

function Bubble({ customer = false, children }: { customer?: boolean; children: React.ReactNode }) {
  return <div className={`flex ${customer ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${customer ? "rounded-tr-md bg-[#302d28] !text-[#fffaf2]" : "rounded-tl-md border border-[#d3c5b2] bg-[#eee4d5] text-[#4d473f]"}`}>{children}</div></div>
}

function Action({ text }: { text: string }) {
  return <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#776d55]" /><span>{text}</span></div>
}
