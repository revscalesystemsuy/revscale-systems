import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Building2, Layers3, Pencil, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { currentPlanHasFeature, getCurrentSubscription } from "@/lib/plan-access";

export default async function DevelopmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await currentPlanHasFeature("development_projects");
  if (!allowed) redirect("/protected/billing");
  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) redirect("/protected");
  const organizationId = subscription.organizationId;
  const supabase = await createClient();

  const [{ data: project }, { data: blocks }, { data: typologies }, { data: units }] = await Promise.all([
    supabase.from("development_projects").select("id,name,developer_name,zone,address,status,estimated_delivery,description,amenities").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("development_blocks").select("id,name,sort_order").eq("project_id", id).eq("organization_id", organizationId).order("sort_order"),
    supabase.from("development_typologies").select("id,name,property_type,bedrooms,bathrooms,area_m2").eq("project_id", id).eq("organization_id", organizationId).order("created_at"),
    supabase.from("development_units").select("id,code,floor,orientation,price,currency,status,property_id,block_id,typology_id").eq("project_id", id).eq("organization_id", organizationId).order("code"),
  ]);
  if (!project) redirect("/protected/developments");

  const propertyIds = (units || []).map((unit) => unit.property_id).filter((value): value is string => Boolean(value));
  let matchRows: { property_id: string; compatibility: number }[] = [];
  if (propertyIds.length) {
    const { data } = await supabase
      .from("property_lead_matches")
      .select("property_id,compatibility")
      .in("property_id", propertyIds);
    matchRows = data || [];
  }

  async function addBlock(formData: FormData) {
    "use server";
    const context = await requireContext(id);
    const name = String(formData.get("name") || "").trim();
    if (!name) throw new Error("El nombre del bloque es obligatorio.");
    const { error } = await context.supabase.from("development_blocks").insert({ organization_id: context.organizationId, project_id: id, name, sort_order: Number(formData.get("sort_order") || 0) });
    if (error) throw new Error(error.message);
    revalidatePath(`/protected/developments/${id}`);
  }

  async function addTypology(formData: FormData) {
    "use server";
    const context = await requireContext(id);
    const name = String(formData.get("name") || "").trim();
    if (!name) throw new Error("El nombre de la tipología es obligatorio.");
    const { error } = await context.supabase.from("development_typologies").insert({
      organization_id: context.organizationId,
      project_id: id,
      name,
      property_type: String(formData.get("property_type") || "APARTAMENTO").toUpperCase(),
      bedrooms: nullableNumber(formData.get("bedrooms")),
      bathrooms: nullableNumber(formData.get("bathrooms")),
      area_m2: nullableNumber(formData.get("area_m2")),
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/protected/developments/${id}`);
  }

  async function addUnit(formData: FormData) {
    "use server";
    const context = await requireContext(id);
    const code = String(formData.get("code") || "").trim();
    const typologyId = String(formData.get("typology_id") || "").trim();
    if (!code || !typologyId) throw new Error("Código y tipología son obligatorios.");
    const status = String(formData.get("status") || "AVAILABLE").toUpperCase();
    if (!["AVAILABLE","RESERVED","SOLD","BLOCKED"].includes(status)) throw new Error("Estado inválido.");
    const { error } = await context.supabase.from("development_units").insert({
      organization_id: context.organizationId,
      project_id: id,
      block_id: String(formData.get("block_id") || "").trim() || null,
      typology_id: typologyId,
      code,
      floor: String(formData.get("floor") || "").trim() || null,
      orientation: String(formData.get("orientation") || "").trim() || null,
      price: nullableNumber(formData.get("price")),
      currency: String(formData.get("currency") || "USD").toUpperCase(),
      status,
      notes: String(formData.get("notes") || "").trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/protected/developments/${id}`);
    revalidatePath("/protected/properties");
    revalidatePath("/protected/notifications");
  }

  async function changeUnitStatus(formData: FormData) {
    "use server";
    const context = await requireContext(id);
    const unitId = String(formData.get("unit_id") || "");
    const propertyId = String(formData.get("property_id") || "").trim();
    const status = String(formData.get("status") || "").toUpperCase();
    if (!unitId || !["AVAILABLE","RESERVED","SOLD","BLOCKED"].includes(status)) throw new Error("Datos inválidos.");
    const { error } = await context.supabase.from("development_units").update({ status }).eq("id", unitId).eq("project_id", id).eq("organization_id", context.organizationId);
    if (error) throw new Error(error.message);
    revalidatePath(`/protected/developments/${id}`);
    revalidatePath("/protected/properties");
    revalidatePath("/protected/notifications");
    if (propertyId) revalidatePath(`/protected/properties/${propertyId}`);
  }

  const blockById = new Map((blocks || []).map((block) => [block.id, block.name]));
  const typeById = new Map((typologies || []).map((type) => [type.id, type]));
  const matchesByProperty = new Map<string, { total: number; high: number; best: number }>();
  for (const match of matchRows) {
    const compatibility = Number(match.compatibility || 0);
    const current = matchesByProperty.get(match.property_id) || { total: 0, high: 0, best: 0 };
    current.total += 1;
    if (compatibility >= 85) current.high += 1;
    current.best = Math.max(current.best, compatibility);
    matchesByProperty.set(match.property_id, current);
  }
  const available = (units || []).filter((unit) => unit.status === "AVAILABLE").length;
  const reserved = (units || []).filter((unit) => unit.status === "RESERVED").length;
  const highMatches = [...matchesByProperty.values()].reduce((sum, summary) => sum + summary.high, 0);

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/protected/developments" className="text-sm font-medium text-[#725d40] hover:text-[#3f3529]">← Volver a proyectos</Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d7553]">Proyecto en pozo</p><h1 className="mt-3 font-serif text-4xl font-medium text-[#292722] md:text-5xl">{project.name}</h1><p className="mt-3 text-sm text-[#625d55]">{project.developer_name || "Desarrollador sin definir"} · {project.zone || "Zona sin definir"}</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Unidades" value={(units || []).length}/><Metric label="Disponibles" value={available}/><Metric label="Matches altos" value={highMatches}/><Metric label="Reservadas" value={reserved}/></div>
        </div>

        <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6">
          <div className="flex items-start gap-3"><Sparkles className="mt-0.5 text-[#8d7553]" size={19}/><div><h2 className="font-serif text-xl text-[#302d28]">Sincronización comercial automática</h2><p className="mt-1 text-sm leading-6 text-[#625d55]">Al cargar o editar una unidad, RevScale actualiza su propiedad comercial y recalcula sus matches. Si una unidad vuelve a Disponible, vuelve a competir automáticamente y se actualiza el aviso de clientes compatibles para cada agente.</p></div></div>
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-3">
          <Panel icon={<Building2 size={18}/>} title="Torres / bloques">
            <div className="space-y-2">{(blocks || []).map((block) => <div key={block.id} className="rounded-lg border border-[#d8ccbb] bg-[#fffaf2] px-3 py-2 text-sm text-[#4f4941]">{block.name}</div>)}</div>
            <form action={addBlock} className="mt-4 space-y-3"><input name="name" required placeholder="Torre A" className={inputClass}/><input name="sort_order" type="number" min="0" placeholder="Orden" className={inputClass}/><button className={buttonClass}><Plus size={15}/>Agregar bloque</button></form>
          </Panel>

          <Panel icon={<Layers3 size={18}/>} title="Tipologías">
            <div className="space-y-2">{(typologies || []).map((type) => <div key={type.id} className="rounded-lg border border-[#d8ccbb] bg-[#fffaf2] px-3 py-2 text-sm"><p className="font-medium text-[#403a33]">{type.name}</p><p className="mt-1 text-xs text-[#81796e]">{type.property_type} · {type.bedrooms ?? "—"} dorm · {type.area_m2 ?? "—"} m²</p></div>)}</div>
            <form action={addTypology} className="mt-4 grid gap-3"><input name="name" required placeholder="2 dormitorios frente" className={inputClass}/><select name="property_type" className={inputClass}><option value="APARTAMENTO">Apartamento</option><option value="CASA">Casa</option><option value="LOCAL">Local</option><option value="OFICINA">Oficina</option></select><div className="grid grid-cols-3 gap-2"><input name="bedrooms" type="number" min="0" placeholder="Dorm." className={inputClass}/><input name="bathrooms" type="number" min="0" placeholder="Baños" className={inputClass}/><input name="area_m2" type="number" min="0" step="any" placeholder="m²" className={inputClass}/></div><button className={buttonClass}><Plus size={15}/>Agregar tipología</button></form>
          </Panel>

          <Panel icon={<Plus size={18}/>} title="Nueva unidad">
            {!typologies?.length ? <p className="text-sm text-[#81796e]">Creá al menos una tipología antes de cargar unidades.</p> : <form action={addUnit} className="grid gap-3"><input name="code" required placeholder="A-203" className={inputClass}/><select name="block_id" className={inputClass}><option value="">Sin bloque</option>{(blocks || []).map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}</select><select name="typology_id" required className={inputClass}><option value="">Seleccionar tipología</option>{typologies.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><input name="floor" placeholder="Piso" className={inputClass}/><input name="orientation" placeholder="Orientación" className={inputClass}/></div><div className="grid grid-cols-2 gap-2"><input name="price" type="number" min="0" step="any" placeholder="Precio" className={inputClass}/><select name="currency" className={inputClass}><option value="USD">USD</option><option value="UYU">UYU</option></select></div><select name="status" defaultValue="AVAILABLE" className={inputClass}><option value="AVAILABLE">Disponible</option><option value="RESERVED">Reservada</option><option value="BLOCKED">Bloqueada</option><option value="SOLD">Vendida</option></select><button className={buttonClass}><Plus size={15}/>Crear unidad</button></form>}
          </Panel>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]">
          <div className="border-b border-[#d8ccbb] p-6"><h2 className="font-serif text-2xl text-[#302d28]">Stock de unidades</h2><p className="mt-1 text-sm text-[#756e64]">Disponibilidad, matching e inventario comercial en una sola vista.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-[#eee5d7] text-[10px] uppercase tracking-[0.14em] text-[#81796e]"><tr><th className="px-5 py-3">Unidad</th><th>Bloque</th><th>Tipología</th><th>Precio</th><th>Estado</th><th>Matching</th><th>Inventario</th><th className="px-5">Acción</th></tr></thead><tbody>{(units || []).map((unit) => { const type = typeById.get(unit.typology_id); const match = unit.property_id ? matchesByProperty.get(unit.property_id) : undefined; return <tr key={unit.id} className="border-t border-[#ddd1c1] text-[#4f4941]"><td className="px-5 py-4 font-medium text-[#302d28]">{unit.code}</td><td>{unit.block_id ? blockById.get(unit.block_id) || "—" : "—"}</td><td>{type?.name || "—"}</td><td>{unit.price == null ? "Consultar" : `${unit.currency} ${Number(unit.price).toLocaleString("es-UY")}`}</td><td><Status status={unit.status}/></td><td>{unit.status === "AVAILABLE" && unit.property_id ? <Link href={`/protected/properties/${unit.property_id}`} className="block min-w-36 rounded-lg border border-[#d8ccbb] bg-[#fffaf2] px-3 py-2 hover:border-[#bfae95]"><p className="font-semibold text-[#5f513e]">{match?.total || 0} cliente{match?.total === 1 ? "" : "s"}</p><p className="mt-0.5 text-[10px] text-[#81796e]">{match?.high || 0} altos · mejor {match?.best ? `${match.best}%` : "—"}</p></Link> : <span className="text-xs text-[#8a8278]">No participa</span>}</td><td>{unit.property_id ? <Link href={`/protected/properties/${unit.property_id}`} className="font-medium text-[#725d40] underline-offset-4 hover:underline">Ver propiedad</Link> : "Sin sincronizar"}</td><td className="px-5"><div className="flex min-w-max items-center gap-2"><form action={changeUnitStatus} className="flex gap-2"><input type="hidden" name="unit_id" value={unit.id}/><input type="hidden" name="property_id" value={unit.property_id || ""}/><select name="status" defaultValue={unit.status} className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-2 py-1.5 text-xs"><option value="AVAILABLE">Disponible</option><option value="RESERVED">Reservada</option><option value="BLOCKED">Bloqueada</option><option value="SOLD">Vendida</option></select><button className="rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-1.5 text-xs font-semibold text-[#5f513e]">Guardar</button></form><Link href={`/protected/developments/${id}/units/${unit.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-1.5 text-xs font-semibold text-[#5f513e]"><Pencil size={13}/>Editar</Link></div></td></tr>; })}</tbody></table></div>
          {!units?.length && <div className="p-10 text-center text-sm text-[#81796e]">Todavía no hay unidades cargadas.</div>}
        </section>
      </div>
    </main>
  );
}

async function requireContext(projectId: string) {
  const allowed = await currentPlanHasFeature("development_projects");
  if (!allowed) throw new Error("Proyectos en pozo está disponible en Enterprise.");
  const subscription = await getCurrentSubscription();
  if (!subscription?.organizationId) throw new Error("Sin organización activa");
  const supabase = await createClient();
  const { data: project } = await supabase.from("development_projects").select("id").eq("id", projectId).eq("organization_id", subscription.organizationId).maybeSingle();
  if (!project) throw new Error("Proyecto no encontrado.");
  return { supabase, organizationId: subscription.organizationId };
}
function nullableNumber(value: FormDataEntryValue | null) { const raw = String(value || "").trim(); if (!raw) return null; const n = Number(raw); if (!Number.isFinite(n) || n < 0) throw new Error("Valor numérico inválido."); return n; }
const inputClass = "w-full rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#37332d] outline-none focus:border-[#8d7553]";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#302d28] px-4 py-2.5 text-sm font-semibold !text-[#fffaf2]";
function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="mb-4 flex items-center gap-2 text-[#725d40]">{icon}<h2 className="font-serif text-xl text-[#302d28]">{title}</h2></div>{children}</section>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="min-w-24 rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] px-4 py-3 text-center"><p className="font-serif text-2xl text-[#4b4238]">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-[#81796e]">{label}</p></div>; }
function Status({ status }: { status: string }) { const labels: Record<string,string> = { AVAILABLE:"Disponible", RESERVED:"Reservada", SOLD:"Vendida", BLOCKED:"Bloqueada" }; return <span className="rounded-full border border-[#cdbfa9] bg-[#fffaf2] px-2.5 py-1 text-xs font-medium text-[#5f513e]">{labels[status] || status}</span>; }
