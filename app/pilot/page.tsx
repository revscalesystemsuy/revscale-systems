import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";

const scope = [
  "Diagnóstico comercial de 30 minutos para detectar fugas en asignación, respuesta, seguimiento, matching y reactivación.",
  "Importación y orden de leads activos y propiedades prioritarias.",
  "Configuración de pipeline, responsables, SLA y vista Qué hacer hoy.",
  "Matching y reactivación para Professional, con WhatsApp y automatizaciones donde sea viable.",
  "Capacitación de 60 minutos para agentes y 45 minutos para dirección o management.",
  "Baseline inicial, revisión semanal con RevScale y reporte de resultados al día 30/45.",
];

const activation = [
  "80% o más de los leads activos con responsable y próximo paso definido.",
  "Uso de Qué hacer hoy al menos 4 de 5 días laborales por el equipo núcleo.",
  "Revisión sistemática de matches y oportunidades de riesgo o reactivación.",
  "Revisión semanal de SLA y pendientes por parte de dirección o management.",
];

const timeline = [
  ["Día 0", "Diagnóstico y baseline de la operación actual."],
  ["Días 1–7", "Configuración, importación, responsables, pipeline y entrenamiento."],
  ["Semanas 2–4", "Uso real, revisión semanal y corrección de fugas comerciales."],
  ["Días 30–45", "Medición antes/después, conclusiones y decisión de continuidad."],
];

export default function PilotPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-8 text-[#292722] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between border-b border-[#d5c8b6] pb-5">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-tight">RevScale</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
          </Link>
          <Link href="/pricing" className="text-sm text-[#625d55] transition hover:text-[#292722]">Ver planes</Link>
        </div>

        <section className="mx-auto max-w-4xl py-16 text-center md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Revenue Recovery Pilot · 45 días</p>
          <h1 className="mt-4 font-serif text-5xl font-medium tracking-tight text-[#29251f] md:text-6xl">Activá RevScale en 7 días y medí dónde se pierden o recuperan oportunidades.</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#6d665d]">El piloto está diseñado para inmobiliarias con operación real y volumen de consultas. No busca que explores funciones: busca dejar la operación priorizada, con responsables y próximos pasos, y medir el cambio durante 45 días.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-md bg-[#2f2b25] px-6 py-3 font-medium text-[#f5eee4] transition hover:bg-[#1f1c18]">Ver Professional <ArrowUpRight size={16} /></Link>
            <Link href="/demos" className="rounded-md border border-[#b9aa94] px-6 py-3 font-medium text-[#39352e] transition hover:bg-[#e7dbca]">Ver demos</Link>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Qué incluye</p>
            <h2 className="mt-3 font-serif text-3xl text-[#302b25]">Implementación asistida, no prueba libre.</h2>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-[#625d55]">
              {scope.map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#816d4f]" strokeWidth={1.7} /><span>{item}</span></li>)}
            </ul>
          </article>

          <article className="rounded-2xl border border-[#bda98a] bg-[#e5d7c3] p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#705d43]">Criterios de activación</p>
            <h2 className="mt-3 font-serif text-3xl text-[#302b25]">El piloto tiene una definición objetiva de “funcionando”.</h2>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-[#5f5951]">
              {activation.map((item) => <li key={item} className="flex gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#745f43]" strokeWidth={1.7} /><span>{item}</span></li>)}
            </ul>
            <div className="mt-7 rounded-xl border border-[#c5b294] bg-[#eee3d3] p-4 text-sm leading-6 text-[#5d554b]">
              <strong className="font-medium text-[#312d27]">Garantía de activación:</strong> si al día 45 no se alcanzan los criterios definidos conjuntamente, la inmobiliaria puede cancelar sin pagos mensuales futuros.
            </div>
          </article>
        </section>

        <section className="mt-10 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Cómo se ejecuta</p>
              <h2 className="mt-3 font-serif text-3xl text-[#302b25]">45 días con principio, métricas y cierre.</h2>
              <p className="mt-4 text-sm leading-6 text-[#716a61]">El baseline del día 0 permite comparar después asignación, respuesta, próximos pasos, reactivación, uso operativo y oportunidades movidas.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {timeline.map(([day, description]) => (
                <div key={day} className="rounded-xl border border-[#ddd1c1] bg-[#f1e8dc] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#826f55]">{day}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f5951]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto my-12 max-w-4xl rounded-2xl border border-[#d5c8b6] bg-[#302b25] px-7 py-8 text-center text-[#f5eee4]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9b99f]">Oferta recomendada</p>
          <h2 className="mt-3 font-serif text-4xl">Professional · USD 249/mes</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#d8cfc4]">Para las primeras 10 implementaciones, onboarding y migración sin cargo. Sin contrato largo. El piloto se usa como activación asistida de la suscripción, no como producto separado ni descuento permanente.</p>
        </section>
      </div>
    </main>
  );
}
