import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ExternalLink, Mail, MapPin, Phone, Users, Home, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Subscription = { organization_id: string; plan: string; status: string; created_at: string | null };
type Organization = { id: string; name: string; slug: string | null };
type Member = { organization_id: string; user_id: string; status: string };
type Property = { organization_id: string; id: string; status: string };
type PublicSite = {
  organization_id: string;
  is_active: boolean;
  site_slug: string | null;
  custom_domain: string | null;
  public_phone: string | null;
  public_email: string | null;
  public_whatsapp: string | null;
  public_address: string | null;
  instagram_url: string | null;
};

export default async function ActiveClientsDirectoryPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!admin) redirect("/protected");

  const { data: subscriptionRows, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("organization_id,plan,status,created_at")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });
  if (subscriptionError) throw subscriptionError;

  const subscriptions = (subscriptionRows || []) as Subscription[];
  const organizationIds = subscriptions.map((row) => row.organization_id);

  if (!organizationIds.length) {
    return <EmptyState />;
  }

  const [{ data: organizationRows }, { data: memberRows }, { data: propertyRows }, { data: siteRows }] = await Promise.all([
    supabase.from("organizations").select("id,name,slug").in("id", organizationIds),
    supabase.from("organization_members").select("organization_id,user_id,status").in("organization_id", organizationIds).eq("status", "ACTIVE"),
    supabase.from("properties").select("organization_id,id,status").in("organization_id", organizationIds),
    supabase.from("brokerage_public_sites").select("organization_id,is_active,site_slug,custom_domain,public_phone,public_email,public_whatsapp,public_address,instagram_url").in("organization_id", organizationIds),
  ]);

  const organizations = (organizationRows || []) as Organization[];
  const members = (memberRows || []) as Member[];
  const properties = (propertyRows || []) as Property[];
  const sites = (siteRows || []) as PublicSite[];

  const organizationById = new Map(organizations.map((row) => [row.id, row]));
  const siteByOrganization = new Map(sites.map((row) => [row.organization_id, row]));

  const clients = subscriptions
    .map((subscription) => {
      const organization = organizationById.get(subscription.organization_id);
      const site = siteByOrganization.get(subscription.organization_id);
      const organizationMembers = members.filter((row) => row.organization_id === subscription.organization_id);
      const organizationProperties = properties.filter((row) => row.organization_id === subscription.organization_id);
      return {
        subscription,
        organization,
        site,
        activeAgents: organizationMembers.length,
        totalProperties: organizationProperties.length,
        activeProperties: organizationProperties.filter((row) => row.status === "ACTIVE").length,
      };
    })
    .filter((client) => client.organization)
    .sort((a, b) => (a.organization?.name || "").localeCompare(b.organization?.name || "", "es"));

  return (
    <main className="min-h-screen bg-[#f3ecdf] px-5 py-8 text-[#302d28] md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-[#d6c8b5] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8d7553]">
              <ShieldCheck size={14} /> Vista privada de plataforma
            </div>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Clientes activos</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d55]">
              Directorio conectado a PropertyOS. Muestra solamente datos generales de la inmobiliaria, volumen operativo y canales públicos de contacto. No expone leads, conversaciones, facturación ni datos personales del equipo.
            </p>
          </div>
          <Link href="/protected/admin" className="w-fit rounded-lg border border-[#b9aa94] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-[#4f4436]">
            Volver a Admin
          </Link>
        </div>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Inmobiliarias activas" value={clients.length} />
          <Stat label="Agentes activos" value={clients.reduce((sum, client) => sum + client.activeAgents, 0)} />
          <Stat label="Propiedades cargadas" value={clients.reduce((sum, client) => sum + client.totalProperties, 0)} />
          <Stat label="Propiedades activas" value={clients.reduce((sum, client) => sum + client.activeProperties, 0)} />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {clients.map((client) => {
            const organization = client.organization!;
            const site = client.site;
            const publicWeb = site?.custom_domain
              ? `https://${site.custom_domain}`
              : site?.is_active && site.site_slug
                ? `/inmobiliaria/${site.site_slug}`
                : null;

            return (
              <article key={organization.id} className="rounded-2xl border border-[#d2c5b3] bg-[#f8f1e7] p-6 shadow-[0_14px_38px_rgba(72,58,40,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d2c5b3] bg-[#eee4d5] text-[#786447]"><Building2 size={19} /></span>
                    <div>
                      <h2 className="font-serif text-2xl font-medium">{organization.name}</h2>
                      <p className="mt-1 text-xs text-[#81786d]">Plan {client.subscription.plan}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#aab89b] bg-[#e4e8dc] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#536048]">Activa</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Metric icon={<Users size={15} />} label="Agentes activos" value={client.activeAgents} />
                  <Metric icon={<Home size={15} />} label="Propiedades" value={client.totalProperties} detail={`${client.activeProperties} activas`} />
                </div>

                <div className="mt-5 rounded-xl border border-[#ddd1c0] bg-[#fffaf2] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796e]">Contacto público de la inmobiliaria</p>
                  <div className="mt-3 grid gap-2 text-sm text-[#4e4840]">
                    <Contact icon={<Phone size={14} />} value={site?.public_phone || site?.public_whatsapp} fallback="Sin teléfono público cargado" />
                    <Contact icon={<Mail size={14} />} value={site?.public_email} fallback="Sin email público cargado" />
                    <Contact icon={<MapPin size={14} />} value={site?.public_address} fallback="Sin dirección pública cargada" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {publicWeb && <a href={publicWeb} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#cdbfa9] px-3 py-2 text-xs font-semibold text-[#5f513e]">Sitio público <ExternalLink size={12} /></a>}
                    {site?.instagram_url && <a href={site.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#cdbfa9] px-3 py-2 text-xs font-semibold text-[#5f513e]">Instagram <ExternalLink size={12} /></a>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <main className="min-h-screen bg-[#f3ecdf] p-8 text-[#302d28]">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#d2c5b3] bg-[#f8f1e7] p-8">
        <h1 className="font-serif text-4xl">Clientes activos</h1>
        <p className="mt-4 text-sm text-[#625d55]">Todavía no hay organizaciones con suscripción ACTIVE.</p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#d2c5b3] bg-[#f8f1e7] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7a67]">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p></div>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail?: string }) {
  return <div className="rounded-lg border border-[#ddd1c0] bg-[#fffaf2] p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81796e]">{icon}{label}</p><p className="mt-1 font-serif text-2xl">{value}</p>{detail && <p className="text-xs text-[#81786d]">{detail}</p>}</div>;
}

function Contact({ icon, value, fallback }: { icon: React.ReactNode; value?: string | null; fallback: string }) {
  return <div className="flex items-start gap-2"><span className="mt-0.5 text-[#8d7553]">{icon}</span><span>{value || fallback}</span></div>;
}
