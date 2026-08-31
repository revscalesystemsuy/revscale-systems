import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function humanDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value));
}

export default async function CommercialFollowupPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data: opportunities } = await supabase
    .from("b2b_opportunities")
    .select("id,company,contact_name,stage,next_step,next_step_due_at,paid_at")
    .in("stage", ["PILOT_PROPOSED", "PILOT_ACTIVE", "PAID"])
    .order("next_step_due_at", { ascending: true });

  const ids = (opportunities || []).map((row) => row.id);
  const [{ data: proposals }, { data: pilots }, { data: closings }] = await Promise.all([
    ids.length ? supabase.from("b2b_proposals").select("opportunity_id,status").in("opportunity_id", ids) : Promise.resolve({ data: [] } as any),
    ids.length ? supabase.from("b2b_pilot_agreements").select("opportunity_id,status,sponsor_name,champion_name").in("opportunity_id", ids) : Promise.resolve({ data: [] } as any),
    ids.length ? supabase.from("b2b_closings").select("opportunity_id,status,payment_reference").in("opportunity_id", ids) : Promise.resolve({ data: [] } as any),
  ]);

  const proposalById = new Map<string, any>((proposals || []).map((row: any) => [row.opportunity_id, row]));
  const pilotById = new Map<string, any>((pilots || []).map((row: any) => [row.opportunity_id, row]));
  const closingById = new Map<string, any>((closings || []).map((row: any) => [row.opportunity_id, row]));
  const now = new Date();

  const rows = opportunities || [];
  const queues = [
    {
      title: "1. Decisión pendiente",
      subtitle: "Propuesta o piloto enviado, todavía sin aceptación operativa.",
      items: rows.filter((row) => row.stage === "PILOT_PROPOSED" && pilotById.get(row.id)?.status !== "ACCEPTED"),
    },
    {
      title: "2. Activación",
      subtitle: "Piloto aceptado: confirmar kickoff, sponsor, champion y fecha de arranque.",
      items: rows.filter((row) => ["PILOT_PROPOSED", "PILOT_ACTIVE"].includes(row.stage) && pilotById.get(row.id)?.status === "ACCEPTED"),
    },
    {
      title: "3. Pago verificable",
      subtitle: "La aceptación comercial no equivale a cobro.",
      items: rows.filter((row) => closingById.get(row.id)?.status === "COMMERCIAL_ACCEPTED" && !row.paid_at),
    },
    {
      title: "4. Handoff",
      subtitle: "Cliente pago: entregar contexto completo a onboarding.",
      items: rows.filter((row) => row.stage === "PAID"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/admin/sales/followups" className="text-sm text-[#7a6e5c]">← Volver a seguimientos</Link>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Fase 6 · Paso 55</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">Seguimiento comercial</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[#625d55]">Decisión pendiente, activación, pago verificable y handoff, siempre con próximo paso.</p>

        <section className="mt-8 grid gap-5 xl:grid-cols-2">
          {queues.map((queue) => (
            <section key={queue.title} className="rounded-2xl border border-[#d2c5b3] bg-[#fffaf2] p-5">
              <h2 className="font-serif text-2xl">{queue.title}</h2>
              <p className="mt-1 text-xs text-[#746c62]">{queue.subtitle}</p>
              <div className="mt-4 space-y-4">
                {queue.items.map((item: any) => {
                  const proposal = proposalById.get(item.id);
                  const pilot = pilotById.get(item.id);
                  const closing = closingById.get(item.id);
                  const overdue = item.next_step_due_at && new Date(item.next_step_due_at).getTime() < now.getTime();
                  const href = closing?.status === "COMMERCIAL_ACCEPTED" || item.stage === "PAID"
                    ? `/protected/admin/sales/closing/${item.id}`
                    : pilot
                      ? `/protected/admin/sales/pilots/${item.id}`
                      : `/protected/admin/sales/proposals/${item.id}`;

                  return (
                    <article key={item.id} className="rounded-xl border border-[#d8cbb8] bg-[#f7f0e6] p-4">
                      <h3 className="font-serif text-xl">{item.company}</h3>
                      <p className="mt-1 text-xs text-[#81786d]">{item.contact_name || "Contacto pendiente"} · {item.stage}</p>
                      <div className="mt-3 space-y-1 text-xs text-[#665f56]">
                        <p><strong>Próximo paso:</strong> {item.next_step || "Sin próximo paso"}</p>
                        <p><strong>Fecha:</strong> {item.next_step_due_at ? `${overdue ? "VENCIDO · " : ""}${humanDate(item.next_step_due_at)}` : "Sin fecha"}</p>
                        {proposal && <p><strong>Propuesta:</strong> {proposal.status}</p>}
                        {pilot && <p><strong>Piloto:</strong> {pilot.status} · sponsor {pilot.sponsor_name || "pendiente"} · champion {pilot.champion_name || "pendiente"}</p>}
                        {closing && <p><strong>Cierre:</strong> {closing.status}{closing.payment_reference ? ` · ${closing.payment_reference}` : ""}</p>}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link href={href} className="rounded-lg bg-[#302d28] px-4 py-2 text-xs font-semibold text-[#fffaf2]">Abrir siguiente gate</Link>
                        <Link href={`/protected/admin/sales/${item.id}`} className="rounded-lg border border-[#baa98f] bg-[#fffaf2] px-4 py-2 text-xs font-semibold text-[#574936]">Ficha comercial</Link>
                      </div>
                    </article>
                  );
                })}
                {!queue.items.length && <p className="rounded-xl border border-dashed border-[#cdbfa9] p-6 text-center text-xs text-[#81786d]">Sin oportunidades en esta cola.</p>}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
