import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export default function InteractionsPage() {
  return (
    <Suspense fallback={<InteractionsSkeleton />}>
      <InteractionsContent />
    </Suspense>
  );
}

async function InteractionsContent() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const { data: interactions, error } = await supabase
    .from("interactions")
    .select(
      `
      id,
      lead_id,
      channel,
      direction,
      actor,
      message,
      ai_response,
      detected_intent,
      lead_score_after,
      requires_human,
      created_at
      `
    )
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-400">
            Actividad comercial
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Interacciones
          </h1>

          <p className="mt-2 text-slate-400">
            Conversaciones y actividad registrada con tus leads.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            No se pudieron cargar las interacciones.
          </div>
        )}

        <div className="space-y-4">
          {interactions?.map((interaction) => (
            <div
              key={interaction.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                    {interaction.channel || "CANAL"}
                  </span>

                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                    {interaction.direction || "—"}
                  </span>

                  {interaction.detected_intent && (
                    <span className="text-xs font-medium text-slate-500">
                      {interaction.detected_intent}
                    </span>
                  )}
                </div>

                <Link
                  href={`/protected/leads/${interaction.lead_id}`}
                  className="text-sm font-semibold text-blue-400 hover:text-blue-300"
                >
                  Ver lead →
                </Link>
              </div>

              {interaction.message && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Mensaje
                  </p>

                  <p className="mt-2 text-slate-200">
                    {interaction.message}
                  </p>
                </div>
              )}

              {interaction.ai_response && (
                <div className="mt-4 rounded-xl bg-blue-500/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-blue-400">
                    Respuesta AI
                  </p>

                  <p className="mt-2 text-slate-300">
                    {interaction.ai_response}
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-6 text-xs text-slate-500">
                <span>
                  Score después:{" "}
                  {interaction.lead_score_after ?? "—"}
                </span>

                <span>
                  Atención humana:{" "}
                  {interaction.requires_human ? "Sí" : "No"}
                </span>

                <span>
                  {interaction.created_at
                    ? new Date(
                        interaction.created_at
                      ).toLocaleString("es-UY")
                    : ""}
                </span>
              </div>
            </div>
          ))}

          {!interactions?.length && !error && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-slate-500">
              Todavía no hay interacciones registradas.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function InteractionsSkeleton() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-8 w-48 rounded bg-white/10" />

        <div className="mt-8 space-y-4">
          <div className="h-40 rounded-2xl bg-white/5" />
          <div className="h-40 rounded-2xl bg-white/5" />
        </div>
      </div>
    </main>
  );
}