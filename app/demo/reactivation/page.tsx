import { Suspense } from "react";
import { ArrowDownRight, Radar, RefreshCw, Sparkles } from "lucide-react";
import { DemoSidebar } from "../demo-sidebar";

const items = [
  { lead: "Valentina Suárez", type: "Baja de precio", score: 97, match: 93, reason: "Pocitos Premium bajó de USD 245.000 a USD 225.000. Sigue dentro de la búsqueda de Valentina.", property: "Pocitos Premium" },
  { lead: "Martín Cabrera", type: "Nuevo match", score: 94, match: 89, reason: "Entró una propiedad nueva en Punta Carretas con 89% de compatibilidad.", property: "Punta Carretas · 2 dormitorios" },
  { lead: "Lucía Fernández", type: "Lead dormido", score: 92, match: 86, reason: "Hace 47 días que no responde y todavía existe una propiedad disponible que encaja 86% con su búsqueda.", property: "Malvín Sur" },
  { lead: "Santiago Méndez", type: "Volvió disponible", score: 90, match: 82, reason: "Una propiedad que coincidía con su búsqueda volvió a estar disponible.", property: "Carrasco Sur" },
];

export default function DemoReactivationPage() {
  return <div className="min-h-screen bg-[#ece4d8] text-[#302d28] lg:flex"><Suspense fallback={<div className="hidden w-72 shrink-0 lg:block"/>}><DemoSidebar/></Suspense><main className="min-w-0 flex-1 p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Opportunity Radar</p><h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Reactivación inteligente</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">RevScale no vuelve a escribir porque pasó tiempo: espera un motivo concreto y prioriza dónde hay mayor probabilidad de recuperar una oportunidad.</p></div>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<Radar size={18}/>} label="Oportunidades abiertas" value="23"/><Metric icon={<Sparkles size={18}/>} label="Prioridad 90+" value="7"/><Metric icon={<RefreshCw size={18}/>} label="Recuperadas este mes" value="9"/><Metric icon={<ArrowDownRight size={18}/>} label="Pipeline recuperable" value="USD 1,4M"/></section>
    <section className="mt-9 space-y-4">{items.map(item => <article key={item.lead} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#c7b89f] bg-[#eee4d5] px-3 py-1 text-[11px] font-semibold text-[#6d5a40]">{item.type}</span><span className="rounded-full border border-[#b2b99f] bg-[#e5e9dc] px-3 py-1 text-[11px] font-bold text-[#515b42]">Score {item.score}</span><span className="text-xs text-[#81796e]">Match {item.match}%</span></div><h2 className="mt-4 font-serif text-2xl">{item.lead}</h2><p className="mt-2 text-sm leading-6 text-[#625d55]">{item.reason}</p><p className="mt-2 text-xs text-[#81796e]">{item.property}</p></div><div className="flex gap-2"><button className="rounded-lg bg-[#302d28] px-3.5 py-2 text-xs font-semibold !text-[#fffaf2]">Contactar</button><button className="rounded-lg border border-[#cdbfa9] px-3.5 py-2 text-xs font-semibold text-[#6d655b]">Descartar</button></div></div></article>)}</section>
  </div></main></div>;
}

function Metric({ icon,label,value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium">{value}</p></div>; }
