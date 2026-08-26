import { Building2, CalendarDays, CheckCircle2, Layers3, Sparkles } from "lucide-react"
import { PageHeader } from "../demo-ui"

const units = [
  ["A-203", "Torre A", "2 dorm. frente", "USD 218.000", "Disponible", "92%"],
  ["A-305", "Torre A", "1 dorm. lateral", "USD 164.000", "Reservada", "—"],
  ["B-602", "Torre B", "3 dorm. esquina", "USD 328.000", "Disponible", "88%"],
  ["B-804", "Torre B", "2 dorm. frente", "USD 239.000", "Disponible", "84%"],
] as const

export default function DemoDevelopmentsPage() {
  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Enterprise · Desarrollos" title="Proyectos en pozo" subtitle="Gestioná el proyecto completo, desde torres y tipologías hasta cada unidad disponible. El stock entra automáticamente al inventario y al matching comercial." />

        <section className="mt-2 grid gap-4 md:grid-cols-4">
          <Metric label="Proyecto" value="Alba Pocitos" />
          <Metric label="Unidades" value="48" />
          <Metric label="Disponibles" value="19" />
          <Metric label="Reservadas" value="11" />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Proyecto activo</p><h2 className="mt-3 font-serif text-3xl text-[#302d28]">Alba Pocitos</h2><p className="mt-2 text-sm text-[#625d55]">Av. Brasil · Pocitos · Montevideo</p></div><Building2 className="text-[#8d7553]" strokeWidth={1.5}/></div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2"><Info icon={<CalendarDays size={17}/>} title="Entrega prevista" text="Marzo 2028"/><Info icon={<Layers3 size={17}/>} title="Estructura" text="2 torres · 5 tipologías"/></div>
            <div className="mt-6 border-t border-[#d8ccbb] pt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#81796e]">Amenities</p><div className="mt-3 flex flex-wrap gap-2">{["Rooftop","Gimnasio","Barbacoa","Cowork","Laundry"].map((item)=><span key={item} className="rounded-full border border-[#d2c5b3] bg-[#fffaf2] px-3 py-1.5 text-xs text-[#625d55]">{item}</span>)}</div></div>
          </article>

          <article className="rounded-2xl border border-[#c8b493] bg-[#e8dbc8] p-6 md:p-8">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#bfa989] bg-[#f5eadc] text-[#725d40]"><Sparkles size={18}/></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#806a4b]">Automatización comercial</p><h2 className="mt-2 font-serif text-2xl text-[#302d28]">Stock conectado al matching</h2></div></div>
            <div className="mt-6 space-y-4 text-sm leading-6 text-[#5d554b]"><Step text="Se carga o actualiza una unidad dentro del proyecto."/><Step text="RevScale sincroniza automáticamente esa unidad con Propiedades."/><Step text="Si está Disponible, busca clientes compatibles y calcula afinidad."/><Step text="El agente recibe el aviso con los clientes de su propia cartera."/></div>
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8ccbb] p-6"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">Torre A + Torre B</p><h2 className="mt-2 font-serif text-2xl text-[#302d28]">Stock de unidades</h2></div><p className="text-xs text-[#756e64]">Actualización automática con inventario comercial</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#eee5d7] text-[10px] uppercase tracking-[0.14em] text-[#81796e]"><tr><th className="px-5 py-3">Unidad</th><th>Bloque</th><th>Tipología</th><th>Precio</th><th>Estado</th><th className="px-5">Mejor match</th></tr></thead><tbody>{units.map(([code,block,type,price,status,match])=><tr key={code} className="border-t border-[#ddd1c1] text-[#4f4941]"><td className="px-5 py-4 font-medium text-[#302d28]">{code}</td><td>{block}</td><td>{type}</td><td>{price}</td><td><span className="rounded-full border border-[#cdbfa9] bg-[#fffaf2] px-2.5 py-1 text-xs">{status}</span></td><td className="px-5 font-semibold text-[#725d40]">{match}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-2 font-serif text-2xl text-[#4b4238]">{value}</p></div> }
function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-xl border border-[#d8ccbb] bg-[#fffaf2] p-4"><div className="text-[#8d7553]">{icon}</div><p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[#81796e]">{title}</p><p className="mt-1 text-sm font-medium text-[#403a33]">{text}</p></div> }
function Step({ text }: { text: string }) { return <div className="flex gap-3"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#806a4b]"/><p>{text}</p></div> }
