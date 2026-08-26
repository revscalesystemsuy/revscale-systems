import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, FileWarning, ShieldCheck, Zap } from "lucide-react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { toggleLegalAutomationRule, updateLegalAutomationTiming } from "./actions";

type Rule = { id:string; name:string; description:string|null; trigger_type:string; condition_json:Record<string,number>|null; enabled:boolean };
type Run = { id:string; summary:string; entity_type:string; entity_id:string; created_at:string; automation_rules:{name:string}|{name:string}[]|null };

const COPY: Record<string,{when:string;action:string}> = {
  LEGAL_REVIEW_PENDING:{when:"un documento requiere revisión y sigue pendiente","action":"escalar a Dirección y Gerencia"},
  LEGAL_SIGNATURE_PENDING:{when:"un documento enviado sigue sin firma","action":"avisar al responsable y a gestión"},
  LEGAL_DOCUMENT_EXPIRING:{when:"un documento se acerca a su vencimiento","action":"anticipar el riesgo antes de vencer"},
  LEGAL_RESERVATION_DOCUMENT_MISSING:{when:"una oportunidad queda en Reserva sin documento vinculado","action":"marcar el expediente como incompleto y escalar"},
};

export default async function LegalAutomationsPage(){
  const context=await getCurrentOrganizationContext();
  if(!context) redirect("/auth/login");
  if(context.role!=="OWNER") redirect("/protected");
  if(!planHasFeature(context.plan,"legal_automations")) return <UpgradePlanGate title="Control legal" description="El monitoreo automático de expedientes, firmas y vencimientos está disponible en Enterprise." requiredPlan="Enterprise" />;

  const [rulesResult,runsResult,reviewResult,signatureResult,expiringResult,reservationResult]=await Promise.all([
    context.supabase.from("automation_rules").select("id,name,description,trigger_type,condition_json,enabled").eq("organization_id",context.organizationId).like("trigger_type","LEGAL_%").order("created_at"),
    context.supabase.from("automation_runs").select("id,summary,entity_type,entity_id,created_at,automation_rules!inner(name,trigger_type)").eq("organization_id",context.organizationId).like("automation_rules.trigger_type","LEGAL_%").order("created_at",{ascending:false}).limit(12),
    context.supabase.from("documents").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).eq("legal_review_required",true).eq("legal_review_status","PENDING").in("status",["DRAFT","GENERATED"]),
    context.supabase.from("documents").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).in("status",["SENT","VIEWED"]),
    context.supabase.from("documents").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).in("status",["SENT","VIEWED"]).not("expires_at","is",null).lte("expires_at",new Date(Date.now()+3*86400000).toISOString()),
    context.supabase.from("leads").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).eq("pipeline_stage","RESERVED"),
  ]);
  const rules=(rulesResult.data||[]) as Rule[];
  const runs=(runsResult.data||[]) as Run[];
  const enabled=rules.filter(r=>r.enabled).length;

  return <main className="min-h-screen p-6 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Enterprise · expediente vigilado</p><h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Control legal</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">RevScale detecta revisiones pendientes, firmas demoradas, vencimientos y reservas sin expediente antes de que se conviertan en un problema operativo.</p></div><div className="rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]"><Zap size={16} className="mr-2 inline"/><b>Motor activo</b> · cada 15 minutos</div></div>

    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<ShieldCheck size={18}/>} label="Reglas activas" value={`${enabled}/${rules.length}`}/><Metric icon={<FileWarning size={18}/>} label="Revisión pendiente" value={String(reviewResult.count||0)}/><Metric icon={<Clock3 size={18}/>} label="Esperando firma" value={String(signatureResult.count||0)}/><Metric icon={<AlertTriangle size={18}/>} label="Vencen pronto" value={String(expiringResult.count||0)}/></section>

    <section className="mt-8 grid gap-4 xl:grid-cols-2">{rules.map(rule=><RuleCard key={rule.id} rule={rule}/>)}</section>

    <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_.7fr]"><div className="overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]"><div className="border-b border-[#ddd1c0] px-6 py-4"><h2 className="font-serif text-2xl text-[#302d28]">Historial legal automático</h2><p className="mt-1 text-xs text-[#81796e]">Cada alerta queda registrada con entidad y momento de ejecución.</p></div>{runs.length?runs.map(run=>{const rel=Array.isArray(run.automation_rules)?run.automation_rules[0]:run.automation_rules;return <div key={run.id} className="border-b border-[#e2d7c8] px-6 py-4 last:border-0"><p className="font-semibold text-[#474038]">{rel?.name||"Control legal"}</p><p className="mt-1 text-sm text-[#71695f]">{run.summary}</p><p className="mt-2 text-xs text-[#8a8176]">{formatDate(run.created_at)}</p></div>}):<div className="px-6 py-12 text-center text-sm text-[#81796e]">Todavía no hubo alertas legales automáticas.</div>}</div>
    <aside className="space-y-5"><div className="rounded-2xl border border-[#c8b58d] bg-[#eee5ce] p-6"><div className="flex items-center gap-2 text-[#765f43]"><ShieldCheck size={19}/><p className="text-[10px] font-semibold uppercase tracking-[.16em]">Guardrail profesional</p></div><h2 className="mt-3 font-serif text-2xl text-[#302d28]">Controla el flujo. No reemplaza al profesional.</h2><p className="mt-3 text-sm leading-6 text-[#665e54]">RevScale supervisa evidencia, estados, revisiones y vencimientos. No declara por sí mismo la validez jurídica del negocio ni sustituye la intervención de abogado o escribano cuando corresponda.</p></div><div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8d7553]">Expedientes en Reserva</p><p className="mt-3 font-serif text-4xl text-[#302d28]">{reservationResult.count||0}</p><p className="mt-2 text-xs leading-5 text-[#81796e]">El motor verifica que cada Reserva tenga un documento de reserva vigente vinculado.</p><Link href="/protected/documents" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6d5b43] hover:underline">Abrir Documentos →</Link></div></aside></section>
  </div></main>;
}

function RuleCard({rule}:{rule:Rule}){const timing=getTiming(rule);const copy=COPY[rule.trigger_type];return <article className={`rounded-2xl border p-5 ${rule.enabled?"border-[#c9b99f] bg-[#f7f0e6]":"border-[#d8cdbd] bg-[#eee6db] opacity-75"}`}><div className="flex items-start justify-between gap-4"><div><h3 className="font-serif text-xl text-[#37312a]">{rule.name}</h3><p className="mt-1 text-xs leading-5 text-[#81796e]">{rule.description}</p></div><form action={toggleLegalAutomationRule}><input type="hidden" name="id" value={rule.id}/><input type="hidden" name="trigger_type" value={rule.trigger_type}/><input type="hidden" name="enabled" value={rule.enabled?"false":"true"}/><button className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${rule.enabled?"border-[#b7bea8] bg-[#e7eadf] text-[#596146]":"border-[#cfc2b1] bg-[#f3ece2] text-[#7a7167]"}`}>{rule.enabled?"Activa":"Pausada"}</button></form></div><div className="mt-5 rounded-xl border border-[#ded2c1] bg-[#fffaf2] p-4 text-sm leading-6 text-[#514a41]"><b className="text-[#795f3e]">Cuando</b> {copy?.when}<span className="mx-2 text-[#a08f79]">→</span><b className="text-[#795f3e]">hacer</b> {copy?.action}.</div>{timing&&<form action={updateLegalAutomationTiming} className="mt-4 flex flex-wrap items-center gap-3"><input type="hidden" name="id" value={rule.id}/><input type="hidden" name="trigger_type" value={rule.trigger_type}/><label className="text-xs font-semibold uppercase tracking-[.12em] text-[#81796e]">{timing.label}</label><select name="value" defaultValue={timing.value} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2 text-sm text-[#4f473d]">{timing.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select><button className="rounded-lg border border-[#bfae94] bg-[#eee4d5] px-3 py-2 text-xs font-semibold text-[#62533f]">Guardar plazo</button></form>}</article>}
function getTiming(rule:Rule){if(rule.trigger_type==="LEGAL_REVIEW_PENDING")return{label:"Escalar después de",value:rule.condition_json?.hours||24,options:[{value:12,label:"12 horas"},{value:24,label:"24 horas"},{value:48,label:"48 horas"}]};if(rule.trigger_type==="LEGAL_SIGNATURE_PENDING")return{label:"Recordar después de",value:rule.condition_json?.hours||48,options:[{value:24,label:"24 horas"},{value:48,label:"48 horas"},{value:72,label:"72 horas"}]};if(rule.trigger_type==="LEGAL_DOCUMENT_EXPIRING")return{label:"Avisar con",value:rule.condition_json?.days||2,options:[{value:1,label:"1 día"},{value:2,label:"2 días"},{value:3,label:"3 días"},{value:7,label:"7 días"}]};if(rule.trigger_type==="LEGAL_RESERVATION_DOCUMENT_MISSING")return{label:"Tolerancia",value:rule.condition_json?.hours||2,options:[{value:1,label:"1 hora"},{value:2,label:"2 horas"},{value:4,label:"4 horas"},{value:8,label:"8 horas"}]};return null}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl text-[#302d28]">{value}</p></div>}
function formatDate(value:string){return new Intl.DateTimeFormat("es-UY",{timeZone:"America/Montevideo",dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}
