import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  History,
  Send,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import UpgradePlanGate from "@/components/UpgradePlanGate";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import {
  approveLegalReview,
  downloadDocumentFile,
  updateDocumentStatus,
  uploadDocumentFile,
  uploadSignedDocumentFile,
} from "../actions";

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
const EVENT_LABELS: Record<string, string> = {
  CREATED: "Documento creado",
  GENERATED: "Contenido generado",
  SENT: "Documento enviado",
  VIEWED: "Documento visto",
  SIGNED: "Firma registrada",
  DECLINED: "Firma rechazada",
  VOIDED: "Documento anulado",
  EXPIRED: "Documento vencido",
  FILE_UPLOADED: "Archivo original cargado",
  SIGNED_FILE_UPLOADED: "Archivo firmado cargado",
  LEGAL_REVIEWED: "Revisión actualizada",
  PROVIDER_UPDATED: "Proveedor de firma actualizado",
};

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "documents")) {
    return <UpgradePlanGate title="Documentos y contratos" description="El expediente documental completo está disponible desde Professional." requiredPlan="Professional" />;
  }
  const { id } = await params;
  const { data: document, error } = await context.supabase
    .from("documents")
    .select("id,reference_code,title,document_type,status,revision,content_snapshot,content_sha256,storage_path,signed_storage_path,recipient_name,recipient_email,recipient_phone,notes,legal_review_required,legal_review_status,signature_provider,provider_envelope_id,provider_url,provider_status,lead_id,property_id,generated_at,sent_at,viewed_at,signed_at,declined_at,voided_at,created_by,created_at,updated_at")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (error || !document) notFound();

  const [eventsResult, leadResult, propertyResult] = await Promise.all([
    context.supabase.from("document_events").select("id,event_type,actor_user_id,metadata,created_at").eq("document_id", id).eq("organization_id", context.organizationId).order("created_at", { ascending: false }),
    document.lead_id ? context.supabase.from("leads").select("id,full_name,phone,email,pipeline_stage").eq("id", document.lead_id).eq("organization_id", context.organizationId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    document.property_id ? context.supabase.from("properties").select("id,title,address,zone,price,currency,operation").eq("id", document.property_id).eq("organization_id", context.organizationId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const events = eventsResult.data || [];
  const lead = leadResult.data;
  const property = propertyResult.data;
  const isManagement = context.role === "OWNER" || context.role === "MANAGER";
  const canUpdate = document.created_by === context.userId || isManagement;
  const isFinal = ["SIGNED", "DECLINED", "VOIDED", "EXPIRED"].includes(document.status);
  const reviewReady = !document.legal_review_required || document.legal_review_status === "APPROVED" || document.legal_review_status === "NOT_REQUIRED";

  return <main className="min-h-screen p-6 md:p-8 lg:p-10">
    <div className="mx-auto max-w-7xl">
      <Link href="/protected/documents" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d5b43] hover:underline"><ArrowLeft size={15} /> Volver a Documentos</Link>

      <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7553]">{document.reference_code}</span><Status value={document.status} /><ReviewBadge required={document.legal_review_required} status={document.legal_review_status} /></div>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">{document.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#625d55]">Revisión {document.revision} · generado {formatDate(document.generated_at || document.created_at)}. El contenido queda congelado al enviarse para preservar la evidencia.</p>
        </div>
        <div className="rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-3 text-sm text-[#655842]"><Fingerprint size={17} strokeWidth={1.7} className="inline-block mr-2" /><b>SHA-256</b><p className="mt-1 max-w-[320px] break-all font-mono text-[10px] text-[#81796e]">{document.content_sha256 || "Calculando integridad"}</p></div>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Info title="Cliente / destinatario" lines={[document.recipient_name || lead?.full_name, document.recipient_phone || lead?.phone, document.recipient_email || lead?.email].filter(Boolean) as string[]} />
        <Info title="Propiedad" lines={[property?.title, property?.address, property?.zone, property?.price != null ? `${property.currency || ""} ${property.price}` : null].filter(Boolean) as string[]} />
        <Info title="Firma" lines={[document.signature_provider === "NONE" ? "Sin proveedor asignado" : `Proveedor: ${document.signature_provider}`, document.provider_status ? `Estado: ${document.provider_status}` : null, document.provider_envelope_id ? `ID: ${document.provider_envelope_id}` : null].filter(Boolean) as string[]} />
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <article className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#ded2c1] bg-[#f2e9dd] px-6 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Snapshot contractual</p><h2 className="mt-1 font-serif text-2xl text-[#302d28]">Contenido generado</h2></div><FileText size={21} strokeWidth={1.5} className="text-[#806d52]" /></div>
          <pre className="whitespace-pre-wrap break-words px-6 py-7 font-sans text-sm leading-7 text-[#4d473f] md:px-8">{document.content_snapshot}</pre>
          {document.notes && <div className="border-t border-[#ded2c1] bg-[#f7f0e6] px-6 py-4 text-xs leading-5 text-[#756d63]"><b>Notas internas:</b> {document.notes}</div>}
        </article>

        <aside className="space-y-5">
          {document.legal_review_required && <div className={`rounded-2xl border p-5 ${document.legal_review_status === "APPROVED" ? "border-[#b8c1a4] bg-[#e7eadf]" : "border-[#c8b58d] bg-[#eee5ce]"}`}><div className="flex items-center gap-2"><ShieldCheck size={18} /><h2 className="font-serif text-xl">Revisión previa</h2></div><p className="mt-2 text-sm leading-6">{document.legal_review_status === "APPROVED" ? "Dirección/Gerencia aprobó el documento para continuar con envío o firma." : "Este tipo documental debe ser aprobado antes de poder registrarse como enviado o firmado."}</p>{isManagement && document.legal_review_status === "PENDING" && !isFinal && <form action={approveLegalReview} className="mt-4"><input type="hidden" name="document_id" value={document.id} /><button className="w-full rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Aprobar revisión</button></form>}</div>}

          <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
            <h2 className="font-serif text-xl text-[#302d28]">Archivo privado</h2><p className="mt-2 text-xs leading-5 text-[#81796e]">PDF y DOCX se guardan en almacenamiento privado. Las descargas usan un enlace temporal, no una URL pública permanente.</p>
            {document.storage_path ? <form action={downloadDocumentFile} className="mt-4"><input type="hidden" name="document_id" value={document.id} /><button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5f513e]"><Download size={15} /> Descargar original</button></form> : canUpdate && !isFinal ? <form action={uploadDocumentFile} className="mt-4 space-y-3"><input type="hidden" name="document_id" value={document.id} /><input type="file" name="file" required accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="block w-full text-xs text-[#665e54] file:mr-3 file:rounded-md file:border file:border-[#cdbfa9] file:bg-[#fffaf2] file:px-3 file:py-2 file:text-xs file:font-semibold" /><button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5f513e]"><Upload size={15} /> Guardar original</button></form> : <p className="mt-4 text-xs text-[#81796e]">No se cargó archivo original.</p>}
            {document.signed_storage_path && <form action={downloadDocumentFile} className="mt-3"><input type="hidden" name="document_id" value={document.id} /><input type="hidden" name="signed" value="true" /><button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]"><FileCheck2 size={15} /> Descargar firmado</button></form>}
          </div>

          {canUpdate && !isFinal && <div className="rounded-2xl border border-[#d2c5b3] bg-[#e9dece] p-5"><h2 className="font-serif text-xl text-[#302d28]">Flujo de firma</h2><p className="mt-2 text-xs leading-5 text-[#756d63]">Podés registrar envío externo con su URL/ID y luego guardar la copia firmada. Las integraciones Enterprise usarán los mismos estados y auditoría.</p>
            {document.status === "GENERATED" && <form action={updateDocumentStatus} className="mt-4 space-y-3"><input type="hidden" name="document_id" value={document.id} /><input type="hidden" name="status" value="SENT" /><input type="hidden" name="signature_provider" value="EXTERNAL" /><input name="provider_url" type="url" className={inputClass} placeholder="URL de firma externa (opcional)" /><input name="provider_envelope_id" className={inputClass} placeholder="ID / referencia externa (opcional)" /><button disabled={!reviewReady} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2] disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /> Registrar como enviado</button>{!reviewReady && <p className="text-[11px] text-[#846a42]">Primero debe aprobarse la revisión.</p>}</form>}
            {document.status === "SENT" && <form action={updateDocumentStatus} className="mt-3"><input type="hidden" name="document_id" value={document.id} /><input type="hidden" name="status" value="VIEWED" /><button className="w-full rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5f513e]">Registrar como visto</button></form>}
            {(document.status === "GENERATED" || document.status === "SENT" || document.status === "VIEWED") && <form action={uploadSignedDocumentFile} className="mt-4 space-y-3 border-t border-[#cdbfa9] pt-4"><p className="text-xs font-semibold text-[#5d5347]">Registrar firma externa</p><input type="hidden" name="document_id" value={document.id} /><input type="file" name="file" required accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="block w-full text-xs text-[#665e54] file:mr-3 file:rounded-md file:border file:border-[#cdbfa9] file:bg-[#fffaf2] file:px-3 file:py-2 file:text-xs file:font-semibold" /><button disabled={!reviewReady} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#5e6a4d] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><CheckCircle2 size={15} /> Cargar firmado y cerrar</button></form>}
            {isManagement && <form action={updateDocumentStatus} className="mt-4 border-t border-[#cdbfa9] pt-4"><input type="hidden" name="document_id" value={document.id} /><input type="hidden" name="status" value="VOIDED" /><button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#cdaea4] bg-[#f1e1da] px-4 py-2.5 text-sm font-semibold text-[#774f43]"><XCircle size={15} /> Anular documento</button></form>}
          </div>}

          {document.provider_url && <a href={document.provider_url} target="_blank" rel="noreferrer" className="block rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] p-4 text-sm font-semibold text-[#6d5b43] hover:underline">Abrir expediente en proveedor ↗</a>}
        </aside>
      </section>

      <section className="mt-7 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
        <div className="flex items-center gap-2 text-[#806d52]"><History size={18} /><p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Auditoría</p></div><h2 className="mt-2 font-serif text-2xl text-[#302d28]">Historial del documento</h2>
        <div className="mt-5 space-y-3">{events.map((event) => <div key={event.id} className="grid gap-2 rounded-xl border border-[#ded2c1] bg-[#fffaf2] p-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="font-semibold text-[#484138]">{EVENT_LABELS[event.event_type] || event.event_type}</p><p className="mt-1 text-xs text-[#81796e]">Evento inmutable asociado a {document.reference_code}</p></div><time className="text-xs text-[#81796e]">{formatDate(event.created_at)}</time></div>)}{!events.length && <p className="text-sm text-[#81796e]">No hay eventos registrados.</p>}</div>
      </section>
    </div>
  </main>;
}

const inputClass = "w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#39342e] outline-none focus:border-[#8d7553]";
function Info({ title, lines }: { title: string; lines: string[] }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">{title}</p>{lines.length ? <div className="mt-3 space-y-1 text-sm text-[#5f584f]">{lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div> : <p className="mt-3 text-sm text-[#8a8176]">Sin datos asociados</p>}</div>; }
function Status({ value }: { value: string }) { const cls = value === "SIGNED" ? "border-[#b8c1a4] bg-[#e7eadf] text-[#596146]" : value === "SENT" || value === "VIEWED" ? "border-[#c8b58d] bg-[#eee5ce] text-[#735f34]" : value === "DECLINED" || value === "VOIDED" ? "border-[#d2b9ae] bg-[#f0dfd8] text-[#785144]" : "border-[#cfc2b1] bg-[#f3ece2] text-[#756b61]"; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{STATUS_LABELS[value] || value}</span>; }
function ReviewBadge({ required, status }: { required: boolean; status: string }) { if (!required || status === "NOT_REQUIRED") return <span className="rounded-full border border-[#d2c5b3] bg-[#eee5d8] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#756b61]">Sin revisión obligatoria</span>; if (status === "APPROVED") return <span className="rounded-full border border-[#b8c1a4] bg-[#e7eadf] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#596146]">Revisión aprobada</span>; return <span className="rounded-full border border-[#c8b58d] bg-[#eee5ce] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#735f34]">Revisión pendiente</span>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value)); }
