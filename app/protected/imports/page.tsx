import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Database, Download, FileSpreadsheet, Upload } from "lucide-react";
import { importLeads, importProperties } from "./actions";

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) redirect("/protected");

  const canImport = ["OWNER", "MANAGER"].includes(membership.role);
  const imported = Number(typeof params.imported === "string" ? params.imported : 0);
  const duplicates = Number(typeof params.duplicates === "string" ? params.duplicates : 0);
  const type = typeof params.type === "string" ? params.type : "";
  const error = typeof params.error === "string" ? params.error : "";
  const returnTo = params.return_to === "onboarding" ? "onboarding" : "";
  const backHref = returnTo ? "/protected/onboarding" : "/protected";
  const backLabel = returnTo ? "Volver a puesta en marcha" : "Dashboard";

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href={backHref} className="text-sm font-medium text-[#7a674c] transition hover:text-[#302d28]">← {backLabel}</Link>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Carga inicial</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Importar datos</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55] md:text-[15px]">Importá leads y propiedades desde archivos CSV sin cargarlos uno por uno. RevScale valida el archivo, evita duplicados y respeta los límites de tu plan.</p>
        </div>

        {error && <div className="mt-6 rounded-xl border border-[#d9b7aa] bg-[#f4e4dc] p-4 text-sm text-[#7b4539]">{error}</div>}

        {type && !error && (
          <div className="mt-6 rounded-xl border border-[#c8cfb3] bg-[#edf0e3] p-4 text-sm text-[#596146]">
            Importación terminada: <b>{imported}</b> {type === "leads" ? "leads" : "propiedades"} importados.
            {duplicates > 0 && <> Se omitieron <b>{duplicates}</b> duplicados.</>}
            {returnTo && <Link href="/protected/onboarding" className="ml-2 font-semibold underline underline-offset-2">Continuar onboarding</Link>}
          </div>
        )}

        {!canImport ? (
          <section className="mt-8 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-7">
            <h2 className="font-serif text-2xl font-medium text-[#37332d]">Importación restringida</h2>
            <p className="mt-2 text-sm leading-6 text-[#665f56]">Solo Director o Gerente pueden importar datos masivamente. Los Agentes continúan trabajando con los leads que tienen asignados.</p>
          </section>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <ImportCard icon={<FileSpreadsheet size={20} />} title="Importar leads" description="Clientes y consultas comerciales. En Enterprise, la asignación por equipo se mantiene según el rol y las reglas configuradas." templateHref="/templates/leads-revscale.csv" action={importLeads} columns="nombre, telefono, email, zona, operacion, tipo_propiedad, presupuesto, moneda, dormitorios" returnTo={returnTo} />
            <ImportCard icon={<Database size={20} />} title="Importar propiedades" description="Inventario de propiedades para usar luego en búsquedas y Matching IA." templateHref="/templates/propiedades-revscale.csv" action={importProperties} columns="titulo, zona, direccion, operacion, tipo_propiedad, precio, moneda, dormitorios, banos, area_m2, estado, descripcion" returnTo={returnTo} />
          </section>
        )}

        <section className="mt-8 rounded-xl border border-[#cdbfa9] bg-[#eee4d5] p-6">
          <h2 className="font-serif text-xl font-medium text-[#37332d]">Cómo funciona</h2>
          <p className="mt-2 text-sm leading-6 text-[#5f584f]">Descargá la plantilla, completala en Excel o Google Sheets y exportala como CSV. Se aceptan archivos separados por coma, punto y coma o tabulación. Si alguna fila tiene un dato inválido, RevScale no realiza la importación hasta que lo corrijas. Los duplicados detectados se omiten automáticamente.</p>
          <p className="mt-3 text-xs text-[#7d7469]">Máximo actual: 5.000 filas y 900 KB por archivo.</p>
        </section>
      </div>
    </main>
  );
}

function ImportCard({
  icon,
  title,
  description,
  templateHref,
  action,
  columns,
  returnTo,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  templateHref: string;
  action: (formData: FormData) => Promise<void>;
  columns: string;
  returnTo: string;
}) {
  return (
    <article className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)]">
      <div className="flex items-start gap-3"><div className="rounded-lg border border-[#cdbfa9] bg-[#eee4d5] p-2.5 text-[#705f47]">{icon}</div><div><h2 className="font-serif text-xl font-medium text-[#37332d]">{title}</h2><p className="mt-1 text-sm leading-6 text-[#665f56]">{description}</p></div></div>
      <div className="mt-5 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7a67]">Columnas aceptadas</p><p className="mt-2 text-sm leading-6 text-[#49433b]">{columns}</p></div>
      <a href={templateHref} download className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#725d40] transition hover:text-[#3f3529]"><Download size={16} strokeWidth={1.7} /> Descargar plantilla CSV</a>
      <form action={action} className="mt-5 space-y-4">
        {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
        <label className="block rounded-xl border border-dashed border-[#cbbca8] bg-[#fffaf2] p-4"><span className="mb-3 flex items-center gap-2 text-sm font-medium text-[#514a42]"><Upload size={16} /> Seleccionar archivo CSV</span><input name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm text-[#5f584f] file:mr-4 file:rounded-lg file:border-0 file:bg-[#e7dccb] file:px-4 file:py-2 file:font-semibold file:text-[#3f392f] hover:file:bg-[#ddd0bd]" /></label>
        <button className="w-full rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2] transition hover:bg-[#3b3731]">Validar e importar</button>
      </form>
    </article>
  );
}
