import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, PauseCircle, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { DEMO_PROPERTIES, formatUSD } from "@/lib/demo-data";
import { PageHeader } from "../../demo-ui";

const MOCK_ROWS = [
  { status: "Publicado", sync: "SUCCESS", category: "MLU1459", location: "Montevideo · Pocitos", listing: "Gold Special", maintenance: "UYU 8.900", externalId: "MLU-983421657", externalUrl: "#" },
  { status: "Validado", sync: "SUCCESS", category: "MLU1459", location: "Montevideo · Punta Carretas", listing: "Silver", maintenance: "UYU 6.500", externalId: null, externalUrl: null },
  { status: "Error", sync: "ERROR", category: "MLU1472", location: "Montevideo · Carrasco", listing: "Gold Premium", maintenance: "UYU 0", externalId: "MLU-983419812", externalUrl: "#" },
];

export default function DemoMercadoLibrePage() {
  const properties = DEMO_PROPERTIES.slice(0, 3);
  return <main className="min-h-screen p-5 md:p-8 lg:p-10"><div className="mx-auto max-w-[1450px]">
    <Link href="/demo/distribution?plan=enterprise" className="inline-flex items-center gap-2 text-sm text-[#7a6e5c]"><ArrowLeft size={15}/> Volver a Publicaciones</Link>
    <div className="mt-6"><PageHeader eyebrow="Enterprise · Demo ficticia" title="Mercado Libre Inmuebles" subtitle="Flujo de conexión y publicación que replica el producto real sin usar una cuenta externa ni credenciales del proveedor."/></div>

    <section className="mb-7 grid gap-4 md:grid-cols-3"><Stat label="Cuenta" value="Conectada" detail="Horizonte Propiedades"/><Stat label="Publicados" value="2" detail="avisos con ID externo"/><Stat label="Errores" value="1" detail="requiere corrección"/></section>

    <section className="mb-7 rounded-2xl border border-[#b6bea6] bg-[#e8ebdf] p-5 md:p-6"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#657052]"/><div><p className="font-semibold text-[#403b34]">Publicación segura por etapas</p><p className="mt-1 text-sm leading-6 text-[#5e6655]">Guardar no publica. Validar consulta los requisitos del portal; Publicar crea el aviso una sola vez; Sincronizar actualiza el mismo ID externo. Pausar y reactivar trabajan sobre ese aviso, evitando duplicados.</p><p className="mt-2 text-xs text-[#66705c]">En producción, los tokens viven cifrados en backend y la cuenta solo puede conectarla Dirección.</p></div></div></section>

    <div className="space-y-5">{properties.map((property, index) => { const row = MOCK_ROWS[index]; return <article key={property.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f7f0e6] p-5 md:p-6">
      <div className="flex flex-col gap-4 border-b border-[#ded2c1] pb-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={row.status}/><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d7553]">Sync {row.sync}</span></div><h2 className="mt-3 font-serif text-2xl font-medium text-[#37332d]">{property.title}</h2><p className="mt-2 text-sm text-[#6f675d]">{property.zone} · {formatUSD(property.priceUSD)}</p>{row.externalId && <p className="mt-2 text-xs text-[#81786d]">ID Mercado Libre: {row.externalId} · última sync hoy 18:42</p>}</div>{row.externalUrl && <span className="inline-flex items-center gap-2 rounded-lg border border-[#cdbfa9] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#5f513e]">Abrir en Mercado Libre <ExternalLink size={14}/></span>}</div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Categoría oficial" value={row.category}/><Field label="Ubicación" value={row.location}/><Field label="Tipo de publicación" value={row.listing}/><Field label="Gastos comunes" value={row.maintenance}/><Field label="Condición" value={index === 0 ? "Usada" : index === 1 ? "Nueva / a estrenar" : "No especificada"}/><Field label="Cocheras" value={index === 2 ? "2" : "1"}/><Field label="Superficie cubierta" value={`${Math.max(45, property.areaM2 - 12)} m²`}/><Field label="Fotos" value={index === 0 ? "18 imágenes" : index === 1 ? "12 imágenes" : "7 imágenes"}/></div>

      <div className="mt-5 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">Descripción</p><p className="mt-2 text-sm leading-6 text-[#665f56]">{property.type} en {property.zone}, {property.bedrooms} dormitorios, {property.bathrooms} baños y {property.areaM2} m². Esta información es ficticia y existe únicamente para demostrar el flujo de distribución.</p></div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#ded2c1] pt-4"><DemoButton icon={<CheckCircle2 size={15}/>} label="Validar"/><DemoButton icon={<Send size={15}/>} label={row.externalId ? "Publicado" : "Publicar"} primary={!row.externalId}/>{row.externalId && <DemoButton icon={<RefreshCw size={15}/>} label="Sincronizar" primary/>}{row.status === "Publicado" && <DemoButton icon={<PauseCircle size={15}/>} label="Pausar"/>}</div>
      {row.sync === "ERROR" && <div className="mt-4 rounded-lg border border-[#d9b7aa] bg-[#f4e4dc] p-3 text-sm text-[#7b4539]">Demo de error: el portal solicita completar un atributo obligatorio de la categoría antes de aceptar la próxima sincronización.</div>}
    </article>; })}</div>
  </div></main>;
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border border-[#d2c5b3] bg-[#f7f0e6] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7a67]">{label}</p><p className="mt-2 font-serif text-3xl text-[#37332d]">{value}</p><p className="mt-1 text-xs text-[#81786d]">{detail}</p></div> }
function Field({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#81796e]">{label}</p><p className="mt-2 rounded-lg border border-[#ddd1c0] bg-[#fffaf2] px-3 py-2.5 text-sm text-[#403b34]">{value}</p></div> }
function StatusBadge({ status }: { status: string }) { const tone = status === "Publicado" ? "border-[#b6bea6] bg-[#e8ebdf] text-[#556045]" : status === "Error" ? "border-[#d9b7aa] bg-[#f4e4dc] text-[#7b4539]" : "border-[#cdbfa9] bg-[#fffaf2] text-[#665942]"; return <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>{status}</span> }
function DemoButton({ icon, label, primary = false }: { icon: React.ReactNode; label: string; primary?: boolean }) { return <button disabled className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold opacity-80 ${primary ? "bg-[#302d28] !text-[#fffaf2]" : "border border-[#b9aa94] bg-[#fffaf2] text-[#4d4438]"}`}>{icon}{label}</button> }
