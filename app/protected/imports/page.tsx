import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/protected" className="text-sm font-medium text-blue-400">
          ← Dashboard
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">Carga inicial</p>
          <h1 className="mt-2 text-3xl font-bold">Importar datos</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Importá leads y propiedades desde archivos CSV sin cargarlos uno por uno. RevScale valida el archivo,
            evita duplicados y respeta los límites de tu plan.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {type && !error && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Importación terminada: <b>{imported}</b> {type === "leads" ? "leads" : "propiedades"} importados.
            {duplicates > 0 && <> Se omitieron <b>{duplicates}</b> duplicados.</>}
          </div>
        )}

        {!canImport ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-xl font-semibold">Importación restringida</h2>
            <p className="mt-2 text-slate-400">
              Solo Director o Gerente pueden importar datos masivamente. Los Agentes continúan trabajando con los leads que tienen asignados.
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <ImportCard
              title="Importar leads"
              description="Clientes y consultas comerciales. En Enterprise, la asignación por equipo se mantiene según el rol y las reglas configuradas."
              templateHref="/templates/leads-revscale.csv"
              action={importLeads}
              columns="nombre, telefono, email, zona, operacion, tipo_propiedad, presupuesto, moneda, dormitorios"
            />

            <ImportCard
              title="Importar propiedades"
              description="Inventario de propiedades para usar luego en búsquedas y Matching IA."
              templateHref="/templates/propiedades-revscale.csv"
              action={importProperties}
              columns="titulo, zona, direccion, operacion, tipo_propiedad, precio, moneda, dormitorios, banos, area_m2, estado, descripcion"
            />
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-6">
          <h2 className="text-lg font-semibold">Cómo funciona</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Descargá la plantilla, completala en Excel o Google Sheets y exportala como CSV. Se aceptan archivos separados por coma,
            punto y coma o tabulación. Si alguna fila tiene un dato inválido, RevScale no realiza la importación hasta que lo corrijas.
            Los duplicados detectados se omiten automáticamente.
          </p>
          <p className="mt-3 text-xs text-slate-500">Máximo actual: 5.000 filas y 900 KB por archivo.</p>
        </section>
      </div>
    </main>
  );
}

function ImportCard({
  title,
  description,
  templateHref,
  action,
  columns,
}: {
  title: string;
  description: string;
  templateHref: string;
  action: (formData: FormData) => Promise<void>;
  columns: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>

      <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Columnas aceptadas</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{columns}</p>
      </div>

      <a
        href={templateHref}
        download
        className="mt-5 inline-block text-sm font-semibold text-blue-400 hover:text-blue-300"
      >
        Descargar plantilla CSV ↓
      </a>

      <form action={action} className="mt-5 space-y-4">
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:font-semibold file:text-white"
        />
        <button className="w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400">
          Validar e importar
        </button>
      </form>
    </article>
  );
}
