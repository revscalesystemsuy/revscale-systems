import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getPropertyOSUseCase, propertyOSUseCases } from "@/lib/marketing/propertyos-use-cases";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return propertyOSUseCases.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = getPropertyOSUseCase(slug);
  if (!item) return {};
  return {
    title: `${item.title} | RevScale PropertyOS`,
    description: `${item.marketingMessage} Caso de uso de RevScale PropertyOS para ${item.audience}.`,
  };
}

export default async function UseCaseDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = getPropertyOSUseCase(slug);
  if (!item) notFound();

  return (
    <main className="min-h-screen bg-[#efe6d8] text-[#292722]">
      <nav className="border-b border-[#d5c8b6] bg-[#f5eee4]/90"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-8"><Link href="/" className="flex items-baseline gap-2"><span className="font-serif text-2xl tracking-tight">RevScale</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span></Link><Link href="/demos" className="rounded-md bg-[#2f2b25] px-4 py-2 text-sm font-medium text-[#f5eee4]">Ver demo</Link></div></nav>

      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 lg:py-20">
        <Link href="/casos-de-uso" className="inline-flex items-center gap-2 text-sm text-[#71685c]"><ArrowLeft size={15}/> Todos los casos de uso</Link>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.12fr_.88fr] lg:items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Caso {String(item.number).padStart(2,"0")} · {item.category}</p>
            <h1 className="mt-4 font-serif text-5xl font-medium leading-[1.04] tracking-tight text-[#29251f] md:text-6xl">{item.title}</h1>
            <p className="mt-6 max-w-2xl font-serif text-2xl leading-9 text-[#574d40]">“{item.marketingMessage}”</p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-[#cdbfa9] bg-[#f7f1e8] px-3 py-1.5">{item.audience}</span><span className="rounded-full border border-[#cdbfa9] bg-[#f7f1e8] px-3 py-1.5">{item.productSurface}</span></div>
          </div>
          <aside className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Qué demuestra este escenario</p><p className="mt-4 text-sm leading-7 text-[#665f56]">Cómo un problema operativo concreto puede convertirse en una próxima acción visible, sin presentar el escenario como un resultado real de cliente.</p><Link href={item.ctaHref} className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#2f2b25] px-5 py-3 text-sm font-semibold text-[#f5eee4]">{item.ctaLabel} <ArrowUpRight size={15}/></Link></aside>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-[#d1b9ad] bg-[#f5e9e2] p-7"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ead6cc] text-[#8b5e50]"><XCircle size={19}/></div><p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b5e50]">Sin RevScale</p><h2 className="mt-2 font-serif text-3xl text-[#382d29]">El trabajo depende de recordar y reconstruir.</h2><p className="mt-5 text-sm leading-7 text-[#6d5d56]">{item.withoutRevScale}</p></article>
          <article className="rounded-2xl border border-[#c8c0a5] bg-[#eef0e6] p-7"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfe5d3] text-[#657351]"><CheckCircle2 size={19}/></div><p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#657351]">Con RevScale</p><h2 className="mt-2 font-serif text-3xl text-[#30352a]">El siguiente paso queda dentro del proceso.</h2><p className="mt-5 text-sm leading-7 text-[#5e6557]">{item.withRevScale}</p></article>
        </div>

        <section className="mt-10 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 md:p-9"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Superficie de producto</p><h2 className="mt-3 font-serif text-3xl text-[#302b25]">{item.productSurface}</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-[#716a61]">RevScale traduce las features a preguntas de negocio: quién tiene ownership, qué requiere atención, cuál es la próxima acción y qué señal justifica volver a contactar.</p><div className="mt-7 flex flex-wrap gap-3"><Link href={item.ctaHref} className="rounded-md bg-[#2f2b25] px-5 py-3 text-sm font-semibold text-[#f5eee4]">{item.ctaLabel}</Link><Link href="/auditoria-fugas" className="rounded-md border border-[#b9aa94] px-5 py-3 text-sm font-semibold text-[#39352e]">Auditar mis leads</Link></div></section>

        <p className="mt-7 text-xs leading-5 text-[#81796e]">Escenario operativo ilustrativo basado en el playbook comercial de RevScale. No representa un cliente, una métrica de mercado ni una promesa de resultados.</p>
      </section>
    </main>
  );
}
