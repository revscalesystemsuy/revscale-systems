import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSignature,
  FileText,
  LockKeyhole,
  PenLine,
  Plus,
  ShieldCheck,
} from "lucide-react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { configureSignatureProvider, createDocument, saveTemplate, toggleTemplate } from "./actions";

type Template = {
  id: string;
  name: string;
  document_type: string;
  body: string;
  version: number;
  is_active: boolean;
  requires_legal_review: boolean;
};

type DocumentRow = {
  id: string;
  reference_code: string;
  title: string;
  document_type: string;
  status: string;
  legal_review_required: boolean;
  legal_review_status: string;
  signature_provider: string;
  lead_id: string | null;
  property_id: string | null;
  created_at: string;
  updated_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  RESERVATION: "Reserva / intención",
  PURCHASE_OFFER: "Oferta de compra",
  RENTAL_APPLICATION: "Solicitud de alquiler",
  LEASE: "Arrendamiento",
  SALE_AGREEMENT: "Compraventa",
  CUSTOM: "Personalizado",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  GENERATED: "Generado",
  SENT: "Enviado",
  VIEWED: "Visto",
  SIGNED: "Firmado",
  DECLINED: "Rechazado",
  VOIDED: "Anulado",
  EXPIRED: "Vencido",
};

export default async function DocumentsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "documents")) {
    return <UpgradePlanGate title="Documentos y contratos" description="Generá documentos desde el CRM, usá plantillas, archivá archivos privados y mantené una trazabilidad auditable de cada operación." requiredPlan="Professional" />;
  }

  const orgId = context.organizationId;
  const isManagement = context.role === "OWNER" || context.role === "MANAGER";
  const isOwner = context.role === "OWNER";
  const enterpriseSignature = planHasFeature(context.plan, "esignature");

  const [documentsResult, templatesResult, leadsResult, propertiesResult, providerResult] = await Promise.all([
    context.supabase
      .from("documents")
      .select("id,reference_code,title,document_type,status,legal_review_required,legal_review_status,signature_provider,lead_id,property_id,created_at,updated_at")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(100),
    context.supabase
      .from("document_templates")
      .select("id,name,document_type,body,version,is_active,requires_legal_review")
      .eq("organization_id", orgId)
      .order("name"),
    context.supabase
      .from("leads")
      .select("id,full_name,phone,email,pipeline_stage")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(150),
    context.supabase
      .from("properties")
      .select("id,title,zone,operation,status")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(150),
    isOwner && enterpriseSignature
      ? context.supabase.from("signature_provider_settings").select("provider,integration_status,account_label,external_account_id,last_health_check_at,last_error").eq("organization_id", orgId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const documents = (documentsResult.data || []) as DocumentRow[];
  const templates = (templatesResult.data || []) as Template[];
  const leads = leadsResult.data || [];
  const properties = propertiesResult.data || [];
  const leadNameById = new Map(leads.map((lead) => [lead.id, lead.full_name || "Lead sin nombre"]));
  const propertyNameById = new Map(properties.map((property) => [property.id, property.title || "Propiedad"]));
  const pendingReview = documents.filter((item) => item.legal_review_required && item.legal_review_status === "PENDING").length;
  const waitingSignature = documents.filter((item) => item.status === "SENT" || item.status === "VIEWED").length;
  const signed = documents.filter((item) => item.status === "SIGNED").length;
  const loadError = documentsResult.error || templatesResult.error || leadsResult.error || propertiesResult.error || providerResult.error;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Operación documental · {context.role === "AGENT" ? "Agente" : "Gestión"}</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Documentos</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">Generá reservas, ofertas, solicitudes y contratos desde los datos que ya existen en RevScale. Cada versión queda vinculada al lead y la propiedad, con archivo privado, hash de integridad y trazabilidad.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]"><ShieldCheck size={17} strokeWidth={1.7} /><span><b>Archivo privado</b> · acceso por organización</span></div>
        </div>

        {loadError && <div className="mt-6 rounded-xl border border-[#d3b7ae] bg-[#f1dfd8] p-4 text-sm text-[#704b3d]">No se pudo cargar una parte del módulo documental.</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<FileText size={18} strokeWidth={1.7} />} label="Documentos" value={String(documents.length)} />
          <Metric icon={<Clock3 size={18} strokeWidth={1.7} />} label="Revisión pendiente" value={String(pendingReview)} />
          <Metric icon={<FileSignature size={18} strokeWidth={1.7} />} label="Esperando firma" value={String(waitingSignature)} />
          <Metric icon={<CheckCircle2 size={18} strokeWidth={1.7} />} label="Firmados" value={String(signed)} />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#e9dece] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-[#cbbda7] bg-[#f7f0e6] p-2 text-[#765f43]"><Plus size={18} strokeWidth={1.7} /></div>
              <div><h2 className="font-serif text-2xl font-medium text-[#302d28]">Generar documento</h2><p className="mt-1 text-sm leading-6 text-[#6f675d]">RevScale completa automáticamente datos del cliente y de la propiedad.</p></div>
            </div>
            <form action={createDocument} className="mt-6 space-y-4">
              <Field label="Plantilla">
                <select name="template_id" required className={inputClass} defaultValue="">
                  <option value="" disabled>Elegir plantilla</option>
                  {templates.filter((template) => template.is_active).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </Field>
              <Field label="Lead / cliente">
                <select name="lead_id" className={inputClass} defaultValue="">
                  <option value="">Sin lead asociado</option>
                  {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.full_name || "Lead sin nombre"}{lead.phone ? ` · ${lead.phone}` : ""}</option>)}
                </select>
              </Field>
              <Field label="Propiedad">
                <select name="property_id" className={inputClass} defaultValue="">
                  <option value="">Sin propiedad asociada</option>
                  {properties.map((property) => <option key={property.id} value={property.id}>{property.title}{property.zone ? ` · ${property.zone}` : ""}</option>)}
                </select>
              </Field>
              <Field label="Condiciones / observaciones">
                <textarea name="notes" rows={5} maxLength={4000} className={`${inputClass} resize-none`} placeholder="Importe de reserva, plazo, condiciones particulares, garantías, observaciones..." />
              </Field>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2]"><FileCheck2 size={16} /> Generar documento</button>
            </form>
            <div className="mt-5 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-4 text-xs leading-5 text-[#756d63]"><b className="text-[#4d463d]">Variables CRM:</b> nombre, teléfono y email del lead; título, dirección, zona, moneda y precio de la propiedad; fecha e inmobiliaria. El contenido generado queda congelado como snapshot para auditoría.</div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
            <div className="border-b border-[#ddd1c0] px-5 py-4 md:px-6"><h2 className="font-serif text-2xl font-medium text-[#302d28]">Expediente documental</h2><p className="mt-1 text-xs leading-5 text-[#81796e]">Últimos documentos de la inmobiliaria. Cada documento conserva su código, estado, revisión y vínculo comercial.</p></div>
            <div className="divide-y divide-[#e2d7c8]">
              {documents.map((document) => (
                <Link key={document.id} href={`/protected/documents/${document.id}`} className="block px-5 py-4 transition hover:bg-[#f1e8dc] md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d7553]">{document.reference_code}</span><Status value={document.status} /></div>
                      <p className="mt-2 truncate font-semibold text-[#3f3932]">{document.title}</p>
                      <p className="mt-1 text-xs text-[#81796e]">{TYPE_LABELS[document.document_type] || document.document_type}{document.lead_id ? ` · ${leadNameById.get(document.lead_id) || "Lead"}` : ""}{document.property_id ? ` · ${propertyNameById.get(document.property_id) || "Propiedad"}` : ""}</p>
                    </div>
                    <div className="text-right"><ReviewBadge required={document.legal_review_required} status={document.legal_review_status} /><p className="mt-2 text-[11px] text-[#8a8176]">{formatDate(document.updated_at)}</p></div>
                  </div>
                </Link>
              ))}
              {!documents.length && <div className="px-6 py-16 text-center"><FileText size={32} strokeWidth={1.4} className="mx-auto text-[#9a8566]" /><p className="mt-4 font-serif text-2xl text-[#474038]">Todavía no hay documentos.</p><p className="mt-2 text-sm text-[#81796e]">Generá el primero desde una plantilla y quedará registrado acá.</p></div>}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Biblioteca</p><h2 className="mt-2 font-serif text-2xl font-medium text-[#302d28]">Plantillas documentales</h2><p className="mt-2 text-sm leading-6 text-[#756d63]">Las plantillas base están pensadas como documentos operativos y señalan cuándo corresponde revisión jurídica o notarial.</p></div>
              <span className="rounded-full border border-[#d2c5b3] bg-[#eee5d8] px-3 py-1 text-xs font-semibold text-[#6c604f]">{templates.length} plantillas</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {templates.map((template) => <div key={template.id} className="rounded-xl border border-[#ded2c1] bg-[#fffaf2] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#474038]">{template.name}</p><p className="mt-1 text-xs text-[#81796e]">{TYPE_LABELS[template.document_type] || template.document_type} · v{template.version}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${template.is_active ? "border-[#b9c1aa] bg-[#e8ebdf] text-[#586146]" : "border-[#d4c8b8] bg-[#f0e8de] text-[#7c7267]"}`}>{template.is_active ? "Activa" : "Pausada"}</span></div><p className="mt-3 text-xs leading-5 text-[#766e64]">{template.requires_legal_review ? "Requiere aprobación antes de envío/firma." : "Uso operativo sin revisión obligatoria configurada."}</p>{isManagement && <form action={toggleTemplate} className="mt-3"><input type="hidden" name="template_id" value={template.id} /><input type="hidden" name="active" value={template.is_active ? "false" : "true"} /><button className="text-xs font-semibold text-[#765f43] underline-offset-4 hover:underline">{template.is_active ? "Pausar plantilla" : "Activar plantilla"}</button></form>}</div>)}
            </div>

            {isManagement && <details className="mt-6 rounded-xl border border-[#d2c5b3] bg-[#eee5d8] p-5"><summary className="cursor-pointer font-semibold text-[#4d453c]">Crear plantilla personalizada</summary><form action={saveTemplate} className="mt-5 space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Nombre"><input name="name" required maxLength={120} className={inputClass} placeholder="Promesa de compraventa · revisión" /></Field><Field label="Tipo"><select name="document_type" className={inputClass} defaultValue="CUSTOM">{Object.entries(TYPE_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field></div><Field label="Contenido"><textarea name="body" required rows={12} maxLength={50000} className={`${inputClass} resize-y font-mono text-xs`} placeholder={"Fecha: {{today}}\nCliente: {{lead.full_name}}\nPropiedad: {{property.title}}"} /></Field><label className="flex items-center gap-2 text-sm text-[#5f574e]"><input type="checkbox" name="requires_legal_review" defaultChecked /> Requiere aprobación antes de envío o firma</label><button className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2]"><PenLine size={15} /> Guardar plantilla</button></form></details>}
          </div>

          <div className="rounded-2xl border border-[#cdbfa9] bg-[#e9dece] p-6">
            <div className="flex items-center gap-2 text-[#765f43]"><FileSignature size={19} strokeWidth={1.7} /><p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Firma electrónica</p></div>
            <h2 className="mt-3 font-serif text-3xl font-medium text-[#302d28]">Firma y evidencia, sin zonas grises.</h2>
            <p className="mt-3 text-sm leading-6 text-[#665e54]">Professional permite registrar una firma externa y guardar el PDF firmado. Enterprise prepara conexión con proveedores de firma electrónica avanzada y conserva identificadores, estado y eventos del proveedor.</p>

            {enterpriseSignature ? <div className="mt-5 rounded-xl border border-[#c9baa4] bg-[#f7f0e6] p-5">
              <div className="flex items-center justify-between gap-3"><p className="font-semibold text-[#443d35]">Conector Enterprise</p><span className="rounded-full border border-[#cdbfa9] bg-[#eee5d8] px-3 py-1 text-[10px] font-semibold uppercase text-[#765f43]">{providerResult.data?.integration_status || "No configurado"}</span></div>
              <p className="mt-2 text-xs leading-5 text-[#766e64]">Se contemplan TuID y Abitab como proveedores. RevScale no guarda claves privadas ni credenciales de firma en estas tablas.</p>
              {isOwner && <form action={configureSignatureProvider} className="mt-5 space-y-3"><select name="provider" className={inputClass} defaultValue={providerResult.data?.provider || "TUID"}><option value="TUID">Antel TuID</option><option value="ABITAB">Abitab ID Digital</option></select><input name="account_label" maxLength={120} className={inputClass} defaultValue={providerResult.data?.account_label || ""} placeholder="Nombre de cuenta / convenio" /><input name="external_account_id" maxLength={200} className={inputClass} defaultValue={providerResult.data?.external_account_id || ""} placeholder="Identificador de cuenta (si el proveedor lo entrega)" /><button className="w-full rounded-lg border border-[#a99475] bg-[#302d28] px-4 py-3 text-sm font-semibold text-[#fffaf2]">Preparar integración</button></form>}
              <p className="mt-4 text-[11px] leading-5 text-[#82796e]">La activación técnica final requiere credenciales/convenio del proveedor. Hasta entonces el estado permanece pendiente; RevScale no simula un envío que no ocurrió.</p>
            </div> : <div className="mt-5 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#6a604f]"><LockKeyhole size={16} /><b className="text-sm">Firma avanzada integrada · Enterprise</b></div><p className="mt-2 text-xs leading-5 text-[#7a7167]">En Professional seguís teniendo archivo privado, seguimiento y registro de firma externa. Enterprise agrega el adaptador de proveedor acreditado.</p></div>}

            <div className="mt-5 rounded-xl border border-[#d3c6b4] bg-[#f3ebe0] p-4 text-xs leading-5 text-[#6f675d]"><b className="text-[#4a433a]">Criterio legal:</b> RevScale organiza el proceso y la evidencia, pero no reemplaza la actuación de escribano, abogado u otro profesional cuando el tipo de acto o las partes lo requieran.</div>
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass = "w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#39342e] outline-none transition focus:border-[#8d7553]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-[#665e54]"><span className="mb-2 block">{label}</span>{children}</label>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div><p className="mt-3 font-serif text-3xl font-medium text-[#302d28]">{value}</p></div>; }
function Status({ value }: { value: string }) { const cls = value === "SIGNED" ? "border-[#b8c1a4] bg-[#e7eadf] text-[#596146]" : value === "SENT" || value === "VIEWED" ? "border-[#c8b58d] bg-[#eee5ce] text-[#735f34]" : value === "DECLINED" || value === "VOIDED" ? "border-[#d2b9ae] bg-[#f0dfd8] text-[#785144]" : "border-[#cfc2b1] bg-[#f3ece2] text-[#756b61]"; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{STATUS_LABELS[value] || value}</span>; }
function ReviewBadge({ required, status }: { required: boolean; status: string }) { if (!required || status === "NOT_REQUIRED") return <span className="text-[10px] font-semibold uppercase tracking-wide text-[#81796e]">Sin revisión obligatoria</span>; if (status === "APPROVED") return <span className="text-[10px] font-semibold uppercase tracking-wide text-[#596146]">Revisión aprobada</span>; return <span className="text-[10px] font-semibold uppercase tracking-wide text-[#846a42]">Revisión pendiente</span>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value)); }
