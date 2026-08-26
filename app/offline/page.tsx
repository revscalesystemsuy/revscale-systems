import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#eee5d7] p-6 text-[#292722]">
      <div className="w-full max-w-md rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-7 text-center shadow-[0_24px_70px_rgba(70,58,42,.08)]">
        <WifiOff className="mx-auto text-[#806d52]" size={28} strokeWidth={1.6} />
        <h1 className="mt-5 font-serif text-3xl">Sin conexión</h1>
        <p className="mt-3 text-sm leading-6 text-[#665f56]">RevScale necesita conexión para leer y actualizar la operación en tiempo real. Cuando vuelva internet, podés continuar donde estabas.</p>
        <Link href="/protected" className="mt-6 inline-flex rounded-xl bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2]">Reintentar</Link>
      </div>
    </main>
  );
}
