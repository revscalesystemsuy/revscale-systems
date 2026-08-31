import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { propertyOSUseCases } from "@/lib/marketing/propertyos-use-cases";

export const metadata = {
  title: "Casos de uso | RevScale PropertyOS",
  description: "Diez situaciones comerciales inmobiliarias concretas y cómo RevScale ayuda a convertirlas en próximas acciones visibles.",
};

export default function UseCasesPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] text-[#292722]">
      <nav className="border-b border-[#d5c8b6] bg-[#f5eee4]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl tracking-tight">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link>
          <div className="flex items-center gap-4"><Link href="/auditoria-fugas" className="text-sm text-[#625d55]">Auditoría de Fugas</Link><Link href="/demos" className="rounded-md bg-[#2f2b25] px-4 py-2 text-sm font-medium text-[#f5eee4]">Ver demo</Link></div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a714d]">Casos de uso comerciales</p>
        <h1 className="mt-5 max-w-4xl font-serif text-5xl font-medium leading-[1.02] tracking-tight text-[#29251f] md:text-7xl">El problema aparece después de que entra la consulta.</h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-[#69635a]">Situaciones concretas donde ownership, seguimiento, matching, reactivación y visibilidad de dirección cambian la forma de trabajar una oportunidad. Son escenarios operativos ilustrativos; no representan resultados de clientes.</p>
        <div className="mt-10 flex flex-wrap gap-3"><Link href="/auditoria-fugas" className="rounded-md bg-[#2f2b25] px-6 py-3 font-medium text-[#f5eee4]">Auditar mis últimos leads</Link><Link href="/demos" className="rounded-md border border-[#b9aa94] px-6 py-3 font-medium text-[#39352e]">Ver cómo funciona</Link></div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 md:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {propertyOSUseCases.map((item) => (
            <article key={item.slug} className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6 md:p-7">
              <div className="flex items-start justify-between gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Caso {String(item.number).padStart(2,"0")} · {item.category}</p><h2 className="mt-3 font-serif text-3xl text-[#302b25]">{item.title}</h2></div><span className="rounded-full border border-[#d2c4b0] bg-[#efe6d8] px-3 py-1 text-xs text-[#6d655b]">{item.audience}</span></div>
              <p className="mt-5 text-sm leading-6 text-[#716a61]">{item.marketingMessage}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[#8b8175]">{item.productSurface}</p>
              <Link href={`/casos-de-uso/${item.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#4d4234] underline decoration-[#9f8968] underline-offset-4">Ver caso completo <ArrowUpRight size={14}/></Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
