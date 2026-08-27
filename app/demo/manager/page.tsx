import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  FileWarning,
  Flame,
  Gauge,
  MessageCircleWarning,
  RefreshCw,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { normalizeDemoPlan } from "@/lib/demo-plan";

const insights = [
  { priority: "Crítico", eyebrow: "Speed-to-lead", title: "2 leads HOT sin respuesta humana", detail: "Sofía Rodríguez · Martín Acosta", why: "Ambos están HOT y superaron el SLA de primera respuesta humana. RevScale los prioriza antes que tareas administrativas porque hay intención activa y riesgo de fuga.", action: "Atender leads", href: "/demo/leads" },
  { priority: "Crítico", eyebrow: "WhatsApp", title: "1 conversación pide intervención humana", detail: "Hay 3 mensajes sin leer en el inbox.", why: "La IA detectó un handoff pendiente y todavía no existe resolución humana. La conversación debe salir de automatización y tomar dueño.", action: "Abrir inbox", href: "/demo/inbox" },
  { priority: "Alta", eyebrow: "Pipeline", title: "3 oportunidades en riesgo alto", detail: "USD 410.000 de pipeline expuesto.", why: "La señal combina antigüedad de etapa, inactividad y seguimientos vencidos. Una oportunidad además tiene fecha estimada de cierre vencida.", action: "Intervenir pipeline", href: "/demo/pipeline" },
  { priority: "Oportunidad", eyebrow: "Opportunity Radar", title: "4 leads recuperables con score ≥ 75", detail: "Dos recibieron una nueva coincidencia fuerte de propiedad.", why: "Existe una razón comercial nueva y concreta para volver a contactar; no es una campaña masiva sobre base dormida.", action: "Abrir Radar", href: "/demo/reactivation" },
  { priority: "Alta", eyebrow: "Marketing ROI", title: "Mercado Libre muestra ROI negativo", detail: "-100% en la ventana demo de 90 días.", why: "El gasto generó leads pero todavía no produjo comisión retenida por la inmobiliaria. RevScale separa volumen de leads de retorno real.", action: "Ver ROI", href: "/demo/marketing-roi" },
  { priority: "Alta", eyebrow: "Documentos", title: "3 bloqueos pueden frenar cierres", detail: "1 revisión pendiente · 1 firma pendiente · 1 documento próximo a vencer.", why: "Solo suben al Manager los documentos que pueden bloquear reserva, firma o cierre; los borradores sin impacto no se priorizan.", action: "Resolver documentos", href: "/demo/documents" },
];

export default async function DemoManagerPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams;
  const plan = normalizeDemoPlan(params.plan);
  return <main className="min-h-screen p-6 text-[#292722] md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Decision Intelligence · Dirección</p><h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">RevScale Manager</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Una sola vista para decidir qué necesita intervención hoy, cuánto dinero está en riesgo y dónde hay una oportunidad concreta de crecimiento.</p></div><span className="rounded-xl border border-[#c8b99f] bg-[#e7dccb] px-4 py-3 text-sm font-semibold text-[#5c5143]">Plan {plan}</span></div>

    <section className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#f7f0e6] p-6 md:p-7"><div className="flex gap-4"><div className="rounded-xl border border-[#c7b89f] bg-[#e8dece] p-3 text-[#705d42]"><Sparkles size={22}/></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Brief de Dirección</p><h2 className="mt-2 font-serif text-3xl">Hay 2 prioridades críticas que conviene resolver antes de mirar métricas generales.</h2><p className="mt-3 text-sm leading-6 text-[#6c655c]">El Manager ordena señales por urgencia e impacto y explica la evidencia que disparó cada recomendación.</p></div></div></section>

    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <Metric icon={<Flame size={17}/>} label="HOT sin humano" value="2" />
      <Metric icon={<AlertTriangle size={17}/>} label="Riesgo alto" value="3" />
      <Metric icon={<Gauge size={17}/>} label="SLA" value="71%" />
      <Metric icon={<RefreshCw size={17}/>} label="Recuperables" value="4" />
      <Metric icon={<FileWarning size={17}/>} label="Bloqueos docs" value="3" />
      <Metric icon={<TrendingDown size={17}/>} label="ROI negativo" value="1" />
    </section>

    <section className="mt-8"><div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Action Center</p><h2 className="mt-2 font-serif text-3xl">Qué haría primero</h2></div><span className="text-sm text-[#81796e]">6 señales priorizadas</span></div><div className="mt-5 grid gap-5 lg:grid-cols-2">{insights.map((item,index)=><article key={item.title} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">#{index+1} · {item.eyebrow}</p><h3 className="mt-2 font-serif text-2xl">{item.title}</h3></div><span className="rounded-full border border-[#c7b59d] bg-[#ece2d3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">{item.priority}</span></div><p className="mt-3 text-sm text-[#625d55]">{item.detail}</p><div className="mt-4 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7553]">Por qué RevScale piensa esto</p><p className="mt-2 text-sm leading-6 text-[#6d655b]">{item.why}</p></div><Link href={`${item.href}?plan=${plan}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6f5c40]">{item.action}<ArrowRight size={15}/></Link></article>)}</div></section>

    <section className="mt-8 grid gap-6 lg:grid-cols-3"><Panel icon={<BadgeDollarSign size={19}/>} title="Dinero en riesgo" value="USD 410.000" text="3 oportunidades abiertas con riesgo alto y valor conocido." /><Panel icon={<MessageCircleWarning size={19}/>} title="Atención humana" value="3" text="1 handoff WhatsApp + 2 leads HOT todavía sin respuesta humana." /><Panel icon={<FileWarning size={19}/>} title="Bloqueos de cierre" value="3" text="Revisión, firma y vencimiento documental concentrados en operaciones activas." /></section>
  </div></main>;
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span></div><p className="mt-3 font-serif text-3xl">{value}</p></div>}
function Panel({icon,title,value,text}:{icon:React.ReactNode;title:string;value:string;text:string}){return <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><div className="flex items-center gap-2 text-[#806d52]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em]">{title}</p></div><p className="mt-3 font-serif text-2xl">{value}</p><p className="mt-3 text-sm leading-6 text-[#71695f]">{text}</p></div>}
