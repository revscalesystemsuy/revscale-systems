"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";

const DOCUMENT_TYPES = new Set(["RESERVATION", "PURCHASE_OFFER", "RENTAL_APPLICATION", "LEASE", "SALE_AGREEMENT", "CUSTOM"]);
const FINAL_STATUSES = new Set(["SIGNED", "DECLINED", "VOIDED", "EXPIRED"]);
const FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function requireDocuments() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (!planHasFeature(context.plan, "documents")) throw new Error("Documentos requiere Professional o Enterprise.");
  return context;
}

async function requireDocumentManager() {
  const context = await requireDocuments();
  if (context.role !== "OWNER" && context.role !== "MANAGER") throw new Error("Solo Dirección o Gerencia puede administrar plantillas y revisiones.");
  return context;
}

function text(value: FormDataEntryValue | null, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function nullable(value: FormDataEntryValue | null, max = 5000) {
  const result = text(value, max);
  return result || null;
}

function safeExternalUrl(value: FormDataEntryValue | null) {
  const raw = text(value, 1000);
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("La URL de firma no es válida.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("La URL de firma debe usar http o https.");
  return url.toString();
}

function renderTemplate(body: string, values: Record<string, string>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => values[key] ?? "—");
}

export async function createDocument(formData: FormData) {
  const context = await requireDocuments();
  const templateId = text(formData.get("template_id"), 80);
  const leadId = nullable(formData.get("lead_id"), 80);
  const propertyId = nullable(formData.get("property_id"), 80);
  const notes = nullable(formData.get("notes"), 4000);
  if (!templateId) throw new Error("Elegí una plantilla.");

  const { data: template, error: templateError } = await context.supabase
    .from("document_templates")
    .select("id,name,document_type,body,requires_legal_review,is_active")
    .eq("id", templateId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (templateError || !template || !template.is_active) throw new Error("La plantilla seleccionada no está disponible.");

  const [organizationResult, leadResult, propertyResult] = await Promise.all([
    context.supabase.from("organizations").select("id,name").eq("id", context.organizationId).single(),
    leadId
      ? context.supabase.from("leads").select("id,full_name,phone,email").eq("id", leadId).eq("organization_id", context.organizationId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    propertyId
      ? context.supabase.from("properties").select("id,title,address,zone,price,currency").eq("id", propertyId).eq("organization_id", context.organizationId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (leadId && (!leadResult.data || leadResult.error)) throw new Error("El lead seleccionado no pertenece a esta inmobiliaria.");
  if (propertyId && (!propertyResult.data || propertyResult.error)) throw new Error("La propiedad seleccionada no pertenece a esta inmobiliaria.");

  const lead = leadResult.data;
  const property = propertyResult.data;
  const organizationName = organizationResult.data?.name || "Inmobiliaria";
  const today = new Intl.DateTimeFormat("es-UY", { dateStyle: "long", timeZone: "America/Montevideo" }).format(new Date());
  const values: Record<string, string> = {
    today,
    "organization.name": organizationName,
    "lead.full_name": lead?.full_name || "",
    "lead.phone": lead?.phone || "",
    "lead.email": lead?.email || "",
    "property.title": property?.title || "",
    "property.address": property?.address || "",
    "property.zone": property?.zone || "",
    "property.currency": property?.currency || "",
    "property.price": property?.price != null ? String(property.price) : "",
    "document.notes": notes || "",
  };
  const content = renderTemplate(template.body, values);
  const titlePieces = [template.name, lead?.full_name, property?.title].filter(Boolean);

  const { data: created, error } = await context.supabase
    .from("documents")
    .insert({
      organization_id: context.organizationId,
      template_id: template.id,
      lead_id: lead?.id || null,
      property_id: property?.id || null,
      title: titlePieces.join(" · ").slice(0, 180),
      document_type: template.document_type,
      status: "GENERATED",
      content_snapshot: content,
      variables: values,
      recipient_name: lead?.full_name || null,
      recipient_email: lead?.email || null,
      recipient_phone: lead?.phone || null,
      notes,
      legal_review_required: Boolean(template.requires_legal_review),
      legal_review_status: template.requires_legal_review ? "PENDING" : "NOT_REQUIRED",
      signature_provider: "NONE",
      created_by: context.userId,
      updated_by: context.userId,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message || "No se pudo generar el documento.");

  revalidatePath("/protected/documents");
  redirect(`/protected/documents/${created.id}`);
}

export async function saveTemplate(formData: FormData) {
  const context = await requireDocumentManager();
  const templateId = nullable(formData.get("template_id"), 80);
  const name = text(formData.get("name"), 120);
  const documentType = text(formData.get("document_type"), 40).toUpperCase();
  const body = text(formData.get("body"), 50000);
  const requiresLegalReview = formData.get("requires_legal_review") === "on";
  if (name.length < 2) throw new Error("Ingresá un nombre de plantilla.");
  if (!DOCUMENT_TYPES.has(documentType)) throw new Error("Tipo documental inválido.");
  if (!body) throw new Error("La plantilla no puede estar vacía.");

  if (templateId) {
    const { data: current, error: currentError } = await context.supabase
      .from("document_templates")
      .select("id,version")
      .eq("id", templateId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    if (currentError || !current) throw new Error("Plantilla no encontrada.");
    const { error } = await context.supabase
      .from("document_templates")
      .update({ name, document_type: documentType, body, requires_legal_review: requiresLegalReview, version: current.version + 1 })
      .eq("id", templateId)
      .eq("organization_id", context.organizationId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await context.supabase.from("document_templates").insert({
      organization_id: context.organizationId,
      name,
      document_type: documentType,
      body,
      requires_legal_review: requiresLegalReview,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/protected/documents");
}

export async function toggleTemplate(formData: FormData) {
  const context = await requireDocumentManager();
  const templateId = text(formData.get("template_id"), 80);
  const active = formData.get("active") === "true";
  const { error } = await context.supabase
    .from("document_templates")
    .update({ is_active: active })
    .eq("id", templateId)
    .eq("organization_id", context.organizationId);
  if (error) throw new Error(error.message);
  revalidatePath("/protected/documents");
}

export async function approveLegalReview(formData: FormData) {
  const context = await requireDocumentManager();
  const documentId = text(formData.get("document_id"), 80);
  const { error } = await context.supabase
    .from("documents")
    .update({ legal_review_status: "APPROVED", updated_by: context.userId })
    .eq("id", documentId)
    .eq("organization_id", context.organizationId)
    .in("status", ["DRAFT", "GENERATED"]);
  if (error) throw new Error(error.message);
  revalidatePath(`/protected/documents/${documentId}`);
  revalidatePath("/protected/documents");
}

export async function updateDocumentStatus(formData: FormData) {
  const context = await requireDocuments();
  const documentId = text(formData.get("document_id"), 80);
  const nextStatus = text(formData.get("status"), 30).toUpperCase();
  const allowed = new Set(["SENT", "VIEWED", "SIGNED", "DECLINED", "VOIDED", "EXPIRED"]);
  if (!allowed.has(nextStatus)) throw new Error("Estado documental inválido.");

  const { data: document, error: loadError } = await context.supabase
    .from("documents")
    .select("id,status,legal_review_required,legal_review_status,created_by")
    .eq("id", documentId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (loadError || !document) throw new Error("Documento no encontrado.");
  if (document.created_by !== context.userId && context.role !== "OWNER" && context.role !== "MANAGER") throw new Error("No tenés permiso para actualizar este documento.");
  if (FINAL_STATUSES.has(document.status)) throw new Error("El documento ya está finalizado.");
  if ((nextStatus === "SENT" || nextStatus === "SIGNED") && document.legal_review_required && document.legal_review_status !== "APPROVED") {
    throw new Error("Este documento requiere aprobación jurídica/gerencial antes de enviarse o firmarse.");
  }

  const signatureProvider = text(formData.get("signature_provider"), 20).toUpperCase() || undefined;
  const providerUrl = safeExternalUrl(formData.get("provider_url"));
  const providerEnvelopeId = nullable(formData.get("provider_envelope_id"), 200);
  const payload: Record<string, unknown> = { status: nextStatus, updated_by: context.userId };
  if (signatureProvider) payload.signature_provider = signatureProvider;
  if (providerUrl) payload.provider_url = providerUrl;
  if (providerEnvelopeId) payload.provider_envelope_id = providerEnvelopeId;
  if (nextStatus === "SENT") payload.provider_status = "SENT";
  if (nextStatus === "SIGNED") payload.provider_status = "SIGNED";

  const { error } = await context.supabase.from("documents").update(payload).eq("id", documentId).eq("organization_id", context.organizationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/protected/documents/${documentId}`);
  revalidatePath("/protected/documents");
}

function safeFilename(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return normalized.slice(-120) || "documento";
}

async function readUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Elegí un archivo PDF o DOCX.");
  if (!FILE_TYPES.has(file.type)) throw new Error("Solo se admiten archivos PDF o DOCX.");
  if (file.size > 25 * 1024 * 1024) throw new Error("El archivo supera el máximo de 25 MB.");
  return file;
}

export async function uploadDocumentFile(formData: FormData) {
  const context = await requireDocuments();
  const documentId = text(formData.get("document_id"), 80);
  const file = await readUpload(formData);
  const path = `${context.organizationId}/${documentId}/original-${Date.now()}-${safeFilename(file.name)}`;
  const { error: uploadError } = await context.supabase.storage.from("documents").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await context.supabase.from("documents").update({ storage_path: path, updated_by: context.userId }).eq("id", documentId).eq("organization_id", context.organizationId);
  if (error) {
    await context.supabase.storage.from("documents").remove([path]);
    throw new Error(error.message);
  }
  revalidatePath(`/protected/documents/${documentId}`);
}

export async function uploadSignedDocumentFile(formData: FormData) {
  const context = await requireDocuments();
  const documentId = text(formData.get("document_id"), 80);
  const file = await readUpload(formData);
  const { data: document, error: loadError } = await context.supabase
    .from("documents")
    .select("id,legal_review_required,legal_review_status,created_by,status")
    .eq("id", documentId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (loadError || !document) throw new Error("Documento no encontrado.");
  if (document.created_by !== context.userId && context.role !== "OWNER" && context.role !== "MANAGER") throw new Error("No tenés permiso para completar esta firma.");
  if (document.legal_review_required && document.legal_review_status !== "APPROVED") throw new Error("El documento requiere aprobación antes de registrarse como firmado.");
  if (FINAL_STATUSES.has(document.status)) throw new Error("El documento ya está finalizado.");

  const path = `${context.organizationId}/${documentId}/signed-${Date.now()}-${safeFilename(file.name)}`;
  const { error: uploadError } = await context.supabase.storage.from("documents").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await context.supabase.from("documents").update({
    signed_storage_path: path,
    status: "SIGNED",
    signature_provider: "EXTERNAL",
    provider_status: "SIGNED",
    updated_by: context.userId,
  }).eq("id", documentId).eq("organization_id", context.organizationId);
  if (error) {
    await context.supabase.storage.from("documents").remove([path]);
    throw new Error(error.message);
  }
  revalidatePath(`/protected/documents/${documentId}`);
  revalidatePath("/protected/documents");
}

export async function downloadDocumentFile(formData: FormData) {
  const context = await requireDocuments();
  const documentId = text(formData.get("document_id"), 80);
  const signed = formData.get("signed") === "true";
  const { data: document, error } = await context.supabase
    .from("documents")
    .select("storage_path,signed_storage_path")
    .eq("id", documentId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (error || !document) throw new Error("Documento no encontrado.");
  const path = signed ? document.signed_storage_path : document.storage_path;
  if (!path) throw new Error("Este archivo todavía no fue cargado.");
  const { data, error: signedUrlError } = await context.supabase.storage.from("documents").createSignedUrl(path, 60);
  if (signedUrlError || !data?.signedUrl) throw new Error("No se pudo generar el acceso temporal al archivo.");
  redirect(data.signedUrl);
}

export async function configureSignatureProvider(formData: FormData) {
  const context = await requireDocuments();
  if (context.role !== "OWNER") throw new Error("Solo Dirección puede configurar firma avanzada.");
  if (!planHasFeature(context.plan, "esignature")) throw new Error("La integración de firma avanzada requiere Enterprise.");
  const provider = text(formData.get("provider"), 20).toUpperCase();
  if (provider !== "TUID" && provider !== "ABITAB") throw new Error("Proveedor inválido.");
  const accountLabel = nullable(formData.get("account_label"), 120);
  const externalAccountId = nullable(formData.get("external_account_id"), 200);
  const { error } = await context.supabase.from("signature_provider_settings").upsert({
    organization_id: context.organizationId,
    provider,
    integration_status: "PENDING",
    account_label: accountLabel,
    external_account_id: externalAccountId,
    configured_at: new Date().toISOString(),
    created_by: context.userId,
    updated_by: context.userId,
  }, { onConflict: "organization_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/protected/documents");
}
