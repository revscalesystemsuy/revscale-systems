import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default function NewFollowupPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-6 md:p-8 lg:p-10">
          <div className="mx-auto max-w-3xl text-sm text-[#746b60]">Cargando formulario...</div>
        </main>
      }
    >
      <NewFollowupContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NewFollowupContent({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) redirect("/protected");

  const { lead: preselectedLeadId } = await searchParams;
  const { data: leads } = await supabase
    .from("leads")
    .select("id,full_name,phone,assigned_to")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  const validPreselectedLead = (leads || []).some((lead) => lead.id === preselectedLeadId)
    ? preselectedLeadId
    : "";

  async function createFollowup(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) throw new Error("Usuario no autenticado");

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .single();
    if (!membership) throw new Error("Sin organización activa");

    const leadId = String(formData.get("lead_id") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const dueAtLocal = String(formData.get("due_at") || "").trim();
    const priority = String(formData.get("priority") || "MEDIUM").trim();

    if (!leadId || !title || !dueAtLocal) throw new Error("Lead, título y fecha son obligatorios");
    if (!["LOW", "MEDIUM", "HIGH"].includes(priority)) throw new Error("Prioridad inválida");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueAtLocal)) throw new Error("Fecha inválida");

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("organization_id,assigned_to")
      .eq("id", leadId)
      .eq("organization_id", membership.organization_id)
      .single();

    if (leadError || !lead) throw new Error("No se encontró el lead o no tenés acceso");

    // Uruguay uses UTC-03:00 year-round. datetime-local has no timezone, so make the business timezone explicit.
    const dueAt = new Date(`${dueAtLocal}:00-03:00`);
    if (Number.isNaN(dueAt.getTime())) throw new Error("Fecha inválida");

    const { error } = await supabase.from("followups").insert({
      organization_id: lead.organization_id,
      lead_id: leadId,
      assigned_to: lead.assigned_to || userId,
      title,
      notes: notes || null,
      due_at: dueAt.toISOString(),
      priority,
      status: "PENDING",
    });

    if (error) throw new Error(error.message);
    redirect("/protected/followups");
  }

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/protected/followups"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e604e] hover:text-[#443c31]"
        >
          <ArrowLeft size={15} strokeWidth={1.7} />
          Volver a seguimientos
        </Link>

        <div className="mt-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Gestión comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722]">Nuevo seguimiento</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55]">
              Programá el próximo contacto con una fecha concreta y dejá claro qué tiene que pasar después.
            </p>
          </div>
          <CalendarClock size={24} strokeWidth={1.5} className="mt-1 shrink-0 text-[#8b7558]" />
        </div>

        <form
          action={createFollowup}
          className="mt-8 space-y-6 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)] md:p-7"
        >
          <Field label="Lead" hint="Solo aparecen leads dentro de tu alcance actual.">
            <select
              name="lead_id"
              required
              defaultValue={validPreselectedLead}
              className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3.5 py-3 text-sm text-[#4f493f] outline-none transition focus:border-[#9e896d]"
            >
              <option value="">Seleccionar lead</option>
              {(leads || []).map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.full_name || "Sin nombre"}{lead.phone ? ` · ${lead.phone}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Próxima acción">
            <input
              name="title"
              required
              placeholder="Ej: Confirmar visita"
              className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3.5 py-3 text-sm text-[#4f493f] outline-none placeholder:text-[#a1988d] focus:border-[#9e896d]"
            />
          </Field>

          <Field label="Notas" hint="Contexto breve para que cualquier miembro del equipo entienda el seguimiento.">
            <textarea
              name="notes"
              rows={4}
              placeholder="Detalles del seguimiento..."
              className="mt-2 w-full resize-y rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3.5 py-3 text-sm leading-6 text-[#4f493f] outline-none placeholder:text-[#a1988d] focus:border-[#9e896d]"
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Fecha y hora" hint="Se interpreta en hora de Uruguay.">
              <input
                name="due_at"
                type="datetime-local"
                required
                className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3.5 py-3 text-sm text-[#4f493f] outline-none focus:border-[#9e896d]"
              />
            </Field>

            <Field label="Prioridad">
              <select
                name="priority"
                defaultValue="MEDIUM"
                className="mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3.5 py-3 text-sm text-[#4f493f] outline-none focus:border-[#9e896d]"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ddd1c0] pt-5">
            <p className="max-w-md text-xs leading-5 text-[#81796e]">
              El responsable será el agente asignado al lead; si todavía no tiene uno, queda asignado a quien crea el seguimiento.
            </p>
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">
              <CheckCircle2 size={16} strokeWidth={1.7} />
              Crear seguimiento
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-[#554f47]">{label}</label>
      {hint && <p className="mt-1 text-xs leading-5 text-[#8a8176]">{hint}</p>}
      {children}
    </div>
  );
}
