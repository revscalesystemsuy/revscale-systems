import { Bell, Building2, CalendarClock, CheckCircle2, Clock3, Users, Zap } from "lucide-react";

const RULES = [
  { name: "Lead sin contacto", when: "un lead queda sin contacto", condition: "sigue sin contacto saliente durante 24 h", action: "avisar al agente", icon: Users, setting: "24 h" },
  { name: "Visita realizada", when: "un lead entra en Visita", condition: "la visita quedó registrada", action: "crear seguimiento para el día siguiente", icon: Bell, setting: "24 h" },
  { name: "Propiedad nueva", when: "se crea una propiedad", condition: "la propiedad está disponible", action: "calcular clientes compatibles", icon: Building2 },
  { name: "Reserva creada", when: "una venta entra en Reserva", condition: "la reserva quedó confirmada en pipeline", action: "avisar a Dirección", icon: CheckCircle2 },
  { name: "Cierre próximo", when: "se acerca una fecha de cierre", condition: "la oportunidad sigue abierta", action: "avisar al agente y Dirección", icon: CalendarClock, setting: "2 días" },
];

const HISTORY = [
  ["Lead sin contacto", "Alerta enviada a Lucía por Martín Pereyra", "hace 8 min"],
  ["Cierre próximo", "Agente y Dirección avisados por cierre estimado", "hace 21 min"],
  ["Propiedad nueva", "Matching recalculado: 24 clientes, 8 matches altos", "hace 43 min"],
  ["Visita realizada", "Seguimiento creado para mañana", "hace 1 h"],
];

export default function DemoAutomationsPage() {
  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Operación automática</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Automatizaciones</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">RevScale ejecuta tareas comerciales repetitivas aunque nadie tenga el sistema abierto.</p>
          </div>
          <div className="rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]"><span className="font-semibold">Motor activo</span> · revisa reglas por tiempo cada 15 minutos</div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric icon={<Zap size={18} strokeWidth={1.7} />} label="Reglas activas" value="5/5" />
          <Metric icon={<CheckCircle2 size={18} strokeWidth={1.7} />} label="Ejecuciones hoy" value="18" />
          <Metric icon={<Clock3 size={18} strokeWidth={1.7} />} label="Frecuencia" value="15 min" />
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-2xl font-medium text-[#302d28]">Reglas prediseñadas</h2>
          <p className="mt-1 text-sm text-[#756d63]">Una configuración inmobiliaria clara: Cuando pasa X + si Y → hacer Z.</p>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {RULES.map((rule) => {
              const Icon = rule.icon;
              return <article key={rule.name} className="rounded-2xl border border-[#c9b99f] bg-[#f7f0e6] p-5"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className="rounded-lg border border-[#d1c3ad] bg-[#eee4d5] p-2 text-[#765f43]"><Icon size={18} strokeWidth={1.7} /></div><div><h3 className="font-serif text-xl font-medium text-[#37312a]">{rule.name}</h3><p className="mt-1 text-xs text-[#81796e]">Lista para usar y ajustar.</p></div></div><span className="rounded-full border border-[#b7bea8] bg-[#e7eadf] px-3 py-1.5 text-xs font-semibold text-[#596146]">Activa</span></div><div className="mt-5 rounded-xl border border-[#ded2c1] bg-[#fffaf2] p-4 text-sm leading-6 text-[#514a41]"><span className="font-semibold text-[#795f3e]">Cuando</span> {rule.when}<span className="mx-2 text-[#a08f79]">+</span><span className="font-semibold text-[#795f3e]">si</span> {rule.condition}<span className="mx-2 text-[#a08f79]">→</span><span className="font-semibold text-[#795f3e]">hacer</span> {rule.action}.</div>{rule.setting && <div className="mt-4 flex items-center gap-3 text-xs"><span className="font-semibold uppercase tracking-[0.12em] text-[#81796e]">Plazo</span><span className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-sm text-[#4f473d]">{rule.setting}</span><span className="rounded-lg border border-[#bfae94] bg-[#eee4d5] px-3 py-2 font-semibold text-[#62533f]">Guardar plazo</span></div>}</article>;
            })}
          </div>
        </section>

        <section className="mt-9 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <div className="border-b border-[#ddd1c0] px-5 py-4 md:px-6"><h2 className="font-serif text-2xl font-medium text-[#302d28]">Historial reciente</h2><p className="mt-1 text-xs leading-5 text-[#81796e]">Cada acción automática queda registrada y auditable.</p></div>
          {HISTORY.map(([rule, summary, date]) => <article key={`${rule}-${summary}`} className="flex flex-col gap-2 border-b border-[#e2d7c8] px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between md:px-6"><div><p className="text-sm font-semibold text-[#474038]">{rule}</p><p className="mt-1 text-sm text-[#71695f]">{summary}</p></div><p className="shrink-0 text-xs text-[#8a8176]">{date}</p></article>)}
        </section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p></div>;
}
