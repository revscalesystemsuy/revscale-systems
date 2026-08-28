import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, MapPin, Search, Signal, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Prospect = {
  id: string;
  company_name: string;
  website_url: string | null;
  city: string;
  department: string;
  country: string;
  discovery_source: string;
  discovery_url: string | null;
  listing_count_hint: number | null;
  discovery_note: string | null;
  status: "RESEARCH" | "ENRICHING" | "READY" | "DISQUALIFIED" | "PROMOTED";
  created_at: string;
};

const statusLabels: Record<Prospect["status"], string> = {
  RESEARCH: "Research",
  ENRICHING: "Enrichment",
  READY: "Lista para outbound",
  DISQUALIFIED: "Descartada",
  PROMOTED: "Promovida",
};

const sourceLabels: Record<string, string> = {
  GOOGLE_MAPS: "Google Maps",
  DIRECTORY: "Directorio",
  WEB_SEARCH: "Búsqueda web",
  REFERRAL: "Referral",
  MANUAL: "Manual",
};

export default async function ProspectBasePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,website_url,city,department,country,discovery_source,discovery_url,listing_count_hint,discovery_note,status,created_at")
    .order("department", { ascending: true })
    .order("company_name", { ascending: true });

  const prospects = (data || []) as Prospect[];
  const departments = ["Montevideo", "Maldonado", "Canelones"];
  const ready = prospects.filter((item) => item.status === "READY").length;
  const researching = prospects.filter((item) => ["RESEARCH", "ENRICHING"].includes(item.status)).length;
  const withInventorySignal = prospects.filter((item) => item.listing_count_hint !== null).length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver al pipeline</Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/protected/admin/sales/prospects/enrichment" className="rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Ver enrichment</Link>
            <Link href="/protected/admin/sales/icp" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver ICP exacto</Link>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Prospecting · Paso 28</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Base inicial de prospectos</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Longlist real separada del pipeline comercial. Una cuenta permanece acá hasta que tenga suficiente información para calificarla y decidir si merece outbound.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Building2 size={17}/>} label="Cuentas" value={prospects.length} detail="longlist inicial" />
          <Metric icon={<Search size={17}/>} label="En research" value={researching} detail="sin score forzado" />
          <Metric icon={<Sparkles size={17}/>} label="Listas para outbound" value={ready} detail="requieren enrichment completo" />
          <Metric icon={<Signal size={17}/>} label="Con señal de inventario" value={withInventorySignal} detail="dato visible en fuente pública" />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {departments.map((department) => {
            const rows = prospects.filter((item) => item.department === department);
            return (
              <div key={department} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5">
                <div className="flex items-center justify-between gap-3 border-b border-[#ddd1c0] pb-4">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d7553]">Plaza prioritaria</p><h2 className="mt-1 font-serif text-2xl">{department}</h2></div>
                  <span className="rounded-full border border-[#c8b89f] bg-[#fffaf2] px-3 py-1 text-xs font-semibold text-[#665642]">{rows.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {rows.map((item) => (
                    <article key={item.id} className="rounded-xl border border-[#d8cbb8] bg-[#fffaf2] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><h3 className="font-semibold text-[#39342e]">{item.company_name}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-[#7d7468]"><MapPin size={12}/>{item.city}</p></div>
                        <span className="shrink-0 rounded-full border border-[#cbbda8] bg-[#efe5d6] px-2 py-1 text-[10px] font-semibold text-[#665642]">{statusLabels[item.status]}</span>
                      </div>
                      <div className="mt-3 text-xs leading-5 text-[#6f675d]">
                        <p>Fuente: {sourceLabels[item.discovery_source] || item.discovery_source}</p>
                        <p>Inventario visible: {item.listing_count_hint === null ? "Sin medir" : item.listing_count_hint.toLocaleString("es-UY")}</p>
                      </div>
                      {item.discovery_note && <p className="mt-3 text-xs leading-5 text-[#81786d]">{item.discovery_note}</p>}
                      {item.discovery_url && <a href={item.discovery_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#675743] underline decoration-[#a89271] underline-offset-4">Abrir evidencia</a>}
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <div className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]">
          <strong>Regla de calidad:</strong> estar en esta base no significa ser Tier A/B/C. El score solo se asigna cuando las señales del ICP están suficientemente verificadas. El siguiente paso es enrichment de empresa, operación y stack antes de buscar al owner/manager.
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><div className="flex items-center gap-2 text-[#756247]">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p></div><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}
