"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeEmail,
  normalizePhone,
  parseCsv,
  parseFlexibleNumber,
  pick,
} from "@/lib/imports/csv";

const MAX_FILE_BYTES = 900_000;
const MAX_ROWS = 5000;

async function getImportContext() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role,team_id,status")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) throw new Error("No se encontró tu organización.");
  if (!["OWNER", "MANAGER"].includes(membership.role)) {
    throw new Error("Solo Director o Gerente pueden realizar importaciones masivas.");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,max_leads,max_properties")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (!subscription || subscription.status !== "ACTIVE") {
    throw new Error("La organización no tiene una suscripción activa.");
  }

  if (
    membership.role === "MANAGER" &&
    String(subscription.plan || "").toUpperCase() === "ENTERPRISE" &&
    !membership.team_id
  ) {
    throw new Error("El Gerente debe tener un equipo asignado antes de importar leads.");
  }

  return {
    admin: createAdminClient(),
    organizationId: membership.organization_id,
    role: membership.role,
    teamId: membership.team_id,
    subscription,
  };
}

async function readCsvFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Seleccioná un archivo CSV.");
  if (file.size > MAX_FILE_BYTES) throw new Error("El archivo supera el tamaño máximo permitido de 900 KB.");
  if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("El archivo debe tener extensión .csv.");

  const parsed = parseCsv(await file.text());
  if (parsed.rows.length > MAX_ROWS) {
    throw new Error(`El archivo supera el máximo de ${MAX_ROWS} filas por importación.`);
  }
  return parsed;
}

function fail(message: string): never {
  redirect(`/protected/imports?error=${encodeURIComponent(message)}`);
}

export async function importLeads(formData: FormData) {
  try {
    const { admin, organizationId, role, teamId, subscription } = await getImportContext();
    const { rows } = await readCsvFile(formData);

    const parsedRows = rows.map((row, index) => {
      const line = index + 2;
      const fullName = pick(row, ["full_name", "nombre", "nombre_completo", "cliente"]);
      const phone = pick(row, ["phone", "telefono", "celular", "whatsapp"]);
      const email = pick(row, ["email", "correo", "mail"]);
      const zone = pick(row, ["primary_zone", "zona", "zona_buscada"]);
      const operation = pick(row, ["operation", "operacion"]).toUpperCase();
      const propertyType = pick(row, ["property_type", "tipo_propiedad", "tipo"]).toUpperCase();
      const currency = (pick(row, ["currency", "moneda"]) || "USD").toUpperCase();
      const budget = parseFlexibleNumber(pick(row, ["budget_max", "presupuesto", "presupuesto_maximo"]));
      const bedrooms = parseFlexibleNumber(pick(row, ["bedrooms_min", "dormitorios", "dormitorios_minimos"]));

      if (!fullName && !phone && !email) throw new Error(`Fila ${line}: necesitás al menos nombre, teléfono o email.`);
      if (operation && !["COMPRA", "ALQUILER"].includes(operation)) throw new Error(`Fila ${line}: operación debe ser COMPRA o ALQUILER.`);
      if (!["USD", "UYU"].includes(currency)) throw new Error(`Fila ${line}: moneda debe ser USD o UYU.`);
      if (budget !== null && budget < 0) throw new Error(`Fila ${line}: presupuesto inválido.`);
      if (bedrooms !== null && (!Number.isInteger(bedrooms) || bedrooms < 0)) throw new Error(`Fila ${line}: dormitorios debe ser un entero válido.`);

      let score = 30;
      if (zone) score += 20;
      if (budget) score += 25;
      if (bedrooms) score += 15;

      return {
        organization_id: organizationId,
        full_name: fullName || null,
        phone: phone || null,
        email: email || null,
        operation: operation || null,
        property_type: propertyType || null,
        primary_zone: zone || null,
        budget_max: budget,
        currency,
        bedrooms_min: bedrooms,
        lead_score: score,
        lead_temperature: score >= 80 ? "HOT" : score >= 50 ? "WARM" : "COLD",
        next_action: "Contactar cliente",
        team_id: role === "MANAGER" ? teamId : null,
      };
    });

    const uniqueRows: typeof parsedRows = [];
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    let duplicateCount = 0;

    for (const row of parsedRows) {
      const phoneKey = row.phone ? normalizePhone(row.phone) : "";
      const emailKey = row.email ? normalizeEmail(row.email) : "";
      if ((phoneKey && seenPhones.has(phoneKey)) || (emailKey && seenEmails.has(emailKey))) {
        duplicateCount += 1;
        continue;
      }
      if (phoneKey) seenPhones.add(phoneKey);
      if (emailKey) seenEmails.add(emailKey);
      uniqueRows.push(row);
    }

    const [{ data: existing }, { count: currentCount }] = await Promise.all([
      admin.from("leads").select("phone,email").eq("organization_id", organizationId),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    ]);

    const existingPhones = new Set((existing || []).map((lead) => normalizePhone(lead.phone || "")).filter(Boolean));
    const existingEmails = new Set((existing || []).map((lead) => normalizeEmail(lead.email || "")).filter(Boolean));

    const toInsert = uniqueRows.filter((row) => {
      const phoneKey = row.phone ? normalizePhone(row.phone) : "";
      const emailKey = row.email ? normalizeEmail(row.email) : "";
      const duplicate = (phoneKey && existingPhones.has(phoneKey)) || (emailKey && existingEmails.has(emailKey));
      if (duplicate) duplicateCount += 1;
      return !duplicate;
    });

    const maxLeads = subscription.max_leads || 0;
    if (maxLeads > 0 && maxLeads < 1_000_000 && (currentCount || 0) + toInsert.length > maxLeads) {
      throw new Error(`La importación supera el límite de ${maxLeads} leads de tu plan.`);
    }

    if (toInsert.length) {
      const { error } = await admin.from("leads").insert(toInsert);
      if (error) throw new Error(error.message);
    }

    redirect(`/protected/imports?type=leads&imported=${toInsert.length}&duplicates=${duplicateCount}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    fail(error instanceof Error ? error.message : "No se pudo importar el archivo de leads.");
  }
}

export async function importProperties(formData: FormData) {
  try {
    const { admin, organizationId, subscription } = await getImportContext();
    const { rows } = await readCsvFile(formData);

    const parsedRows = rows.map((row, index) => {
      const line = index + 2;
      const title = pick(row, ["title", "titulo", "propiedad"]);
      const zone = pick(row, ["zone", "zona"]);
      const address = pick(row, ["address", "direccion"]);
      const operation = (pick(row, ["operation", "operacion"]) || "COMPRA").toUpperCase();
      const propertyType = (pick(row, ["property_type", "tipo_propiedad", "tipo"]) || "APARTAMENTO").toUpperCase();
      const currency = (pick(row, ["currency", "moneda"]) || "USD").toUpperCase();
      const status = (pick(row, ["status", "estado"]) || "AVAILABLE").toUpperCase();
      const description = pick(row, ["description", "descripcion"]);
      const price = parseFlexibleNumber(pick(row, ["price", "precio"]));
      const bedrooms = parseFlexibleNumber(pick(row, ["bedrooms", "dormitorios"]));
      const bathrooms = parseFlexibleNumber(pick(row, ["bathrooms", "banos", "baños"]));
      const area = parseFlexibleNumber(pick(row, ["area_m2", "area", "metros", "m2"]));

      if (!title) throw new Error(`Fila ${line}: título es obligatorio.`);
      if (!["COMPRA", "ALQUILER"].includes(operation)) throw new Error(`Fila ${line}: operación debe ser COMPRA o ALQUILER.`);
      if (!["USD", "UYU"].includes(currency)) throw new Error(`Fila ${line}: moneda debe ser USD o UYU.`);
      if (price !== null && price < 0) throw new Error(`Fila ${line}: precio inválido.`);
      if (bedrooms !== null && (!Number.isInteger(bedrooms) || bedrooms < 0)) throw new Error(`Fila ${line}: dormitorios inválido.`);
      if (bathrooms !== null && (!Number.isInteger(bathrooms) || bathrooms < 0)) throw new Error(`Fila ${line}: baños inválido.`);
      if (area !== null && area < 0) throw new Error(`Fila ${line}: área inválida.`);

      return {
        organization_id: organizationId,
        title,
        property_type: propertyType,
        operation,
        zone: zone || null,
        address: address || null,
        price,
        currency,
        bedrooms,
        bathrooms,
        area_m2: area,
        status,
        description: description || null,
      };
    });

    const [{ data: existing }, { count: currentCount }] = await Promise.all([
      admin.from("properties").select("title,address,zone").eq("organization_id", organizationId),
      admin.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    ]);

    const existingKeys = new Set((existing || []).map((item) => `${(item.title || "").trim().toLowerCase()}|${(item.address || "").trim().toLowerCase()}|${(item.zone || "").trim().toLowerCase()}`));
    const fileKeys = new Set<string>();
    let duplicateCount = 0;

    const toInsert = parsedRows.filter((row) => {
      const key = `${row.title.trim().toLowerCase()}|${(row.address || "").trim().toLowerCase()}|${(row.zone || "").trim().toLowerCase()}`;
      if (existingKeys.has(key) || fileKeys.has(key)) {
        duplicateCount += 1;
        return false;
      }
      fileKeys.add(key);
      return true;
    });

    const maxProperties = subscription.max_properties || 0;
    if (maxProperties > 0 && maxProperties < 1_000_000 && (currentCount || 0) + toInsert.length > maxProperties) {
      throw new Error(`La importación supera el límite de ${maxProperties} propiedades de tu plan.`);
    }

    if (toInsert.length) {
      const { error } = await admin.from("properties").insert(toInsert);
      if (error) throw new Error(error.message);
    }

    redirect(`/protected/imports?type=properties&imported=${toInsert.length}&duplicates=${duplicateCount}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    fail(error instanceof Error ? error.message : "No se pudo importar el archivo de propiedades.");
  }
}
