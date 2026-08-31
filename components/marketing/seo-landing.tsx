import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { SeoPage } from "@/lib/marketing/seo-pages";

export function SeoLanding({ page }: { page: SeoPage }) {
  return (
    <main className="min-h-screen bg-[#efe6d8] text-[#292722]">
      <nav className="border-b border-[#d5c8b6] bg-[#f5eee4]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-tight">RevScale</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
          </Link>
          <div className="flex gap-4 text-sm"><Link href="/casos-de-uso">Casos de uso</Link><Link href="/demos">Demo</Link></div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">{page.eyebrow}</p>
        <h1 className="mt-5 max-w-5xl font-serif text-5xl font-medium leading-[1.03] tracking-tight text-[#29251f] md:text-7xl">{page.h1}</h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-[#69635a]">{page.intro}</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href={page.ctaHref} className="inline-flex items-center gap-2 rounded-md bg-[#2f2b25] px-6 py-3 font-medium text-[#f5eee4]">{page.ctaLabel}<ArrowUpRight size={16}/></Link><Link href="/casos-de-uso" className="rounded-md border border-[#b9aa94] px-6 py-3 font-medium">Ver casos de uso</Link></div>
      </section>

      <section className="border-y border-[#d5c8b6] bg-[#e8ddce]"><div className="mx-auto max-w-7xl px-6 py-14 md:px-8"><div className="grid gap-4 md:grid-cols-3">{page.problems.map((item) => <article key={item.title} className="rounded-2xl border border-[#ccbba3] bg-[#f7f1e8] p-6"><CheckCircle2 className="h-5 w-5 text-[#806b4d]" strokeWidth={1.6}/><h2 className="mt-4 font-serif text-2xl">{item.title}</h2><p className="mt-3 text-sm leading-6 text-[#6d665d]">{item.body}</p></article>)}</div></div></section>

      <section className="mx-auto max-w-5xl px-6 py-16 md:px-8">{page.sections.map((section) => <article key={section.title} className="border-b border-[#d5c8b6] py-8 first:pt-0"><h2 className="font-serif text-3xl text-[#302b25]">{section.title}</h2><p className="mt-4 text-base leading-8 text-[#625d55]">{section.body}</p></article>)}</section>

      <section className="mx-auto max-w-5xl px-6 pb-20 md:px-8"><div className="rounded-2xl border border-[#bda98a] bg-[#e5d7c3] p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#745f43]">Siguiente paso</p><h2 className="mt-3 font-serif text-3xl">Probalo sobre una situación concreta de tu operación.</h2><p className="mt-4 text-sm leading-6 text-[#645c52]">RevScale no usa estas páginas como promesa de resultados ni benchmark de mercado. El siguiente paso es ver el flujo o diagnosticar una muestra real.</p><Link href={page.ctaHref} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">{page.ctaLabel}<ArrowUpRight size={14}/></Link></div></section>
    </main>
  );
}
