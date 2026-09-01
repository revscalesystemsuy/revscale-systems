import Link from "next/link";
import { ArrowUpRight, Gift, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const inputClass = "w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3 text-sm text-[#292722] outline-none placeholder:text-[#8a8379] focus:border-[#8a714d]";

export default function ReferralPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  async function submitReferral(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("submit_customer_referral", {
      p_code: String(formData.get("code") || "").trim().toUpperCase(),
      p_name: String(formData.get("name") || "").trim(),
      p_company: String(formData.get("company") || "").trim(),
      p_email: String(formData.get("email") || "").trim().toLowerCase(),
      p_phone: String(formData.get("phone") || "").trim(),
    });
    if (error) throw new Error("No pudimos registrar el referido. Revisá el código y los datos.");
    const result = (data || {}) as { referral_id?: string };
    redirect(`/referir/gracias?id=${encodeURIComponent(String(result.referral_id || ""))}`);
  }

  return (
    <main className="min-h-screen bg-[#efe6d8] text-[#292722]">
      <nav className="border-b border-[#d5c8b6] bg-[#f5eee4]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="font-serif text-2xl">RevScale <span className="text-[10px] font-sans font-semibold uppercase tracking-[.2em] text-[#8a714d]">PropertyOS</span></Link>
          <Link href="/demos" className="text-sm font-medium text-[#625d55]">Ver demo</Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:px-8 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#8a714d]">RevScale Network</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight">Referí una inmobiliaria que tenga el mismo problema.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#6d665d]">El programa está pensado para clientes que ya tuvieron un primer “aha” o una revisión de negocio positiva. El referido se atribuye por código y se valida antes de cualquier beneficio.</p>

          <div className="mt-8 grid gap-4">
            <Info icon={<Gift size={18}/>} title="Cliente que refiere" text="Crédito equivalente al 50% de una mensualidad después de que el referido complete su segunda mensualidad paga." />
            <Info icon={<Users size={18}/>} title="Nuevo cliente" text="Onboarding estándar bonificado o una sesión de optimización adicional." />
            <Info icon={<ShieldCheck size={18}/>} title="Reglas" text="Crédito, no cash. Sin combinar con descuentos permanentes. El referido debe ser una cuenta válida y atribuible." />
          </div>
        </div>

        <form action={submitReferral} className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6 shadow-[0_24px_70px_rgba(70,58,42,.07)] md:p-8">
          <h2 className="font-serif text-3xl">Registrar referido</h2>
          <div className="mt-7 grid gap-5">
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#71685c]">Código RevScale Network</span><input name="code" required className={inputClass} placeholder="RSN-XXXXXXXX" /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#71685c]">Nombre del contacto</span><input name="name" required minLength={2} className={inputClass} /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#71685c]">Inmobiliaria</span><input name="company" required minLength={2} className={inputClass} /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#71685c]">Email</span><input name="email" type="email" required className={inputClass} /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#71685c]">WhatsApp</span><input name="phone" className={inputClass} /></label>
          </div>
          <button className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f2b25] px-6 py-3.5 font-semibold text-[#f5eee4]">Registrar referido <ArrowUpRight size={16}/></button>
          <p className="mt-4 text-xs leading-5 text-[#81796e]">El beneficio no se activa al enviar este formulario. RevScale valida atribución, fit y pagos antes de aprobar cualquier crédito.</p>
        </form>
      </section>
    </main>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex gap-3 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-5"><div className="mt-1 text-[#806b4d]">{icon}</div><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#6d665d]">{text}</p></div></div>;
}
