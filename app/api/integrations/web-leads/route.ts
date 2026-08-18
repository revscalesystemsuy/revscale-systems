import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebIntegrationToken } from "@/lib/integrations/web-key";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const organizationId = cleanString(payload.organization_id, 100);
    const token = cleanString(payload.token, 200);

    if (!organizationId || !token) {
      return jsonError("Faltan credenciales de integración.", 400);
    }

    if (!verifyWebIntegrationToken(organizationId, token)) {
      return jsonError("Credenciales de integración inválidas.", 401);
    }

    const fullName = cleanString(payload.full_name, 160);
    const phone = cleanString(payload.phone, 80);
    const email = cleanString(payload.email, 180).toLowerCase();
    const primaryZone = cleanString(payload.primary_zone, 160);
    const operation = cleanString(payload.operation, 50).toUpperCase();
    const propertyType = cleanString(payload.property_type, 80).toUpperCase();
    const currency = cleanString(payload.currency || "USD", 10).toUpperCase();
    const budgetMax = cleanNumber(payload.budget_max);
    const bedroomsMin = cleanNumber(payload.bedrooms_min);

    if (!fullName && !phone && !email) {
      return jsonError(
        "El lead debe incluir al menos nombre, teléfono o email.",
        400
      );
    }

    const supabase = createAdminClient();

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single();

    if (organizationError || !organization) {
      return jsonError("Organización no encontrada.", 404);
    }

    let existingLead: { id: string; lead_score: number | null } | null = null;

    if (phone) {
      const { data } = await supabase
        .from("leads")
        .select("id, lead_score")
        .eq("organization_id", organizationId)
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      existingLead = data;
    }

    if (!existingLead && email) {
      const { data } = await supabase
        .from("leads")
        .select("id, lead_score")
        .eq("organization_id", organizationId)
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      existingLead = data;
    }

    const score = calculateInitialScore({
      primaryZone,
      budgetMax,
      bedroomsMin,
    });

    const temperature =
      score >= 80 ? "HOT" : score >= 50 ? "WARM" : "COLD";

    const leadData = {
      organization_id: organizationId,
      ...(fullName ? { full_name: fullName } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(primaryZone ? { primary_zone: primaryZone } : {}),
      ...(operation ? { operation } : {}),
      ...(propertyType ? { property_type: propertyType } : {}),
      ...(budgetMax !== null ? { budget_max: budgetMax } : {}),
      ...(currency ? { currency } : {}),
      ...(bedroomsMin !== null ? { bedrooms_min: bedroomsMin } : {}),
      lead_score: Math.max(existingLead?.lead_score ?? 0, score),
      lead_temperature:
        Math.max(existingLead?.lead_score ?? 0, score) >= 80
          ? "HOT"
          : Math.max(existingLead?.lead_score ?? 0, score) >= 50
          ? "WARM"
          : temperature,
      next_action: "Contactar lead recibido desde la web",
    };

    if (existingLead) {
      const { data, error } = await supabase
        .from("leads")
        .update(leadData)
        .eq("id", existingLead.id)
        .select("id")
        .single();

      if (error) {
        return jsonError(error.message, 500);
      }

      return NextResponse.json(
        {
          ok: true,
          action: "updated",
          lead_id: data.id,
        },
        { headers: corsHeaders }
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("max_leads")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (subscription?.max_leads) {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);

      if (count !== null && count >= subscription.max_leads) {
        return jsonError("La organización alcanzó el límite de leads.", 409);
      }
    }

    const { data, error } = await supabase
      .from("leads")
      .insert(leadData)
      .select("id")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json(
      {
        ok: true,
        action: "created",
        lead_id: data.id,
      },
      { headers: corsHeaders }
    );
  } catch {
    return jsonError("No se pudo procesar el lead.", 400);
  }
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function calculateInitialScore({
  primaryZone,
  budgetMax,
  bedroomsMin,
}: {
  primaryZone: string;
  budgetMax: number | null;
  bedroomsMin: number | null;
}) {
  let score = 30;

  if (primaryZone) {
    score += 20;
  }

  if (budgetMax) {
    score += 25;
  }

  if (bedroomsMin) {
    score += 15;
  }

  return score;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status,
      headers: corsHeaders,
    }
  );
}
