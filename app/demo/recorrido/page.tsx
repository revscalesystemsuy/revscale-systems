import Link from "next/link";
import { ArrowUpRight, Clock3, PlayCircle, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { normalizeDemoPlan } from "@/lib/demo-plan";

const steps = [
  {
    time: "0:00–0:30",
    label: "Encuadre",
    title: "Qué problema resuelve RevScale",
    description: "La oportunidad ya existe. El problema es saber cuál necesita acción ahora, quién es responsable y qué debería pasar después.",
    href: "/demo?plan=professional",
    cta: "Abrir resumen",
  },
  {
    time: "0:30–1:20",
    label: "Resumen",
    title: "La operación en una sola vista",
    description: "Mostrá cartera, oportunidades, seguimientos y prioridad del día. Los números son exclusivamente datos ficticios de demostración.",
    href: "/demo?plan=professional",
    cta: "Ver resumen comercial",
  },
  {
    time: "1:20–2:30",
    label: "Qué hacer hoy",
    title: "Primero, la cola de trabajo",
    description: "RevScale ordena primera respuesta humana, seguimientos, intención, riesgo y avance para que el equipo no empiece revisando todo.",
    href: "/demo/today?plan=professional",
    cta: "Ver prioridades",
  },
  {
    time: "2:30–3:30",
    label: "Lead",
    title: "Abrí a Martín Rodríguez",
    description: "Score 94, etapa Negociación, presupuesto USD 220.000, Pocitos y próximo paso concreto. Es el hilo central de este recorrido.",
    href: "/demo/leads/martin-rodriguez?plan=professional",
    cta: "Abrir lead",
  },
  {
    time: "3:30–4:30",
    label: "Matching",
    title: "Del contexto a una propiedad compatible",
    description: "El matching explica compatibilidad, razones y acción recomendada. No es una lista ciega de propiedades: usa la necesidad registrada del lead.",
    href: "/demo/leads/martin-rodriguez?plan=professional#matching",
    cta: "Ir al matching",
  },
  {
    time: "4:30–5:20",
    label: "WhatsApp",
    title: "Ejecutar sin perder contexto",
    description: "Dentro del lead, simulá el envío de la propiedad compatible. La demo nunca envía mensajes reales; muestra cómo quedaría preparada la interacción.",
    href: "/demo/leads/martin-rodriguez?plan=professional#matching",
    cta: "Simular próximo paso",
  },
  {
    time: "5:20–6:10",
    label: "Opportunity Radar",
    title: "Recuperar oportunidades cuando aparece un motivo",
    description: "Reactivación por baja de precio, nuevo match, propiedad disponible otra vez o lead dormido con una opción vigente; no solo porque pasó tiempo.",
    href: "/demo/reactivation?plan=professional",
    cta: "Abrir Opportunity Radar",
  },
  {
    time: "6:10–6:50",
    label: "Dirección + ROI",
    title: "Cerrar con control de negocio",
    description: "Dirección ve pipeline, SLA y señales de gestión. Marketing ROI conecta origen, gasto y avance comercial usando solamente datos ficticios de demo.",
    href: "/demo/executive?plan=professional",
    secondaryHref: "/demo/marketing-roi?plan=professional",
    cta: "Abrir Dirección",
    secondaryCta: "Ver Marketing ROI",
  },
  {
    time: "6:50–7:00",
    label: "Cierre",
    title: "El siguiente paso es diagnosticar la operación",
    description: "Si el flujo tiene sentido, el diagnóstico de dos minutos mide encaje operativo y define si conviene demo, revisión o Revenue Recovery Pilot.",
    href: "/diagnostico",
    cta: "Diagnosticar mi operación",
  },
] as const;

export default async function GuidedDemoPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams;
  const plan = normalizeDemoPlan(params.plan);
  if (plan !== "professional") redirect("/demo/recorrido?plan=professional");

  return (
    <main className="min-h-screen bg-[#eee5d7] p-6 text-[#292722] md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-[#cdbfa9] bg-[#e5d7c3] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#745f43]"><PlayCircle size={16} strokeWidth={1.6} />Recorrido recomendado · Professional</div>
              <h1 className="mt-4 font-serif text-4xl font-medium leading-tight tracking-tight text-[#302b25] md:text-5xl">RevScale en 7 minutos, de prioridad a decisión.</h1>
              <p className="mt-4 text-sm leading-6 text-[#625d55]">Este recorrido usa exclusivamente información ficticia de Inmobiliaria Horizonte. Está diseñado para mostrar una historia comercial, no para recorrer todos los módulos.</p>
            </div>
            <div className="rounded-xl border border-[#bda98a] bg-[#f0e6d8] px-5 py-4 text-[#5d5141]"><p className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={16} />Duración objetivo: 7:00</p><p className="mt-1 text-xs">9 momentos · una sola historia</p></div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4 text-sm leading-6 text-[#665f56]"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#786448]" strokeWidth={1.6} /><p><strong className="text-[#403b34]">Regla de la demo:</strong> no presentes los indicadores como resultados de clientes. Son datos demostrativos para explicar el producto y su mecanismo.</p></div>

        <section className="mt-8 space-y-4">
          {steps.map((step, index) => (
            <article key={step.time} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6">
              <div className="grid gap-5 lg:grid-cols-[120px_1fr_auto] lg:items-center">
                <div><p className="font-serif text-2xl text-[#745f43]">{step.time}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{String(index + 1).padStart(2, "0")} · {step.label}</p></div>
                <div><h2 className="font-serif text-2xl text-[#302b25]">{step.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#716a61]">{step.description}</p></div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href={step.href} className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-xs font-semibold text-[#fffaf2]">{step.cta}<ArrowUpRight size={13} /></Link>
                  {"secondaryHref" in step && step.secondaryHref ? <Link href={step.secondaryHref} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-xs font-semibold text-[#554f47]">{step.secondaryCta}</Link> : null}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#302d28] px-6 py-8 text-center text-[#fffaf2]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#cdbfa9]">Después del recorrido</p>
          <h2 className="mt-3 font-serif text-3xl">¿Tiene sentido para tu operación?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#d9d0c3]">El diagnóstico no promete resultados: mide si hay suficiente volumen, fragmentación y dolor operativo para justificar una activación asistida.</p>
          <Link href="/diagnostico" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#f0e6d8] px-5 py-3 text-sm font-semibold text-[#302d28]">Diagnosticar mi operación<ArrowUpRight size={14} /></Link>
        </section>
      </div>
    </main>
  );
}
