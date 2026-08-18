import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWebIntegrationToken } from "@/lib/integrations/web-key";
import { POST as ingestWebLead } from "../web-leads/route";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const supabase = createAdminClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (error || !organization?.id) {
    return NextResponse.json(
      { ok: false, error: "No organization available for smoke test." },
      { status: 500 }
    );
  }

  const token = generateWebIntegrationToken(organization.id);

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Integration signing secret is not configured." },
      { status: 500 }
    );
  }

  const request = new Request("https://internal.revscale.test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organization_id: organization.id,
      token,
      full_name: "Prueba Integracion Web",
      phone: "099888777",
      email: "prueba.integracion.web@revscale.test",
      operation: "COMPRA",
      property_type: "APARTAMENTO",
      primary_zone: "Pocitos",
      budget_max: 250000,
      currency: "USD",
      bedrooms_min: 2,
    }),
  });

  return ingestWebLead(request);
}
