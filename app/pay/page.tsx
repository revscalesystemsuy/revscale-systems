import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PaddlePaymentLinkLoader } from "@/components/paddle-payment-link-loader";

export default function PaddlePaymentLinkPage() {
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

  return (
    <main className="min-h-screen bg-[#efe6d8] p-6 text-[#292722] md:p-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl">RevScale</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
        </Link>

        <div className="mt-12 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Pago seguro</p>
          <h1 className="mt-3 font-serif text-4xl font-medium">Completá tu pago</h1>
          <p className="mt-3 text-sm leading-6 text-[#716a61]">
            Esta página es utilizada por Paddle para abrir enlaces de pago y permitir la actualización segura del método de pago.
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#d5c8b6] bg-[#fffaf2] p-4">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#786448]" size={19} />
            <PaddlePaymentLinkLoader clientToken={clientToken} environment={environment} />
          </div>

          <Link href="/pricing" className="mt-6 block text-center text-sm text-[#78674e] hover:text-[#4a4238]">
            Volver a los planes
          </Link>
        </div>
      </div>
    </main>
  );
}
