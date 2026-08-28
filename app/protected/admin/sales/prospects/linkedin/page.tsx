import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDashed, ExternalLink, Linkedin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  linkedin_company_url: string | null;
  linkedin_company_quality: "UNKNOWN" | "VERIFIED";
  linkedin_company_evidence_url: string | null;
  decision_maker_name: string | null;
  decision_maker_role: string | null;
  decision_maker_quality: "UNKNOWN" | "PARTIAL" | "VERIFIED";
  decision_maker_linkedin_url: string | null;
  linkedin_dm_quality: "UNKNOWN" | "VERIFIED";
  linkedin_dm_evidence_url: string | null;
  linkedin_researched_at: string | null;
  linkedin_notes: string | null;
};

export default async function ProspectLinkedInPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,department,linkedin_company_url,linkedin_company_quality,linkedin_company_evidence_url,decision_maker_name,decision_maker_role,decision_maker_quality,decision_maker_linkedin_url,linkedin_dm_quality,linkedin_dm_evidence_url,linkedin_researched_at,linkedin_notes")
    .order("department", { ascending: true })
    .order("company_name", { ascending: true });

  const prospects = (data || []) as Prospect[];
  const researched = prospects.filter((item) => item.linkedin_researched_at).length;
  const companyVerified = prospects.filter((item) => item.linkedin_company_quality === "VERIFIED").length;
  const dmVerified = prospects.filter((item) => item.linkedin_dm_quality === "VERIFIED").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/prospects/email" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a Email</Link>
          <div className="flex flex-wrap gap-2"><Link href="/protected/admin/sales/icp" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Ver criterios ICP</Link><Link href="/protected/admin/sales/prospects/scoring" className="rounded-lg border border-[#8f7b60] bg-[#574936] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]">Paso 34 · Score 0–100</Link></div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Prospecting · Paso 33</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">LinkedIn</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Separación entre página oficial de empresa y perfil profesional atribuible al decisor o referente investigado. Directorios, homónimos y páginas de empresa usadas como perfil personal no cuentan como verificados.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="Investigadas" value={researched} detail={`de ${prospects.length} cuentas`} />
          <Metric label="Empresa verificada" value={companyVerified} detail="página LinkedIn inequívoca" />
          <Metric label="Decisor verificado" value={dmVerified} detail="perfil profesional atribuible" />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#fffaf2]">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead className="border-b border-[#ddd1c0] bg-[#eee5d8] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756b5f]">
                <tr><th className="p-4">Cuenta</th><th className="p-4">LinkedIn empresa</th><th className="p-4">Estado empresa</th><th className="p-4">Decisor / referente</th><th className="p-4">Rol investigado</th><th className="p-4">LinkedIn persona</th><th className="p-4">Estado perfil</th><th className="p-4">Conclusión</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e4d9ca]">
                {prospects.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="p-4"><p className="font-semibold text-[#39342e]">{item.company_name}</p><p className="mt-1 text-xs text-[#81786d]">{item.city} · {item.department}</p></td>
                    <td className="p-4">{item.linkedin_company_url ? <a href={item.linkedin_company_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#675743] underline decoration-[#a89271] underline-offset-4"><Linkedin size={13}/> Abrir</a> : "—"}</td>
                    <td className="p-4"><Quality value={item.linkedin_company_quality}/></td>
                    <td className="p-4"><p className="font-medium">{item.decision_maker_name || "No verificado"}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#81786d]">Rol: {item.decision_maker_quality}</p></td>
                    <td className="p-4 text-[#625d55]">{item.decision_maker_role || "—"}</td>
                    <td className="p-4">{item.decision_maker_linkedin_url ? <a href={item.decision_maker_linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#675743] underline decoration-[#a89271] underline-offset-4"><Linkedin size={13}/> Perfil</a> : "—"}</td>
                    <td className="p-4"><Quality value={item.linkedin_dm_quality}/></td>
                    <td className="p-4 max-w-md text-xs leading-5 text-[#71695f]">{item.linkedin_notes || "Investigada sin LinkedIn inequívoco."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]">
          <strong>Regla de outbound:</strong> un perfil LinkedIn VERIFIED confirma el canal, no necesariamente el poder de decisión. La calidad del cargo se conserva por separado para no convertir a un empleado o referente en owner por error.
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}

function Quality({ value }: { value: "UNKNOWN" | "VERIFIED" }) {
  const good = value === "VERIFIED";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${good ? "border-[#aeb99f] bg-[#e4e8dc] text-[#526047]" : "border-[#d0c9bd] bg-[#eeeae3] text-[#726b61]"}`}>{good ? <CheckCircle2 size={12}/> : <CircleDashed size={12}/>} {value}</span>;
}
