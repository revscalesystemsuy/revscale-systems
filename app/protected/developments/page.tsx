import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { currentPlanHasFeature, getCurrentSubscription } from "@/lib/plan-access";

export default async function DevelopmentsPage() {
  const allowed = await currentPlanHasFeature("development_projects");
  if (!allowed) redirect("/protected/billing");

  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) redirect("/protected");
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("development_projects")
    .select("id,name,developer_name,zone,status,estimated_delivery,created_at")
    .eq("organization_id", subscription.organizationId)
    .order("created_at", { ascending: false });

  const projectIds = (projects || []).map((project) => project.id);
  const { data: units } = projectIds.length
    ? await supabase.from("development_units").select("project_id,status,price,currency").in("project_id", projectIds)
    : { data: [] };

  async function createProject(formData: FormData) {
    "use server";
    const allowed = await currentPlanHasFeature("development_projects");
    if (!allowed) throw new Error("Proyectos en pozo está disponible en Enterprise.");
    const subscription = await getCurrentSubscription();
    if (!subscription?.organizationId) throw new Error("Sin organización activa");
    const supabase = await createClient();

    const name = String(formData.get("name") || "").trim();
    if (!name) throw new Error("El nombre del proyecto es obligatorio.");
    const status = String(formData.get("status") || "PRESALE").toUpperCase();
    if (!["PLANNING","PRESALE","UNDER_CONSTRUCTION","DELIVERED","PAUSED"].includes(status)) throw new Error("Estado inválido.");

    const { data, error } = await supabase.from("development_projects").insert({
      organization_id: subscription.organizationId,
      name,
      developer_name: String(formData.get("developer_name") || "").trim() || null,
      zone: String(formData.get("zone") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      status,
      estimated_delivery: String(formData.get("estimated_delivery") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      amenities: String(formData.get("amenities") || "").split(",").map((v) => v.trim()).filter(Boolean),
    }).select("id").single();
    if (error) throw new Error(error.message);
    redirect(`/protected/developments/${data.id}`);
  }

  const unitSummary = new Map<string, { total: number; available: number; reserved: number }>();
  for (const unit of units || []) {
    const current = unitSummary.get(unit.project_id) || { total: 0, available: 0, reserved: 0 };
    current.total += 1;
    if (unit.status === "AVAILABLE") current.available += 1;
    if (unit.status === "RESERVED") current.reserved += 1;
    unitSummary.set(unit.project_id, current);
  }

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Desarrollos inmobiliarios</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#292722] md:text-5xl">Proyectos en pozo</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">Administrá proyectos, torres, tipologías y unidades. Cada unidad disponible se sincroniza con Propiedades y entra automáticamente al matching comercial.</p>
          </div>
          <span className="rounded-full border border-[#cdbfa9] bg-[#f7f0e6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#725d40]">Enterprise</span>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {(projects || []).map((project) => {
            const summary = unitSummary.get(project.id) || { total: 0, available: 0, reserved: 0 };
            return (
              <Link key={project.id} href={`/protected/developments/${project.id}`} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.04)] transition hover:-translate-y-0.5 hover:border-[#bfae95]">
                <div className="flex items-start justify-between gap-4"><Building2 size={21} strokeWidth={1.6} className="text-[#8d7553]" /><span className="rounded-full border border-[#d2c5b3] bg-[#fffaf2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6f5a3e]">{project.status.replaceAll("_", " ")}</span></div>
                <h2 className="mt-5 font-serif text-2xl text-[#302d28]">{project.name}</h2>
                <p className="mt-2 text-sm text-[#625d55]">{project.developer_name || "Desarrollador sin definir"}</p>
                <div className="mt-5 space-y-2 text-xs text-[#756e64]">{project.zone && <p className="flex items-center gap-2"><MapPin size={14} />{project.zone}</p>}{project.estimated_delivery && <p className="flex items-center gap-2"><CalendarDays size={14} />Entrega prevista {project.estimated_delivery}</p>}</div>
                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#d8ccbb] pt-5 text-center"><Metric label="Unidades" value={summary.total}/><Metric label="Disponibles" value={summary.available}/><Metric label="Reservadas" value={summary.reserved}/></div>
              </Link>
            );
          })}
        </section>

        {!projects?.length && <div className="mt-8 rounded-2xl border border-dashed border-[#cdbfa9] bg-[#f7f0e6] p-10 text-center"><Building2 className="mx-auto text-[#8d7553]"/><h2 className="mt-4 font-serif text-2xl text-[#302d28]">Todavía no hay proyectos cargados</h2><p className="mt-2 text-sm text-[#756e64]">Creá el primero debajo y empezá a cargar torres, tipologías y unidades.</p></div>}

        <section className="mt-10 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6 md:p-8">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cdbfa9] bg-[#fffaf2] text-[#725d40]"><Plus size={18}/></span><div><h2 className="font-serif text-2xl text-[#302d28]">Nuevo proyecto</h2><p className="text-sm text-[#756e64]">Datos generales del desarrollo.</p></div></div>
          <form action={createProject} className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Nombre"><input name="name" required className={inputClass} placeholder="Alba Pocitos" /></Field>
            <Field label="Desarrollador"><input name="developer_name" className={inputClass} placeholder="Estudio / desarrollador" /></Field>
            <Field label="Zona"><input name="zone" className={inputClass} placeholder="Pocitos" /></Field>
            <Field label="Dirección"><input name="address" className={inputClass} /></Field>
            <Field label="Estado"><select name="status" defaultValue="PRESALE" className={inputClass}><option value="PLANNING">Planificación</option><option value="PRESALE">Preventa</option><option value="UNDER_CONSTRUCTION">En obra</option><option value="DELIVERED">Entregado</option><option value="PAUSED">Pausado</option></select></Field>
            <Field label="Entrega estimada"><input name="estimated_delivery" type="date" className={inputClass} /></Field>
            <div className="md:col-span-2"><Field label="Amenities (separados por coma)"><input name="amenities" className={inputClass} placeholder="Rooftop, gimnasio, barbacoa" /></Field></div>
            <div className="md:col-span-2"><Field label="Descripción"><textarea name="description" rows={4} className={inputClass} /></Field></div>
            <div className="md:col-span-2"><button className="rounded-lg bg-[#302d28] px-5 py-3 text-sm font-semibold !text-[#fffaf2]">Crear proyecto</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}

const inputClass = "mt-2 w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#37332d] outline-none transition focus:border-[#8d7553]";
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="text-sm font-medium text-[#4f4941]">{label}{children}</label>; }
function Metric({ label, value }: { label: string; value: number }) { return <div><p className="font-serif text-xl text-[#4b4238]">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-[#81796e]">{label}</p></div>; }
