import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function createPublicServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) throw new Error("Supabase public configuration is missing");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const organizationId = cleanString(payload.organization_id, 100);
    const token = cleanString(payload.token, 200);

    if (!organizationId || !token) return jsonError("Faltan credenciales de integración.", 400);

    const leadPayload = {
      full_name: cleanString(payload.full_name, 160) || null,
      phone: cleanString(payload.phone, 80) || null,
      email: cleanString(payload.email, 180).toLowerCase() || null,
      primary_zone: cleanString(payload.primary_zone, 160) || null,
      operation: cleanString(payload.operation, 50).toUpperCase() || null,
      property_type: cleanString(payload.property_type, 80).toUpperCase() || null,
      currency: cleanString(payload.currency || "USD", 10).toUpperCase(),
      budget_max: cleanNumber(payload.budget_max),
      bedrooms_min: cleanInteger(payload.bedrooms_min),
      source_channel: cleanString(payload.source_channel || "WEB", 80).toUpperCase(),
      source_provider: cleanString(payload.source_provider, 120) || null,
      source_campaign: cleanString(payload.source_campaign, 180) || null,
      source_ad: cleanString(payload.source_ad, 180) || null,
      source_listing: cleanString(payload.source_listing, 180) || null,
      source_property_id: cleanString(payload.source_property_id || payload.property_id, 100) || null,
      external_lead_id: cleanString(payload.external_lead_id, 200) || null,
      utm_source: cleanString(payload.utm_source, 180) || null,
      utm_medium: cleanString(payload.utm_medium, 180) || null,
      utm_campaign: cleanString(payload.utm_campaign, 180) || null,
      utm_content: cleanString(payload.utm_content, 180) || null,
    };

    if (!leadPayload.full_name && !leadPayload.phone && !leadPayload.email) {
      return jsonError("El lead debe incluir al menos nombre, teléfono o email.", 400);
    }

    const supabase = createPublicServerClient();
    const { data, error } = await supabase.rpc("ingest_web_lead", {
      p_organization_id: organizationId,
      p_token: token,
      p_payload: leadPayload,
    });

    if (error) {
      const message = error.message || "No se pudo procesar el lead.";
      if (message.includes("Credenciales")) return jsonError("Credenciales de integración inválidas.", 401);
      if (message.includes("Enterprise")) return jsonError("La integración web está disponible en Enterprise.", 403);
      if (message.includes("límite")) return jsonError(message, 409);
      return jsonError(message, 400);
    }

    return NextResponse.json(data, { headers: corsHeaders });
  } catch {
    return jsonError("No se pudo procesar el lead.", 400);
  }
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanInteger(value: unknown) {
  const number = cleanNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: corsHeaders });
}
