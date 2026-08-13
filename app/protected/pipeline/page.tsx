import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export default function PipelinePage() {
  return (
    <Suspense fallback={<PipelineSkeleton />}>
      <PipelineContent />
    </Suspense>
  );
}

async function PipelineContent() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, full_name, phone, primary_zone, operation, budget_max, currency, lead_temperature, lead_score, next_action"
    )
    .order("lead_score", { ascending: false });

  const hot = leads?.filter((lead) => lead.lead_temperature === "HOT") ?? [];

  const warm =
    leads?.filter((lead) => lead.lead_temperature === "WARM") ?? [];

  const cold =
    leads?.filter((lead) => lead.lead_temperature === "COLD") ?? [];

  const unclassified =
    leads?.filter(
      (lead) =>
        !lead.lead_temperature ||
        !["HOT", "WARM", "COLD"].includes(lead.lead_temperature)
    ) ?? [];

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-400">
            Pipeline comercial
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Prioridades de ventas
          </h1>

          <p className="mt-2 text-slate-400">
            Visualizá rápidamente qué leads necesitan atención primero.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            No se pudo cargar el pipeline.
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-4">
          <PipelineColumn
            title="HOT"
            subtitle="Alta prioridad"
            leads={hot}
          />

          <PipelineColumn
            title="WARM"
            subtitle="Seguimiento"
            leads={warm}
          />

          <PipelineColumn
            title="COLD"
            subtitle="Baja prioridad"
            leads={cold}
          />

          <PipelineColumn
            title="SIN CLASIFICAR"
            subtitle="Pendientes"
            leads={unclassified}
          />
        </section>
      </div>
    </main>
  );
}

type Lead = {
  id: string;
  full_name: string | null;
  phone: string;
  primary_zone: string | null;
  operation: string | null;
  budget_max: number | null;
  currency: string | null;
  lead_temperature: string | null;
  lead_score: number | null;
  next_action: string | null;
};

function PipelineColumn({
  title,
  subtitle,
  leads,
}: {
  title: string;
  subtitle: string;
  leads: Lead[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-semibold">
          {leads.length}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/protected/leads/${lead.id}`}
            className="block rounded-xl border border-white/10 bg-slate-900 p-4 transition hover:border-blue-500/40 hover:bg-slate-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {lead.full_name || "Sin nombre"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {lead.phone}
                </p>
              </div>

              <span className="text-xl font-bold text-blue-400">
                {lead.lead_score ?? "—"}
              </span>
            </div>

            <div className="mt-4 space-y-1 text-sm text-slate-400">
              <p>{lead.primary_zone || "Zona sin definir"}</p>

              <p>
                {lead.operation || "Operación sin definir"}
              </p>

              <p>
                {lead.budget_max
                  ? `${lead.currency || ""} ${Number(
                      lead.budget_max
                    ).toLocaleString()}`
                  : "Presupuesto sin definir"}
              </p>
            </div>

            <div className="mt-4 border-t border-white/5 pt-3">
              <p className="text-xs text-slate-500">
                Próxima acción
              </p>

              <p className="mt-1 text-sm font-medium text-slate-200">
                {lead.next_action || "Sin acción definida"}
              </p>
            </div>
          </Link>
        ))}

        {!leads.length && (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-600">
            No hay leads
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-[1600px] animate-pulse">
        <div className="h-8 w-64 rounded bg-white/10" />

        <div className="mt-8 grid gap-5 xl:grid-cols-4">
          <div className="h-96 rounded-2xl bg-white/5" />
          <div className="h-96 rounded-2xl bg-white/5" />
          <div className="h-96 rounded-2xl bg-white/5" />
          <div className="h-96 rounded-2xl bg-white/5" />
        </div>
      </div>
    </main>
  );
}