import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const mercadoLibreClientId = Deno.env.get("MERCADOLIBRE_CLIENT_ID") || "";
const mercadoLibreClientSecret = Deno.env.get("MERCADOLIBRE_CLIENT_SECRET") || "";

type Json = Record<string, any>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function providerMessage(payload: any, fallback: string) {
  const message = String(payload?.message || payload?.error_description || fallback);
  const causes = Array.isArray(payload?.cause)
    ? payload.cause.map((item: any) => String(item?.message || item?.code || "")).filter(Boolean).slice(0, 4)
    : [];
  return [message, ...causes].filter(Boolean).join(" · ").slice(0, 900);
}

async function requestMercadoLibre(url: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

async function refreshIfNeeded(db: ReturnType<typeof createClient>, connection: Json) {
  const secretResult = await db.rpc("get_portal_connection_secret", { p_connection_id: connection.id });
  if (secretResult.error || !secretResult.data) throw new Error("No hay credenciales cifradas para este portal.");
  let secret = secretResult.data as Json;
  const expiry = new Date(secret.expires_at || connection.token_expires_at || 0).getTime();
  if (expiry > Date.now() + 60_000) return { token: String(secret.access_token), secret };
  if (!mercadoLibreClientId || !mercadoLibreClientSecret || !secret.refresh_token) throw new Error("La conexión necesita una nueva autorización.");

  const form = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: mercadoLibreClientId,
    client_secret: mercadoLibreClientSecret,
    refresh_token: String(secret.refresh_token),
  });
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token || !payload?.refresh_token) throw new Error(providerMessage(payload, "No se pudo renovar la autorización."));

  const expiresIn = Math.max(60, Number(payload.expires_in || 21600));
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  secret = {
    ...secret,
    access_token: String(payload.access_token),
    refresh_token: String(payload.refresh_token),
    token_type: String(payload.token_type || "bearer"),
    expires_at: tokenExpiresAt,
    scope: String(payload.scope || secret.scope || ""),
  };
  const save = await db.rpc("set_portal_connection_secret", { p_connection_id: connection.id, p_secret: secret });
  if (save.error) throw new Error("No se pudo persistir la renovación segura del token.");
  await db.from("portal_connections").update({
    token_expires_at: tokenExpiresAt,
    scopes: String(payload.scope || secret.scope || "").split(/\s+/).filter(Boolean),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", connection.id);
  return { token: String(payload.access_token), secret };
}

function buildLocation(publication: Json, providerPayload: Json) {
  const locationId = String(providerPayload.location_id || "").trim();
  const locationType = String(providerPayload.location_type || "city").toLowerCase();
  if (!locationId) throw new Error("Falta seleccionar una ciudad o barrio de Mercado Libre.");
  const location: Json = { address_line: publication.address_label || undefined };
  if (locationType === "neighborhood") location.neighborhood = { id: locationId };
  else location.city = { id: locationId };
  return location;
}

function buildAttributes(publication: Json, providerPayload: Json) {
  const attributes = Array.isArray(providerPayload.attributes) ? [...providerPayload.attributes] : [];
  const seen = new Set(attributes.map((item: any) => String(item?.id || "")));
  const add = (id: string, value: unknown) => {
    if (value == null || value === "" || seen.has(id)) return;
    attributes.push({ id, value_name: String(value) });
    seen.add(id);
  };
  add("BEDROOMS", publication.bedrooms);
  add("FULL_BATHROOMS", publication.bathrooms);
  if (publication.area_m2 != null) add("TOTAL_AREA", `${publication.area_m2} m²`);
  return attributes;
}

function buildCreatePayload(publication: Json) {
  const providerPayload = (publication.provider_payload || {}) as Json;
  const categoryId = String(providerPayload.category_id || "").trim();
  const listingTypeId = String(providerPayload.listing_type_id || "silver").trim();
  if (!categoryId) throw new Error("Falta la categoría de Mercado Libre.");
  if (!publication.title || publication.price == null || !publication.currency) throw new Error("Título, precio y moneda son obligatorios para Mercado Libre.");

  const pictureUrls = [publication.cover_image_url, ...(publication.gallery_urls || [])]
    .map((value: unknown) => String(value || "").trim())
    .filter(Boolean)
    .filter((value: string, index: number, all: string[]) => all.indexOf(value) === index)
    .slice(0, 10);
  if (!pictureUrls.length) throw new Error("Mercado Libre requiere al menos una imagen para esta publicación.");

  const payload: Json = {
    site_id: "MLU",
    title: String(publication.title).slice(0, 200),
    category_id: categoryId,
    price: Number(publication.price),
    currency_id: String(publication.currency).toUpperCase(),
    available_quantity: 1,
    buying_mode: "classified",
    listing_type_id: listingTypeId,
    condition: "not_specified",
    channels: ["marketplace"],
    pictures: pictureUrls.map((source: string) => ({ source })),
    location: buildLocation(publication, providerPayload),
    attributes: buildAttributes(publication, providerPayload),
  };
  return payload;
}

async function logEvent(db: ReturnType<typeof createClient>, row: Json, action: string, status: "SUCCESS" | "ERROR", message: string, externalId?: string | null) {
  await db.from("portal_sync_events").insert({
    organization_id: row.organization_id,
    connection_id: row.connection_id,
    publication_id: row.id,
    provider: "MERCADOLIBRE",
    action,
    status,
    external_id: externalId || row.external_id || null,
    message: message.slice(0, 900),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend unavailable" }, 503);

  const authorization = req.headers.get("authorization") || "";
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!jwt) return json({ error: "Unauthorized" }, 401);
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await db.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const publicationId = String(body?.publication_id || "").trim();
  const action = String(body?.action || "VALIDATE").toUpperCase();
  if (!publicationId || !["VALIDATE","PUBLISH","SYNC","PAUSE","ACTIVATE"].includes(action)) return json({ error: "Invalid request" }, 400);

  const { data: publication } = await db.from("property_publications")
    .select("id,organization_id,property_id,channel,status,title,description,address_label,price,currency,bedrooms,bathrooms,area_m2,cover_image_url,gallery_urls,contact_name,contact_phone,external_id,external_url,provider_payload")
    .eq("id", publicationId).eq("channel", "MERCADOLIBRE").maybeSingle();
  if (!publication) return json({ error: "Publication not found" }, 404);

  const [{ data: membership }, { data: subscription }, { data: connection }] = await Promise.all([
    db.from("organization_members").select("role,status").eq("organization_id", publication.organization_id).eq("user_id", user.id).eq("status", "ACTIVE").maybeSingle(),
    db.from("subscriptions").select("plan,status").eq("organization_id", publication.organization_id).maybeSingle(),
    db.from("portal_connections").select("id,organization_id,provider,status,token_expires_at").eq("organization_id", publication.organization_id).eq("provider", "MERCADOLIBRE").maybeSingle(),
  ]);
  if (!membership || !["OWNER","MANAGER"].includes(String(membership.role || "").toUpperCase())) return json({ error: "Forbidden" }, 403);
  if (String(subscription?.status || "").toUpperCase() !== "ACTIVE" || String(subscription?.plan || "").toUpperCase() !== "ENTERPRISE") return json({ error: "Live portal sync requires Enterprise" }, 403);
  if (!connection || connection.status !== "CONNECTED") return json({ error: "Mercado Libre is not connected" }, 409);

  const publicationWithConnection = { ...publication, connection_id: connection.id };
  const attemptedAt = new Date().toISOString();
  await db.from("property_publications").update({ last_sync_status: "QUEUED", sync_attempted_at: attemptedAt, sync_error: null, updated_at: attemptedAt }).eq("id", publication.id);

  try {
    const { token } = await refreshIfNeeded(db, connection);

    if (action === "PAUSE" || action === "ACTIVATE") {
      if (!publication.external_id) throw new Error("La publicación todavía no tiene un ID externo.");
      const nextStatus = action === "PAUSE" ? "paused" : "active";
      const response = await requestMercadoLibre(`https://api.mercadolibre.com/items/${encodeURIComponent(publication.external_id)}`, token, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(providerMessage(payload, `Mercado Libre no pudo cambiar el estado a ${nextStatus}.`));
      const now = new Date().toISOString();
      await db.from("property_publications").update({
        status: action === "PAUSE" ? "PAUSED" : "PUBLISHED",
        last_sync_status: "SUCCESS",
        sync_error: null,
        last_synced_at: now,
        updated_at: now,
      }).eq("id", publication.id);
      await db.from("portal_connections").update({ last_sync_at: now, last_error: null, updated_at: now }).eq("id", connection.id);
      await logEvent(db, publicationWithConnection, action === "PAUSE" ? "PAUSE" : "SYNC", "SUCCESS", `${action === "PAUSE" ? "Pausada" : "Reactivada"} en Mercado Libre.`);
      return json({ ok: true, status: nextStatus, external_id: publication.external_id, external_url: publication.external_url });
    }

    const createPayload = buildCreatePayload(publication);
    if (!publication.external_id) {
      const validation = await requestMercadoLibre("https://api.mercadolibre.com/items/validate", token, { method: "POST", body: JSON.stringify(createPayload) });
      const validationPayload = await validation.json().catch(() => ({}));
      if (!validation.ok) throw new Error(providerMessage(validationPayload, "La publicación no pasó la validación de Mercado Libre."));
      if (action === "VALIDATE") {
        const now = new Date().toISOString();
        await db.from("property_publications").update({ status: "READY", last_sync_status: "SUCCESS", sync_error: null, last_synced_at: now, updated_at: now }).eq("id", publication.id);
        await logEvent(db, publicationWithConnection, "SYNC", "SUCCESS", "Validación de Mercado Libre aprobada.");
        return json({ ok: true, validated: true, status: "READY" });
      }
      if (action !== "PUBLISH" && action !== "SYNC") throw new Error("La publicación todavía no existe en Mercado Libre.");

      const created = await requestMercadoLibre("https://api.mercadolibre.com/items", token, { method: "POST", body: JSON.stringify(createPayload) });
      const createdPayload = await created.json().catch(() => ({}));
      if (!created.ok || !createdPayload?.id) throw new Error(providerMessage(createdPayload, "Mercado Libre rechazó la publicación."));

      const externalId = String(createdPayload.id);
      const externalUrl = String(createdPayload.permalink || "") || null;
      if (publication.description) {
        const descriptionResponse = await requestMercadoLibre(`https://api.mercadolibre.com/items/${encodeURIComponent(externalId)}/description`, token, {
          method: "POST",
          body: JSON.stringify({ plain_text: String(publication.description) }),
        });
        if (!descriptionResponse.ok) {
          const descriptionPayload = await descriptionResponse.json().catch(() => ({}));
          throw new Error(`El aviso fue creado (${externalId}), pero la descripción falló: ${providerMessage(descriptionPayload, "error de descripción")}`);
        }
      }

      const now = new Date().toISOString();
      await db.from("property_publications").update({
        external_id: externalId,
        external_url: externalUrl,
        status: "PUBLISHED",
        published_at: publication.status === "PUBLISHED" ? undefined : now,
        last_sync_status: "SUCCESS",
        sync_error: null,
        last_synced_at: now,
        updated_at: now,
      }).eq("id", publication.id);
      await db.from("portal_connections").update({ last_sync_at: now, last_error: null, updated_at: now }).eq("id", connection.id);
      await logEvent(db, publicationWithConnection, "PUBLISH", "SUCCESS", "Publicada en Mercado Libre.", externalId);
      return json({ ok: true, published: true, external_id: externalId, external_url: externalUrl });
    }

    const updatePayload = {
      title: createPayload.title,
      price: createPayload.price,
      pictures: createPayload.pictures,
      location: createPayload.location,
      attributes: createPayload.attributes,
    };
    const updated = await requestMercadoLibre(`https://api.mercadolibre.com/items/${encodeURIComponent(publication.external_id)}`, token, { method: "PUT", body: JSON.stringify(updatePayload) });
    const updatedPayload = await updated.json().catch(() => ({}));
    if (!updated.ok) throw new Error(providerMessage(updatedPayload, "Mercado Libre rechazó la sincronización."));

    if (publication.description) {
      const descriptionResponse = await requestMercadoLibre(`https://api.mercadolibre.com/items/${encodeURIComponent(publication.external_id)}/description?api_version=2`, token, {
        method: "PUT",
        body: JSON.stringify({ plain_text: String(publication.description) }),
      });
      if (!descriptionResponse.ok) {
        const descriptionPayload = await descriptionResponse.json().catch(() => ({}));
        throw new Error(providerMessage(descriptionPayload, "La publicación se actualizó, pero la descripción no pudo sincronizarse."));
      }
    }

    const now = new Date().toISOString();
    const externalUrl = String(updatedPayload?.permalink || publication.external_url || "") || null;
    await db.from("property_publications").update({
      external_url: externalUrl,
      status: "PUBLISHED",
      last_sync_status: "SUCCESS",
      sync_error: null,
      last_synced_at: now,
      updated_at: now,
    }).eq("id", publication.id);
    await db.from("portal_connections").update({ last_sync_at: now, last_error: null, updated_at: now }).eq("id", connection.id);
    await logEvent(db, publicationWithConnection, "SYNC", "SUCCESS", "Sincronizada con Mercado Libre.");
    return json({ ok: true, synced: true, external_id: publication.external_id, external_url: externalUrl });
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).slice(0, 900);
    const now = new Date().toISOString();
    await db.from("property_publications").update({ status: "ERROR", last_sync_status: "ERROR", sync_error: message, last_synced_at: now, updated_at: now }).eq("id", publication.id);
    await db.from("portal_connections").update({ last_error: message, updated_at: now }).eq("id", connection.id);
    await logEvent(db, publicationWithConnection, action === "PUBLISH" ? "PUBLISH" : action === "PAUSE" ? "PAUSE" : "SYNC", "ERROR", message);
    return json({ error: message }, 422);
  }
});
