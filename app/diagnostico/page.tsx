import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DiagnosticResult = {
  id?: string;
  score?: number;
  tier?: string;
  recommendation?: string;
};

const inputClass = "w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3 text-sm text-[#292722] outline-none placeholder:text-[#8a8379] focus:border-[#8a714d]";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#71685c]";

export default function DiagnosticPage() {
  async function submitDiagnostic(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const numberValue = (key: string) => Number.parseInt(String(formData.get(key) || "0"), 10);

    const { data, error } = await supabase.rpc("submit_commercial_diagnostic", {
      p_name: String(formData.get("name") || "").trim(),
      p_company: String(formData.get("company") || "").trim(),
      p_email: String(formData.get("email") || "").trim().toLowerCase(),
      p_phone: String(formData.get("phone") || "").trim(),
      p_role: String(formData.get("role") || "OTHER"),
      p_location: String(formData.get("location") || "OTHER"),
      p_team_size: numberValue("team_size"),
      p_monthly_inquiries: numberValue("monthly_inquiries"),
      p_property_count: numberValue("property_count"),
      p_lead_sources: numberValue("lead_sources"),
      p_whatsapp_daily: formData.get("whatsapp_daily") === "on",
      p_followup_pain: formData.get("followup_pain") === "on",
      p_growth_investment: formData.get("growth_investment") === "on",
    });

    if (error) throw new Error("No pudimos procesar el diagnóstico. Revisá los datos e intentá nuevamente.");

    const result = (data || {}) as DiagnosticResult;
    const score = Number(result.score);
    const tier = String(result.tier || "LOW");
    const recommendation = String(result.recommendation || "DEMO_FIRST");

    if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error("El diagnóstico devolvió un resultado inválido.");

    redirect(`/diagnostico/resultado?score=${encodeURIComponent(String(score))}&tier=${encodeURIComponent(tier)}&recommendation=${encodeURIComponent(recommendation)}`);
  }

  return (
    <main className="min-h-screen bg-[#efe6d8] text-[#292722]">
      <nav className="border-b border-[#d5c8b6] bg-[#f5eee4]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-tight">RevScale</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
          </Link>
          <Link href="/demos" className="text-sm font-medium text-[#625d55] transition hover:text-[#2d2923]">Ver cómo funciona</Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-14 md:px-8 lg:grid-cols-[.82fr_1.18fr] lg:py-20">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d2c4b0] bg-[#f7f1e8] text-[#806b4d]">
            <ClipboardCheck size={19} strokeWidth={1.6} />
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a714d]">Diagnóstico comercial · 2 minutos</p>
          <h1 className="mt-4 font-serif text-5xl font-medium leading-[1.04] tracking-tight text-[#29251f]">¿Qué pasó con tus últimos 100 leads?</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#6d665d]">Evaluamos señales simples de tu operación para detectar si el problema está en volumen, fragmentación, seguimiento o visibilidad comercial. Al final recibís un score de fit y el siguiente paso recomendado.</p>

          <div className="mt-8 space-y-4 rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6">
            {[
              "No es un benchmark público ni una promesa de resultados.",
              "El score mide encaje operativo con el problema que RevScale resuelve.",
              "Tus respuestas se guardan como diagnóstico comercial, separadas del checkout.",
            ].map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-[#625d55]">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#806b4d]" strokeWidth={1.6} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <form action={submitDiagnostic} className="rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-6 shadow-[0_24px_70px_rgba(70,58,42,.07)] md:p-8">
          <div className="border-b border-[#ddd1c1] pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a714d]">Tu operación</p>
            <h2 className="mt-3 font-serif text-3xl text-[#302b25]">Necesitamos señales, no un formulario eterno.</h2>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <label><span className={labelClass}>Nombre</span><input name="name" required minLength={2} maxLength={120} className={inputClass} placeholder="Tu nombre" /></label>
            <label><span className={labelClass}>Inmobiliaria</span><input name="company" required minLength={2} maxLength={160} className={inputClass} placeholder="Nombre de la empresa" /></label>
            <label><span className={labelClass}>Email</span><input name="email" type="email" required maxLength={320} className={inputClass} placeholder="nombre@empresa.com" /></label>
            <label><span className={labelClass}>WhatsApp</span><input name="phone" maxLength={50} className={inputClass} placeholder="Opcional" /></label>

            <label><span className={labelClass}>Tu rol</span><select name="role" required className={inputClass} defaultValue="OWNER"><option value="OWNER">Owner / Director</option><option value="MANAGER">Manager</option><option value="AGENT">Agente</option><option value="OTHER">Otro</option></select></label>
            <label><span className={labelClass}>Mercado principal</span><select name="location" required className={inputClass} defaultValue="MONTEVIDEO"><option value="MONTEVIDEO">Montevideo</option><option value="MALDONADO">Maldonado / Punta del Este</option><option value="CANELONES">Canelones / Ciudad de la Costa</option><option value="OTHER">Otro</option></select></label>

            <label><span className={labelClass}>Personas en el equipo comercial</span><input name="team_size" type="number" required min={1} max={500} defaultValue={5} className={inputClass} /></label>
            <label><span className={labelClass}>Consultas por mes</span><input name="monthly_inquiries" type="number" required min={0} max={1000000} defaultValue={150} className={inputClass} /></label>
            <label><span className={labelClass}>Propiedades en cartera</span><input name="property_count" type="number" required min={0} max={10000000} defaultValue={100} className={inputClass} /></label>
            <label><span className={labelClass}>Fuentes de leads activas</span><input name="lead_sources" type="number" required min={1} max={100} defaultValue={2} className={inputClass} /></label>
          </div>

          <div className="mt-7 space-y-3 border-t border-[#ddd1c1] pt-6">
            <Check name="whatsapp_daily" label="WhatsApp es un canal de trabajo diario para el equipo." />
            <Check name="followup_pain" label="Hoy se pierden seguimientos, reasignaciones o próximos pasos." />
            <Check name="growth_investment" label="La inmobiliaria está invirtiendo en captación, portales o crecimiento." />
          </div>

          <button className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f2b25] px-6 py-3.5 font-semibold text-[#f5eee4] transition hover:bg-[#1f1c18]">
            Ver mi diagnóstico <ArrowUpRight size={16} />
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-[#81796e]">El resultado sirve para priorizar el siguiente paso comercial; no representa una garantía de conversión o ingresos.</p>
        </form>
      </section>
    </main>
  );
}

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-[#ddd1c1] bg-[#efe6d8] p-4 text-sm leading-6 text-[#5f5951]">
      <input type="checkbox" name={name} className="mt-1 h-4 w-4 accent-[#6f604b]" />
      <span className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#806b4d]" strokeWidth={1.6} />{label}</span>
    </label>
  );
}
