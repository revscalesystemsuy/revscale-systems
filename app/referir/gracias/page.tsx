import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function ReferralThanksPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-20 text-[#292722]">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-8 text-center shadow-[0_24px_70px_rgba(70,58,42,.07)]">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#806b4d]" strokeWidth={1.5} />
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.22em] text-[#8a714d]">RevScale Network</p>
        <h1 className="mt-3 font-serif text-4xl">Referido registrado.</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#6d665d]">Ahora RevScale valida atribución y fit. El crédito del cliente que refiere solo puede aprobarse después de la segunda mensualidad paga del referido y de verificar las reglas del programa.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-xl border border-[#cdbfaa] px-5 py-3 text-sm font-semibold">Volver a RevScale</Link>
          <Link href="/demos" className="rounded-xl bg-[#2f2b25] px-5 py-3 text-sm font-semibold text-[#f5eee4]">Ver demo</Link>
        </div>
      </div>
    </main>
  );
}
