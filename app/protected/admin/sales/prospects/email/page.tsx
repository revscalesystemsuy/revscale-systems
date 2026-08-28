import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDashed, ExternalLink, Linkedin, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  department: string;
  public_email: string | null;
  email_quality: "UNKNOWN" | "VERIFIED";
  email_evidence_url: string | null;
  email_notes: string | null;
  email_researched_at: string | null;
};

export default async function ProspectEmailPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/protected");

  const { data } = await supabase
    .from("b2b_prospects")
    .select("id,company_name,city,department,public_email,email_quality,email_evidence_url,email_notes,email_researched_at")
    .order("department", { ascending: true })
    .order("company_name", { ascending: true });

  const prospects = (data || []) as Prospect[];
  const researched = prospects.filter((item) => item.email_researched_at).length;
  const verified = prospects.filter((item) => item.email_quality === "VERIFIED").length;
  const unknown = prospects.filter((item) => item.email_quality === "UNKNOWN").length;

  return (
    <main className="min-h-screen bg-[#f3ecdf] p-6 text-[#302d28] md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/protected/admin/sales/prospects/phone-whatsapp" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a Teléfono / WhatsApp</Link>
          <div className="flex flex-wrap gap-2"><Link href="/protected/admin/sales/prospects/linkedin" className="inline-flex items-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold text-[#fffaf2]"><Linkedin size={15}/> LinkedIn</Link><Link href="/protected/admin/sales/prospects" className="rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#574936]">Base de prospectos</Link></div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Prospecting · Paso 32</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Email</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Emails comerciales publicados por la empresa o por una fuente profesional atribuible. No se generan direcciones por patrón ni se adivinan emails personales.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="Investigadas" value={researched} detail={`de ${prospects.length} cuentas`} />
          <Metric label="Email verificado" value={verified} detail="dirección pública utilizable" />
          <Metric label="Unknown" value={unknown} detail="sin email público verificable" />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#fffaf2]">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-[#ddd1c0] bg-[#eee5d8] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756b5f]">
                <tr><th className="p-4">Cuenta</th><th className="p-4">Email</th><th className="p-4">Estado</th><th className="p-4">Evidencia</th><th className="p-4">Conclusión</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e4d9ca]">
                {prospects.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="p-4"><p className="font-semibold text-[#39342e]">{item.company_name}</p><p className="mt-1 text-xs text-[#81786d]">{item.city} · {item.department}</p></td>
                    <td className="p-4">{item.public_email ? <span className="inline-flex items-center gap-1.5 break-all"><Mail size={13}/>{item.public_email}</span> : "—"}</td>
                    <td className="p-4"><Quality value={item.email_quality}/></td>
                    <td className="p-4">{item.email_evidence_url ? <a href={item.email_evidence_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#675743] underline decoration-[#a89271] underline-offset-4"><ExternalLink size={13}/> Fuente</a> : "—"}</td>
                    <td className="p-4 max-w-md text-xs leading-5 text-[#71695f]">{item.email_notes || "Sin nota."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#cdbfa9] bg-[#efe5d6] p-5 text-sm leading-6 text-[#625d55]">
          <strong>Regla de calidad:</strong> UNKNOWN significa investigación completada sin encontrar una dirección pública suficientemente atribuible. No se usan patrones como nombre@dominio para completar la base.
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#fffaf2] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#81796e]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div>;
}

function Quality({ value }: { value: Prospect["email_quality"] }) {
  const good = value === "VERIFIED";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${good ? "border-[#aeb99f] bg-[#e4e8dc] text-[#526047]" : "border-[#d0c9bd] bg-[#eeeae3] text-[#726b61]"}`}>{good ? <CheckCircle2 size={12}/> : <CircleDashed size={12}/>} {value}</span>;
}
