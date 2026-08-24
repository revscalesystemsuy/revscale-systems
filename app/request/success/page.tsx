import Link from "next/link";
import { CircleCheck } from "lucide-react";

export default async function RequestSuccessPage({ searchParams }: { searchParams: Promise<{ email?: string; plan?: string }> }) {
  const params = await searchParams;
  const plan = String(params.plan || "").toUpperCase();

  return (
    <main className="min-h-screen bg-[#efe6d8] p-6 text-[#292722] md:p-10">
      <div className="mx-auto max-w-xl">
        <div className="mt-20 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-9 text-center shadow-[0_24px_70px_rgba(70,58,42,.08)]">
          <CircleCheck className="mx-auto h-10 w-10 text-[#7b674a]" strokeWidth={1.6} />
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">RevScale PropertyOS</p>
          <h1 className="mt-3 font-serif text-4xl font-medium">Solicitud enviada</h1>
          <p className="mt-4 text-sm leading-6 text-[#716a61]">
            Recibimos tu solicitud{plan ? ` para el plan ${plan}` : ""}. Si todavía no confirmaste tu email, revisá tu bandeja de entrada. Cuando la cuenta y el plan estén activados, vas a poder ingresar al sistema.
          </p>
          <Link href="/auth/login" className="mt-8 block rounded-xl bg-[#2f2b25] px-6 py-3 font-semibold text-[#fffaf2] transition hover:bg-[#1f1c18]">Ir a iniciar sesión</Link>
          <Link href="/" className="mt-5 block text-sm font-medium text-[#6f5c40] hover:text-[#493d2d]">Volver al inicio</Link>
        </div>
      </div>
    </main>
  );
}
