import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin, ShieldCheck, Target, UsersRound, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const scoring = [
  { signal: "Tamaño del equipo", weight: 20, rule: "5–20 agentes = 20 · 2–4 = 10 · >20 = 15 · 1 = 5", ideal: "5–20 agentes" },
  { signal: "Volumen de consultas", weight: 20, rule: "150+ / mes = 20 · 75–149 = 12 · 30–74 = 6 · <30 = 2", ideal: "150–1.500+ consultas/mes" },
  { signal: "Fragmentación de fuentes", weight: 15, rule: "2+ fuentes activas = 15 · 1 fuente = 5", ideal: "2+ fuentes de leads" },
  { signal: "WhatsApp en la operación", weight: 10, rule: "Uso diario = 10 · no diario = 0", ideal: "WhatsApp diario" },
  { signal: "Dolor de seguimiento", weight: 15, rule: "Dolor visible = 15 · no visible = 0", ideal: "Leads, SLA o próximos pasos se pierden" },
  { signal: "Inversión / crecimiento", weight: 10, rule: "Invierte en captación, portales o crecimiento = 10 · no = 0", ideal: "Adquisición activa" },
  { signal: "Acceso a decisión", weight: 5, rule: "Owner / director / manager accesible = 5 · no = 0", ideal: "Contacto con decisor" },
  { signal: "Geografía prioritaria", weight: 5, rule: "Montevideo, Maldonado/Punta del Este o Canelones/Ciudad de la Costa = 5 · otra = 0", ideal: "Uruguay prioritario" },
] as const;

const tiers = [
  { tier: "A", range: "75–100", action: "Prospectar primero. Personalización alta y contacto founder-led." },
  { tier: "B", range: "60–74", action: "Prospectar después de Tier A. Validar señales faltantes antes de demo." },
  { tier: "C", range: "45–59", action: "Mantener en base secundaria. Contacto selectivo o inbound." },
  { tier: "LOW", range: "0–44", action: "No dedicar outbound activo salvo señal excepcional o inbound." },
] as const;

const mustHave = [
  "Empresa inmobiliaria real con operación comercial activa.",
  "Equipo con leads entrantes y necesidad de seguimiento comercial.",
  "Al menos una persona responsable de decidir o influir sobre proceso, software o ventas.",
  "Datos suficientes para completar el scoring antes de priorizar outbound.",
];

const exclude = [
  "Agente individual sin volumen ni intención de construir equipo.",
  "Empresa sin captación activa o sin flujo de consultas.",
  "Prospecto puramente tecnológico sin operación inmobiliaria.",
  "Cuenta con score <45 sin una señal comercial extraordinaria.",
];

export default async function ExactIcpPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
          <span className="rounded-full border border-[#c7b89f] bg-[#fffaf2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#765f43]">ICP v1 · Uruguay</span>
        </div>

        <section className="mt-7 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d2c4b0] bg-[#efe5d6] text-[#806b4d]"><Target size={19} strokeWidth={1.6}/></div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 27 · Criterios exactos de ICP</p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-medium tracking-tight md:text-5xl">Quién merece tiempo comercial primero.</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-[#625d55]">RevScale prioriza inmobiliarias donde perder una oportunidad tiene costo operativo real: volumen de consultas, varios canales, WhatsApp diario, dolor de seguimiento y acceso a decisión. El score ordena prospección; no pretende predecir ingresos.</p>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]"><CheckCircle2 size={14}/> Debe existir</p>
            <div className="mt-4 space-y-3">{mustHave.map((item) => <Rule key={item} positive text={item}/>)}</div>
          </div>
          <div className="rounded-2xl border border-[#d5bcb0] bg-[#f3e7df] p-6">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b5f51]"><XCircle size={14}/> No priorizar outbound</p>
            <div className="mt-4 space-y-3">{exclude.map((item) => <Rule key={item} text={item}/>)}</div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Scoring 0–100</p><h2 className="mt-2 font-serif text-3xl">Ocho señales, un solo orden de prioridad.</h2></div><div className="flex items-center gap-2 text-xs text-[#746c62]"><UsersRound size={15}/> ICP #1: equipos inmobiliarios</div></div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-[#d8cbb8] text-[10px] uppercase tracking-[0.13em] text-[#81796e]"><th className="px-3 py-3">Señal</th><th className="px-3 py-3">Peso</th><th className="px-3 py-3">Regla exacta</th><th className="px-3 py-3">Perfil ideal</th></tr></thead>
              <tbody>{scoring.map((row) => <tr key={row.signal} className="border-b border-[#e2d8ca] align-top"><td className="px-3 py-4 font-semibold text-[#403b34]">{row.signal}</td><td className="px-3 py-4 font-serif text-xl text-[#66543f]">{row.weight}</td><td className="px-3 py-4 leading-6 text-[#625d55]">{row.rule}</td><td className="px-3 py-4 leading-6 text-[#625d55]">{row.ideal}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#81786d]">La suma máxima es 100. El scoring usado en prospección debe coincidir con las mismas señales que ya guarda el pipeline B2B.</p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((item) => <div key={item.tier} className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center justify-between gap-3"><span className="font-serif text-3xl">{item.tier}</span><span className="rounded-full border border-[#ccbda7] bg-[#fffaf2] px-2.5 py-1 text-[10px] font-semibold text-[#6b5a44]">{item.range}</span></div><p className="mt-4 text-xs leading-5 text-[#625d55]">{item.action}</p></div>)}
        </section>

        <section className="mt-6 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-6 md:p-8">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d6a50]"><MapPin size={14}/> Geografía inicial</p>
          <h2 className="mt-2 font-serif text-2xl">Montevideo → Maldonado/Punta del Este → Canelones/Ciudad de la Costa.</h2>
          <p className="mt-3 text-sm leading-6 text-[#625d55]">Uruguay funciona como laboratorio comercial inicial. No expandimos simultáneamente a otros países mientras todavía estamos construyendo evidencia de respuesta, demo→pilot, pilot→pago y activación.</p>
          <div className="mt-5 flex gap-3 rounded-xl border border-[#d4c5b1] bg-[#fffaf2] p-4 text-sm leading-6 text-[#625d55]"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#806b4d]" strokeWidth={1.6}/><span><strong>Regla:</strong> ninguna cuenta entra a la lista Tier A/B sin suficiente evidencia para justificar el score. Si faltan datos, queda UNSCORED y se enriquece antes de priorizarla.</span></div>
        </section>
      </div>
    </main>
  );
}

function Rule({ text, positive=false }: { text: string; positive?: boolean }) {
  return <div className="flex gap-3 rounded-xl border border-[#d8cbb8] bg-[#fffaf2] p-4 text-sm leading-6 text-[#625d55]">{positive ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#6f785e]"/> : <XCircle className="mt-1 h-4 w-4 shrink-0 text-[#8b6659]"/>}<span>{text}</span></div>;
}
