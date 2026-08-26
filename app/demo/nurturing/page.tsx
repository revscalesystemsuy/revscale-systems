import Link from "next/link";
import { CalendarClock, MessageCircle, PauseCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { DemoSidebar } from "../demo-sidebar";

const activity = [
  { lead: "Valentina Suárez", status: "Lista", text: "Hola Valentina, revisé nuevamente tu búsqueda. Si cambió zona, presupuesto o dormitorios, decime y ajusto las opciones." },
  { lead: "Martín Cabrera", status: "Pausada por respuesta", text: "El lead respondió por WhatsApp. RevScale detuvo automáticamente la secuencia." },
  { lead: "Sofía Pereira", status: "Pausada por etapa", text: "La oportunidad pasó a Visita. El nurturing dejó de contactar al lead." },
];

export default async function DemoNurturingPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams;
  const plan = params.plan === "enterprise" ? "enterprise" : "professional";
  return (
    <div className="min-h-screen bg-[#ece4d8] text-[#302d28] lg:flex">
      <DemoSidebar />
      <main className="min-w-0 flex-1 p-6 md:p-8 lg:p-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Autopilot comercial</p><h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Nurturing</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Seguimiento de largo plazo que se adapta al comportamiento del lead y se detiene cuando deja de tener sentido insistir.</p></div>
            <Link href={`/demo/automations?plan=${plan}`} className="rounded-lg border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-2.5 text-sm font-semibold text-[#554f47]">Ver automatizaciones</Link>
          </div>

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric icon={<PlayCircle size={18} />} label="Leads activos" value="34" />
            <Metric icon={<PauseCircle size={18} />} label="Pausados automáticamente" value="12" />
            <Metric icon={<MessageCircle size={18} />} label="Respuestas recuperadas" value="9" />
          </section>

          <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 text-[#765f43]" /><div><h2 className="font-serif text-2xl">Nurturing con freno automático</h2><p className="mt-2 text-sm leading-6 text-[#6d655b]">Si el cliente responde, avanza a Visita/Negociación/Reserva/Cierre o necesita atención humana, RevScale detiene la secuencia. No sigue enviando mensajes fuera de contexto.</p></div></div></section>

          <section className="mt-8"><h2 className="font-serif text-2xl">Secuencias base</h2><p className="mt-1 text-sm text-[#756d63]">Días 1 · 3 · 7 · 14 · 30 · 60 · 90.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{["Autopilot compra","Autopilot alquiler"].map((name) => <article key={name} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a7556]">{name.includes("compra") ? "Compra" : "Alquiler"}</p><h3 className="mt-2 font-serif text-xl">{name}</h3></div><span className="rounded-full border border-[#b7bea8] bg-[#e7eadf] px-3 py-1 text-xs font-semibold text-[#596146]">Activa</span></div><div className="mt-4 flex items-center gap-2 text-sm text-[#6d655b]"><CalendarClock size={16} /> 7 contactos máximos en 90 días</div></article>)}</div></section>

          <section className="mt-9 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]"><div className="border-b border-[#ddd1c0] px-6 py-4"><h2 className="font-serif text-2xl">Actividad reciente</h2></div>{activity.map((item) => <article key={item.lead} className="flex flex-col gap-2 border-b border-[#e2d7c8] px-6 py-4 last:border-0 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-semibold">{item.lead}</p><p className="mt-1 text-sm text-[#71695f]">{item.text}</p></div><span className="shrink-0 rounded-full border border-[#d1c3ad] bg-[#fffaf2] px-3 py-1 text-xs font-semibold text-[#665842]">{item.status}</span></article>)}</section>
        </div>
      </main>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium">{value}</p></div>; }
