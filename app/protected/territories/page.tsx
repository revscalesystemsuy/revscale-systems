import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarClock, Flame, MapPinned, Target, Trophy, UserPlus } from "lucide-react";
import { getCurrentOrganizationContext } from "@/lib/organization-role";
import { planHasFeature } from "@/lib/plan-access";
import { assignTerritoryAgent, createAcquisitionProspect, createTerritory, updateProspectStage } from "./actions";

const STAGES = [
  ["IDENTIFIED", "Identificado"], ["CONTACTED", "Contactado"], ["QUALIFIED", "Calificado"],
  ["VALUATION", "Tasación"], ["PROPOSAL", "Propuesta"], ["WON", "Captado"], ["LOST", "Perdido"],
] as const;

export default async function TerritoriesPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/auth/login");
  if (context.subscriptionStatus !== "ACTIVE" || !planHasFeature(context.plan, "territory_acquisition")) redirect("/protected/billing");

  const { supabase, organizationId, role, teamId } = context;
  const [{ data: territories }, { data: prospects }, { data: assignments }, { data: teams }, { data: members }] = await Promise.all([
    supabase.from("territories").select("id,name,department,city,zones,team_id,priority,status,monthly_prospect_target,monthly_contact_target,monthly_listing_target,inactivity_days,created_at").order("name"),
    supabase.from("acquisition_prospects").select("id,territory_id,assigned_to,owner_name,address,zone,property_type,status,temperature,next_action_at,last_activity_at,converted_property_id,created_at").order("updated_at", { ascending: false }),
    supabase.from("territory_assignments").select("territory_id,user_id,assignment_role,is_active"),
    supabase.from("teams").select("id,name").eq("organization_id", organizationId).eq("is_active", true).order("name"),
    supabase.from("organization_members").select("user_id,role,team_id,status,profiles:user_id(full_name)").eq("organization_id", organizationId).eq("status", "ACTIVE"),
  ]);

  const rows = territories || [];
  const prospectRows = prospects || [];
  const assignmentRows = assignments || [];
  const memberRows = members || [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const open = prospectRows.filter((p) => !["WON", "LOST"].includes(p.status));
  const hot = open.filter((p) => p.temperature === "HOT");
  const overdue = open.filter((p) => p.next_action_at && new Date(p.next_action_at).getTime() < now.getTime());
  const wonThisMonth = prospectRows.filter((p) => p.status === "WON" && new Date(p.created_at).getTime() >= monthStart);
  const canManage = role === "OWNER" || role === "MANAGER";
  const visibleTeams = role === "MANAGER" ? (teams || []).filter((t) => t.id === teamId) : (teams || []);

  const memberName = (userId: string | null) => {
    if (!userId) return "Sin asignar";
    const member = memberRows.find((m) => m.user_id === userId);
    const profile = Array.isArray(member?.profiles) ? member?.profiles[0] : member?.profiles;
    return profile?.full_name || "Agente";
  };

  return <main className="min-h-screen bg-[#eee5d7] p-6 text-[#292722] md:p-8 lg:p-10">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#8c7350]">Enterprise · Captación territorial</p><h1 className="mt-3 font-serif text-4xl font-medium md:text-5xl">Territorios y captación</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#665f56]">Convertí zonas comerciales en una operación medible: responsables, objetivos, propietarios potenciales, próximos contactos y captaciones ganadas.</p></div>
        <div className="rounded-xl border border-[#cabca7] bg-[#f7f0e6] px-4 py-3 text-sm text-[#635846]"><MapPinned size={16} className="mr-2 inline"/>Alertas de seguimiento e inactividad activas</div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<MapPinned size={18}/>} label="Territorios" value={rows.filter((t) => t.status === "ACTIVE").length}/>
        <Metric icon={<Target size={18}/>} label="Prospectos abiertos" value={open.length}/>
        <Metric icon={<Flame size={18}/>} label="Prioridad HOT" value={hot.length}/>
        <Metric icon={<CalendarClock size={18}/>} label="Seguimientos vencidos" value={overdue.length}/>
        <Metric icon={<Trophy size={18}/>} label="Captados este mes" value={wonThisMonth.length}/>
      </section>

      {canManage && <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><h2 className="font-serif text-2xl">Crear territorio</h2><form action={createTerritory} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Ej. Pocitos premium" className="field"/><input name="department" placeholder="Departamento" className="field"/>
          <input name="city" placeholder="Ciudad" className="field"/><input name="zones" placeholder="Zonas: Pocitos, Punta Carretas" className="field"/>
          <select name="team_id" defaultValue={role === "MANAGER" ? teamId || "" : ""} className="field"><option value="">Sin equipo específico</option>{visibleTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select name="priority" defaultValue="STANDARD" className="field"><option value="STANDARD">Estándar</option><option value="HIGH">Alta</option><option value="STRATEGIC">Estratégica</option></select>
          <input name="monthly_prospect_target" type="number" min="0" defaultValue="20" className="field"/><input name="monthly_listing_target" type="number" min="0" defaultValue="4" className="field"/>
          <input type="hidden" name="monthly_contact_target" value="40"/><input type="hidden" name="inactivity_days" value="7"/>
          <textarea name="description" placeholder="Foco comercial de la zona" className="field sm:col-span-2"/>
          <button className="primary sm:col-span-2">Crear territorio</button>
        </form></div>
        <div className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><h2 className="font-serif text-2xl">Asignar responsable</h2><p className="mt-2 text-sm text-[#746c62]">Un agente puede tener varios territorios; la visibilidad queda limitada por asignación y equipo.</p><form action={assignTerritoryAgent} className="mt-5 grid gap-3">
          <select name="territory_id" required className="field"><option value="">Territorio</option>{rows.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select name="user_id" required className="field"><option value="">Persona</option>{memberRows.filter((m) => role === "OWNER" || !teamId || m.team_id === teamId).map((m) => <option key={m.user_id} value={m.user_id}>{memberName(m.user_id)} · {m.role}</option>)}</select>
          <select name="assignment_role" defaultValue="PRIMARY" className="field"><option value="PRIMARY">Responsable principal</option><option value="SUPPORT">Apoyo</option></select><button className="primary"><UserPlus size={16} className="mr-2 inline"/>Asignar</button>
        </form></div>
      </section>}

      <section className="mt-8"><div className="mb-4"><h2 className="font-serif text-3xl">Cobertura por territorio</h2><p className="mt-1 text-sm text-[#756d63]">Objetivo mensual versus actividad de captación registrada.</p></div><div className="grid gap-4 xl:grid-cols-3">{rows.length ? rows.map((t) => {
        const tp = prospectRows.filter((p) => p.territory_id === t.id); const won = tp.filter((p) => p.status === "WON").length; const assigned = assignmentRows.filter((a) => a.territory_id === t.id && a.is_active);
        return <article key={t.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-serif text-2xl">{t.name}</h3><p className="mt-1 text-xs text-[#81796e]">{[t.city,t.department].filter(Boolean).join(" · ") || "Zona comercial"}</p></div><span className="rounded-full border border-[#c6b69e] px-3 py-1 text-[10px] font-semibold uppercase tracking-[.12em]">{t.priority}</span></div><p className="mt-4 text-sm text-[#655e55]">{t.zones?.length ? t.zones.join(", ") : "Cobertura general"}</p><div className="mt-5 grid grid-cols-3 gap-2"><Mini label="Prospectos" value={`${tp.length}/${t.monthly_prospect_target}`}/><Mini label="Ganados" value={`${won}/${t.monthly_listing_target}`}/><Mini label="Equipo" value={assigned.length}/></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e1d6c6]"><div className="h-full bg-[#756143]" style={{width:`${Math.min(100,Math.round((won/Math.max(1,t.monthly_listing_target))*100))}%`}}/></div></article>
      }) : <div className="rounded-2xl border border-dashed border-[#c8baa6] bg-[#f5ede1] p-8 text-sm text-[#756d63] xl:col-span-3">Todavía no hay territorios. Creá el primero para empezar a medir captación.</div>}</div></section>

      <section className="mt-8 rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-6"><h2 className="font-serif text-2xl">Nuevo propietario potencial</h2><form action={createAcquisitionProspect} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select name="territory_id" required className="field"><option value="">Territorio</option>{rows.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</select><input name="owner_name" required placeholder="Propietario" className="field"/><input name="owner_phone" placeholder="Teléfono" className="field"/><input name="owner_email" type="email" placeholder="Email" className="field"/>
        <input name="address" required placeholder="Dirección de la propiedad" className="field xl:col-span-2"/><input name="zone" placeholder="Barrio / zona" className="field"/><input name="property_type" placeholder="Tipo de propiedad" className="field"/>
        <select name="assigned_to" defaultValue={role === "AGENT" ? context.userId : ""} className="field"><option value="">Sin asignar</option>{memberRows.map((m)=><option key={m.user_id} value={m.user_id}>{memberName(m.user_id)}</option>)}</select><select name="source" defaultValue="REFERRAL" className="field"><option value="REFERRAL">Referido</option><option value="OWNER_INBOUND">Consulta del propietario</option><option value="DOOR_KNOCKING">Prospección en zona</option><option value="SIGN">Cartel</option><option value="DATABASE">Base propia</option><option value="SOCIAL">Redes</option><option value="PORTAL">Portal</option><option value="OTHER">Otro</option></select><select name="temperature" defaultValue="WARM" className="field"><option value="HOT">HOT</option><option value="WARM">WARM</option><option value="COLD">COLD</option></select><select name="intended_operation" defaultValue="SALE" className="field"><option value="SALE">Venta</option><option value="RENT">Alquiler</option><option value="BOTH">Venta o alquiler</option></select><button className="primary xl:col-span-4">Agregar al pipeline de captación</button>
      </form></section>

      <section className="mt-8"><h2 className="font-serif text-3xl">Pipeline de captación</h2><div className="mt-4 overflow-x-auto rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6]"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-[#ddd1c0] text-[10px] uppercase tracking-[.14em] text-[#81796e]"><tr><th className="p-4">Propietario / inmueble</th><th className="p-4">Territorio</th><th className="p-4">Responsable</th><th className="p-4">Prioridad</th><th className="p-4">Próxima acción</th><th className="p-4">Etapa</th></tr></thead><tbody>{prospectRows.map((p) => <tr key={p.id} className="border-b border-[#e4d9ca] last:border-0"><td className="p-4"><Link href={`/protected/territories/prospects/${p.id}`} className="font-semibold hover:underline">{p.owner_name}</Link><p className="mt-1 text-xs text-[#81796e]">{p.address}</p></td><td className="p-4">{rows.find((t)=>t.id===p.territory_id)?.name || "—"}</td><td className="p-4">{memberName(p.assigned_to)}</td><td className="p-4"><span className="rounded-full border border-[#cdbfa9] px-2.5 py-1 text-xs">{p.temperature}</span></td><td className={`p-4 ${p.next_action_at && new Date(p.next_action_at)<now ? "font-semibold text-[#9a4f42]" : "text-[#655e55]"}`}>{p.next_action_at ? new Date(p.next_action_at).toLocaleString("es-UY",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "Sin fecha"}</td><td className="p-4"><form action={updateProspectStage} className="flex gap-2"><input type="hidden" name="prospect_id" value={p.id}/><select name="status" defaultValue={p.status} className="rounded-lg border border-[#d1c4b1] bg-[#fffaf2] px-2 py-2 text-xs">{STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="rounded-lg border border-[#cbbda8] px-3 py-2 text-xs">Guardar</button></form></td></tr>)}{!prospectRows.length && <tr><td colSpan={6} className="p-8 text-center text-[#81796e]">Sin prospectos de captación todavía.</td></tr>}</tbody></table></div></section>
    </div>
  </main>;
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><div className="flex items-center gap-2 text-[#806d52]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[.14em]">{label}</span></div><p className="mt-3 font-serif text-3xl">{value}</p></div>}
function Mini({label,value}:{label:string;value:string|number}){return <div className="rounded-lg bg-[#eee5d7] p-3 text-center"><p className="text-[9px] uppercase tracking-[.12em] text-[#81796e]">{label}</p><p className="mt-1 font-serif text-xl">{value}</p></div>}
