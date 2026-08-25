import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  MessageSquareText,
  UserRoundCheck,
} from "lucide-react";

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  PHONE: "Teléfono",
  WEB: "Web",
  MANUAL: "Manual",
};

const DIRECTION_LABELS: Record<string, string> = {
  INBOUND: "Entrante",
  OUTBOUND: "Saliente",
};

const INTENT_LABELS: Record<string, string> = {
  ENVIAR_PROPIEDAD: "Propiedad enviada",
  CONTACTAR_LEAD: "Contacto realizado",
};

const ACTOR_LABELS: Record<string, string> = {
  AI: "Asistente",
  USER: "Equipo",
  SYSTEM: "Sistema",
  LEAD: "Lead",
};

function humanizeFallback(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMontevideoDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InteractionsPage() {
  return (
    <Suspense fallback={<InteractionsSkeleton />}>
      <InteractionsContent />
    </Suspense>
  );
}

async function InteractionsContent() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) redirect("/auth/login");

  const userId = claimsData.claims.sub;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) redirect("/protected");

  const { data: interactions, error } = await supabase
    .from("interactions")
    .select(
      "id,lead_id,channel,direction,actor,message,ai_response,detected_intent,lead_score_after,requires_human,created_at",
    )
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  const leadIds = Array.from(new Set((interactions || []).map((interaction) => interaction.lead_id).filter(Boolean))) as string[];
  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id,full_name")
        .eq("organization_id", membership.organization_id)
        .in("id", leadIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const leadNameById = new Map((leads || []).map((lead) => [lead.id, lead.full_name || "Lead sin nombre"]));
  const total = interactions?.length || 0;
  const inbound = (interactions || []).filter((interaction) => interaction.direction === "INBOUND").length;
  const outbound = (interactions || []).filter((interaction) => interaction.direction === "OUTBOUND").length;
  const humanAttention = (interactions || []).filter((interaction) => interaction.requires_human).length;

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Actividad comercial</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Interacciones</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d55] md:text-[15px]">
              Conversaciones y actividad registrada con los leads que tenés dentro de tu alcance comercial.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#d2c5b3] bg-[#f7f0e6] px-4 py-2 text-xs font-semibold text-[#6f6252]">
            <MessageSquareText size={15} strokeWidth={1.6} />
            {total} registradas
          </div>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total" value={total} helper="Actividad visible" />
          <SummaryCard label="Entrantes" value={inbound} helper="Mensajes recibidos" />
          <SummaryCard label="Salientes" value={outbound} helper="Acciones del equipo" />
          <SummaryCard label="Atención humana" value={humanAttention} helper="Requieren revisión" />
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-[#d6bdb3] bg-[#f3e4df] p-4 text-sm text-[#7a5147]">
            No se pudieron cargar las interacciones.
          </div>
        )}

        <div className="mt-8 space-y-4">
          {interactions?.map((interaction) => {
            const isInbound = interaction.direction === "INBOUND";
            const leadName = leadNameById.get(interaction.lead_id) || "Lead";
            const channel = interaction.channel
              ? CHANNEL_LABELS[interaction.channel] || humanizeFallback(interaction.channel)
              : "Canal no informado";
            const direction = interaction.direction
              ? DIRECTION_LABELS[interaction.direction] || humanizeFallback(interaction.direction)
              : "Sin dirección";
            const intent = interaction.detected_intent
              ? INTENT_LABELS[interaction.detected_intent] || humanizeFallback(interaction.detected_intent)
              : null;
            const actor = interaction.actor
              ? ACTOR_LABELS[interaction.actor] || humanizeFallback(interaction.actor)
              : "Sin origen";

            return (
              <article key={interaction.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d2c5b3] bg-[#fffaf2] px-3 py-1 text-xs font-semibold text-[#655a4b]">
                        {channel}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cdc3b4] bg-[#eee6da] px-3 py-1 text-xs font-semibold text-[#62594e]">
                        {isInbound ? <ArrowDownLeft size={13} strokeWidth={1.7} /> : <ArrowUpRight size={13} strokeWidth={1.7} />}
                        {direction}
                      </span>
                      {intent && (
                        <span className="rounded-full border border-[#d7c8b3] bg-[#f1e8da] px-3 py-1 text-xs font-medium text-[#756448]">
                          {intent}
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8176]">Lead</p>
                      <h2 className="mt-1 text-lg font-semibold text-[#312e29]">{leadName}</h2>
                    </div>
                  </div>

                  <Link
                    href={`/protected/leads/${interaction.lead_id}`}
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5b5144] transition hover:bg-[#f2e9dc]"
                  >
                    Ver ficha
                    <ArrowRight size={15} strokeWidth={1.7} />
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  {interaction.message && (
                    <div className="rounded-xl border border-[#ded2c2] bg-[#fffaf2] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8176]">Mensaje</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4f4941]">{interaction.message}</p>
                    </div>
                  )}

                  {interaction.ai_response && (
                    <div className="rounded-xl border border-[#d8ccb9] bg-[#eee6da] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b6b56]">Respuesta del asistente</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#514a42]">{interaction.ai_response}</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#ddd0bf] pt-4 text-xs text-[#7c746a]">
                  <span>Origen: <strong className="font-semibold text-[#5a534b]">{actor}</strong></span>
                  <span>Score después: <strong className="font-semibold text-[#5a534b]">{interaction.lead_score_after ?? "—"}</strong></span>
                  <span className="inline-flex items-center gap-1.5">
                    <UserRoundCheck size={13} strokeWidth={1.6} />
                    Atención humana: <strong className="font-semibold text-[#5a534b]">{interaction.requires_human ? "Sí" : "No"}</strong>
                  </span>
                  <span>{formatMontevideoDate(interaction.created_at)} · hora de Uruguay</span>
                </div>
              </article>
            );
          })}

          {!interactions?.length && !error && (
            <div className="rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-12 text-center">
              <MessageSquareText className="mx-auto text-[#9b8769]" size={28} strokeWidth={1.5} />
              <p className="mt-4 text-base font-semibold text-[#3f3a34]">Todavía no hay interacciones registradas</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746d64]">
                Cuando haya mensajes, contactos o respuestas asociadas a tus leads, van a aparecer acá en orden cronológico.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8176]">{label}</p>
      <p className="mt-2 font-serif text-3xl font-medium text-[#302d28]">{value}</p>
      <p className="mt-1 text-xs text-[#7b746a]">{helper}</p>
    </div>
  );
}

function InteractionsSkeleton() {
  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-3 w-36 rounded bg-[#ddd0bf]" />
        <div className="mt-4 h-12 w-64 rounded bg-[#e5dacb]" />
        <div className="mt-3 h-5 w-full max-w-xl rounded bg-[#eadfd1]" />

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]" />
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <div className="h-56 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]" />
          <div className="h-56 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]" />
        </div>
      </div>
    </main>
  );
}
