import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone, UserRoundCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ValidationContactCard from "./ValidationContactCard";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  status: string;
  public_phone: string | null;
  public_email: string | null;
  whatsapp_number: string | null;
  whatsapp_quality: string;
  email_quality: string;
  decision_maker_name: string | null;
  decision_maker_quality: string;
  score_team_size: number | null;
  score_lead_volume: number | null;
  score_source_fragmentation: number | null;
  score_whatsapp_centrality: number | null;
  score_process_pain: number | null;
  score_growth_investment: number | null;
  score_decision_access: number | null;
  score_geography: number | null;
  score_signal_count: number;
};

const scoreKeys = [
  ["Equipo", "score_team_size", 20],
  ["Volumen mensual", "score_lead_volume", 20],
  ["Fuentes", "score_source_fragmentation", 15],
  ["WhatsApp diario", "score_whatsapp_centrality", 10],
  ["Dolor de seguimiento", "score_process_pain", 15],
  ["Crecimiento", "score_growth_investment", 10],
  ["Decisor", "score_decision_access", 5],
  ["Geografía", "score_geography", 5],
] as const;

export default async function ValidationQueuePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,department,status,public_phone,public_email,whatsapp_number,whatsapp_quality,email_quality,decision_maker_name,decision_maker_quality,score_team_size,score_lead_volume,score_source_fragmentation,score_whatsapp_centrality,score_process_pain,score_growth_investment,score_decision_access,score_geography,score_signal_count")
    .eq("status", "READY");

  const prospects = ((data || []) as Prospect[])
    .map((item) => {
      const verifiedFloor = scoreKeys.reduce((sum, [, key]) => sum + (item[key] ?? 0), 0);
      const pointsToA = Math.max(0, 75 - verifiedFloor);
      const missing = scoreKeys.filter(([, key]) => item[key] === null).map(([label]) => label);
      const channelScore = (item.whatsapp_quality === "VERIFIED" ? 3 : 0) + (item.email_quality === "VERIFIED" ? 2 : 0) + (item.public_phone ? 1 : 0);
      const decisionScore = item.decision_maker_quality === "VERIFIED" ? 3 : item.decision_maker_quality === "PARTIAL" ? 1 : 0;
      const priorityScore = verifiedFloor + item.score_signal_count * 4 + channelScore + decisionScore;
      return { ...item, verifiedFloor, pointsToA, missing, priorityScore };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || b.verifiedFloor - a.verifiedFloor || a.company_name.localeCompare(b.company_name));

  const top30 = prospects.slice(0, 30);
  const withDecisionMaker = top30.filter((p) => p.decision_maker_quality === "VERIFIED").length;
  const withWhatsapp = top30.filter((p) => p.whatsapp_quality === "VERIFIED").length;
  const withEmail = top30.filter((p) => p.email_quality === "VERIFIED").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/prospects/tiers" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a Tiers</Link>
          <Link href="/protected/admin/sales/prospects/scoring" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver scoring completo</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Prospecting · Paso 36</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Cola de validación Tier A</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">Prioriza las cuentas READY por evidencia pública, acceso comercial y distancia a 75 puntos. Esta vista no asigna Tier: solo ordena qué validar primero.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Top cohort" value={top30.length} detail="cuentas a validar primero" />
          <Metric label="Decisor verificado" value={withDecisionMaker} detail="en el top 30" />
          <Metric label="WhatsApp verificado" value={withWhatsapp} detail="canal disponible" />
          <Metric label="Email verificado" value={withEmail} detail="canal disponible" />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#fffaf2]">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full text-left text-sm">
              <thead className="border-b border-[#ddd1c0] bg-[#eee5d8] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756b5f]">
                <tr><th className="p-4">Prioridad</th><th className="p-4">Cuenta</th><th className="p-4">Piso público</th><th className="p-4">Faltan para A</th><th className="p-4">Cobertura</th><th className="p-4">Canal</th><th className="p-4">Qué validar primero</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e4d9ca]">
                {top30.map((item, index) => <tr key={item.id} className="align-top">
                  <td className="p-4"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#c8baa4] bg-[#f5ecdf] font-serif text-lg">{index + 1}</span></td>
                  <td className="p-4"><p className="font-semibold">{item.company_name}</p><p className="mt-1 text-xs text-[#81786d]">{item.city} · {item.department}</p>{item.decision_maker_name && <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#665b4d]"><UserRoundCheck size={13}/>{item.decision_maker_name}</p>}</td>
                  <td className="p-4"><span className="font-serif text-2xl">{item.verifiedFloor}</span><span className="text-xs text-[#81786d]"> / 100</span></td>
                  <td className="p-4"><span className="font-semibold">{item.pointsToA} pts</span></td>
                  <td className="p-4"><span className="font-semibold">{item.score_signal_count}/8</span><p className="mt-1 text-xs text-[#81786d]">{item.missing.length} señales pendientes</p></td>
                  <td className="p-4"><div className="flex flex-wrap gap-2">{item.whatsapp_quality === "VERIFIED" && <Tag icon={<MessageCircle size={12}/>} label="WA"/>}{item.email_quality === "VERIFIED" && <Tag icon={<Mail size={12}/>} label="Email"/>}{item.public_phone && <Tag icon={<Phone size={12}/>} label="Tel"/>}</div></td>
                  <td className="p-4 text-xs leading-5 text-[#665f56]"><strong>{firstValidation(item)}</strong><p className="mt-1 text-[#81786d]">Pendiente: {item.missing.join(" · ")}</p></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Paso 36 · contacto de validación</p>
          <h2 className="mt-3 font-serif text-3xl font-medium">Primer contacto preparado, envío manual</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">Estos mensajes sirven únicamente para completar señales que no pueden verificarse de forma pública. No incluyen links, brochure, precio ni pedido de demo. La pregunta cambia según la primera señal pendiente de cada cuenta y el sistema prioriza WhatsApp cuando está verificado, luego email y por último teléfono.</p>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {top30.map((item, index) => {
              const contact = buildValidationContact(item);
              return <ValidationContactCard key={item.id} priority={index + 1} companyName={item.company_name} channel={contact.channel} destination={contact.destination} subject={contact.subject} message={contact.message} followUp={contact.followUp} disabled={!contact.destination} />;
            })}
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]"><strong>Regla:</strong> esta cola sirve para investigación comercial y discovery. No convierte una cuenta en Tier A por probabilidad. El Tier sigue requiriendo las 8 señales respaldadas y score final de 75–100. El contacto de validación no inicia todavía la cadencia outbound formal.</div>
      </div>
    </main>
  );
}

function firstValidation(item: Prospect) {
  if (item.score_lead_volume === null) return "Validar volumen mensual de consultas";
  if (item.score_whatsapp_centrality === null) return "Validar si WhatsApp se usa todos los días";
  if (item.score_process_pain === null) return "Validar pérdida de seguimiento / próximos pasos";
  if (item.score_team_size === null) return "Confirmar cantidad de agentes";
  if (item.score_source_fragmentation === null) return "Confirmar fuentes activas de leads";
  if (item.score_decision_access === null) return "Confirmar acceso al decisor";
  return "Completar la señal restante";
}

function buildValidationContact(item: Prospect) {
  const firstName = item.decision_maker_name?.trim().split(/\s+/)[0] || null;
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  const question = validationQuestion(item);
  const message = `${greeting} soy de RevScale, acá en Uruguay. Estuve mirando ${item.company_name} por una investigación sobre operación comercial inmobiliaria y te hago una sola pregunta: ${question} No es una propuesta comercial; estoy validando cómo lo resuelven equipos con volumen. Si me orientás con eso, me sirve muchísimo.`;
  const followUp = validationFollowUp(item);

  if (item.whatsapp_quality === "VERIFIED" && item.whatsapp_number) {
    return { channel: "WhatsApp", destination: item.whatsapp_number, subject: null, message, followUp };
  }
  if (item.email_quality === "VERIFIED" && item.public_email) {
    return { channel: "Email", destination: item.public_email, subject: `consulta corta sobre ${item.company_name}`, message, followUp };
  }
  if (item.public_phone) {
    return { channel: "Teléfono", destination: item.public_phone, subject: null, message, followUp };
  }
  return { channel: "Sin canal", destination: null, subject: null, message, followUp };
}

function validationQuestion(item: Prospect) {
  if (item.score_lead_volume === null) return "en un mes normal, ¿están más cerca de decenas o de cientos de consultas entrantes entre portales, web y WhatsApp?";
  if (item.score_whatsapp_centrality === null) return "¿WhatsApp es hoy un canal que el equipo usa todos los días para atender y seguir oportunidades, o queda más como canal secundario?";
  if (item.score_process_pain === null) return "cuando un lead queda sin próximo paso o un seguimiento se vence, ¿el sistema lo hace visible o depende bastante de que cada agente se acuerde?";
  if (item.score_team_size === null) return "¿cuántas personas participan hoy de forma activa en ventas y seguimiento comercial?";
  if (item.score_source_fragmentation === null) return "¿las consultas les entran desde tres o más fuentes activas, por ejemplo portales, web, campañas, Instagram o WhatsApp?";
  if (item.score_decision_access === null) return "¿quién suele mirar el proceso comercial completo y decidir sobre herramientas o cambios de seguimiento?";
  if (item.score_growth_investment === null) return "¿hoy están invirtiendo activamente en portales premium, campañas o desarrollos para generar demanda?";
  if (item.score_geography === null) return "¿la operación comercial principal está concentrada en Montevideo, Maldonado o Canelones?";
  return "¿cuál es hoy la parte más difícil de controlar después de que entra una consulta?";
}

function validationFollowUp(item: Prospect) {
  if (item.score_process_pain === null) return "Gracias. Y una última: si mañana un lead con intención queda sin próximo paso, ¿alguien de dirección puede detectarlo sin revisar chat por chat?";
  if (item.score_lead_volume === null) return "Gracias. Para ubicar mejor el contexto: ¿ese volumen llega concentrado en pocos canales o repartido entre portales, web, campañas y WhatsApp?";
  if (item.score_whatsapp_centrality === null) return "Perfecto. Y cuando la conversación sigue por WhatsApp, ¿el próximo paso queda visible para el resto del equipo o vive principalmente en el chat del agente?";
  return "Gracias, con eso ya puedo ubicar mejor cómo funciona el proceso. No te saco más tiempo.";
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>; }
function Tag({ icon, label }: { icon: React.ReactNode; label: string }) { return <span className="inline-flex items-center gap-1 rounded-full border border-[#cfc4b3] bg-[#f5eee4] px-2 py-1 text-[10px] font-semibold text-[#685e51]">{icon}{label}</span>; }
