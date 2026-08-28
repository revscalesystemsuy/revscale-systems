import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDashed, Globe2, Mail, Phone, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  status: string;
  official_website_url: string | null;
  public_phone: string | null;
  public_email: string | null;
  linkedin_company_url: string | null;
  instagram_url: string | null;
  whatsapp_public: boolean | null;
  team_size_hint: number | null;
  lead_sources_hint: number | null;
  listing_count_hint: number | null;
  portal_presence: string[];
  website_has_whatsapp: boolean | null;
  enrichment_quality: "UNVERIFIED" | "PARTIAL" | "VERIFIED";
  enriched_at: string | null;
};

function completeness(item: Prospect) {
  const signals = [
    item.official_website_url,
    item.public_phone,
    item.public_email,
    item.team_size_hint,
    item.listing_count_hint,
    item.portal_presence?.length ? item.portal_presence.join(",") : null,
    item.whatsapp_public === null ? null : String(item.whatsapp_public),
  ];
  return signals.filter((value) => value !== null && value !== "").length;
}

export default async function ProspectEnrichmentPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,department,status,official_website_url,public_phone,public_email,linkedin_company_url,instagram_url,whatsapp_public,team_size_hint,lead_sources_hint,listing_count_hint,portal_presence,website_has_whatsapp,enrichment_quality,enriched_at")
    .order("department", { ascending: true })
    .order("company_name", { ascending: true });

  const prospects = (data || []) as Prospect[];
  const verified = prospects.filter((item) => item.enrichment_quality === "VERIFIED").length;
  const partial = prospects.filter((item) => item.enrichment_quality === "PARTIAL").length;
  const withPhone = prospects.filter((item) => item.public_phone).length;
  const withEmail = prospects.filter((item) => item.public_email).length;
  const withWebsite = prospects.filter((item) => item.official_website_url).length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/prospects" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a prospectos</Link>
          <Link href="/protected/admin/sales/icp" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver scoring ICP</Link>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Prospecting · Paso 29</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Enrichment de cuentas</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Señales públicas de empresa y operación antes de buscar al decisor. Un dato parcial se conserva como parcial; no asignamos Tier por intuición.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Verificadas" value={verified} detail="evidencia fuerte" />
          <Metric label="Parciales" value={partial} detail="requieren más evidencia" />
          <Metric label="Con teléfono" value={withPhone} detail={`de ${prospects.length} cuentas`} />
          <Metric label="Con email" value={withEmail} detail={`de ${prospects.length} cuentas`} />
          <Metric label="Con web" value={withWebsite} detail={`de ${prospects.length} cuentas`} />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#fffaf2]">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead className="border-b border-[#ddd1c0] bg-[#eee5d8] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756b5f]">
                <tr><th className="p-4">Cuenta</th><th className="p-4">Calidad</th><th className="p-4">Web</th><th className="p-4">Teléfono</th><th className="p-4">Email</th><th className="p-4">Equipo</th><th className="p-4">Inventario</th><th className="p-4">Portales</th><th className="p-4">Cobertura</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e4d9ca]">
                {prospects.map((item) => {
                  const score = completeness(item);
                  return <tr key={item.id} className="align-top">
                    <td className="p-4"><p className="font-semibold text-[#39342e]">{item.company_name}</p><p className="mt-1 text-xs text-[#81786d]">{item.city} · {item.department}</p></td>
                    <td className="p-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${item.enrichment_quality === "VERIFIED" ? "border-[#aeb99f] bg-[#e4e8dc] text-[#526047]" : "border-[#d0b995] bg-[#efe3cf] text-[#795f3d]"}`}>{item.enrichment_quality === "VERIFIED" ? <CheckCircle2 size={12}/> : <CircleDashed size={12}/>} {item.enrichment_quality}</span></td>
                    <td className="p-4">{item.official_website_url ? <a className="inline-flex items-center gap-1.5 font-medium text-[#675743] underline decoration-[#a89271] underline-offset-4" href={item.official_website_url} target="_blank" rel="noreferrer"><Globe2 size={13}/> Abrir</a> : <span className="text-[#9a9185]">—</span>}</td>
                    <td className="p-4">{item.public_phone ? <span className="inline-flex items-center gap-1.5"><Phone size={13}/>{item.public_phone}</span> : "—"}</td>
                    <td className="p-4">{item.public_email ? <span className="inline-flex items-center gap-1.5 break-all"><Mail size={13}/>{item.public_email}</span> : "—"}</td>
                    <td className="p-4">{item.team_size_hint ? <span className="inline-flex items-center gap-1.5"><UsersRound size={13}/>{item.team_size_hint} aprox.</span> : "—"}</td>
                    <td className="p-4">{item.listing_count_hint === null ? "—" : item.listing_count_hint.toLocaleString("es-UY")}</td>
                    <td className="p-4">{item.portal_presence?.length ? item.portal_presence.join(", ") : "—"}</td>
                    <td className="p-4"><strong>{score}/7</strong><p className="mt-1 text-[10px] text-[#81786d]">señales visibles</p></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]">
          <strong>Qué no hacemos todavía:</strong> no buscamos nombres de owners/managers ni promovemos cuentas a oportunidad. El Paso 30 identifica al decisor; después se completan WhatsApp, email y LinkedIn de contacto en los pasos 31–33.
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}
