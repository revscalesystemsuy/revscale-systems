import { createClient } from "@/lib/supabase/server";
import { generateWebIntegrationToken } from "@/lib/integrations/web-key";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Facebook,
  Globe2,
  Instagram,
  KeyRound,
  MessageCircle,
  PlugZap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default async function IntegrationsPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!membership?.organization_id) {
    redirect("/protected");
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", membership.organization_id)
    .single();

  const organizationId = organization?.id || membership.organization_id;
  const integrationToken = generateWebIntegrationToken(organizationId);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://revscale-systems-eta.vercel.app";
  const endpoint = `${appUrl}/api/integrations/web-leads`;

  const examplePayload = JSON.stringify(
    {
      organization_id: organizationId,
      token: integrationToken || "CONFIGURAR_INTEGRATIONS_SIGNING_SECRET",
      full_name: "Nombre del cliente",
      phone: "099123456",
      email: "cliente@email.com",
      operation: "COMPRA",
      property_type: "APARTAMENTO",
      primary_zone: "Pocitos",
      budget_max: 250000,
      currency: "USD",
      bedrooms_min: 2,
    },
    null,
    2
  );

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/protected/settings"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a configuración
        </Link>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-300">
                <PlugZap className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
                  RevScale PropertyOS
                </p>
                <h1 className="mt-1 text-3xl font-bold">Integraciones</h1>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-slate-400">
              Conectá los canales donde recibe consultas tu inmobiliaria para que los leads
              entren a RevScale y el equipo pueda priorizarlos, seguirlos y trabajarlos desde
              un solo lugar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Organización</p>
            <p className="mt-1 font-semibold">{organization?.name || "Tu inmobiliaria"}</p>
          </div>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <IntegrationCard
            icon={<Globe2 className="h-6 w-6" />}
            title="Sitio web"
            description="Recibí automáticamente en RevScale las consultas de los formularios de tu página web."
            status={integrationToken ? "LISTA PARA CONFIGURAR" : "FALTA VARIABLE DE ENTORNO"}
            statusClassName={
              integrationToken
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                : "border-amber-400/20 bg-amber-500/10 text-amber-300"
            }
            accentClassName="border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          >
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm font-semibold text-white">Qué pasa automáticamente</p>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                <p>1. Un cliente completa el formulario de la inmobiliaria.</p>
                <p>2. La web envía esa consulta al endpoint de RevScale.</p>
                <p>3. RevScale identifica la organización y busca si el lead ya existe.</p>
                <p>4. Lo crea o actualiza y lo deja listo para scoring y seguimiento.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Credential
                label="Endpoint de recepción"
                value={endpoint}
              />

              <Credential
                label="Organization ID"
                value={organizationId}
              />

              <Credential
                label="Clave de recepción"
                value={integrationToken || "Todavía no configurada"}
                secret
              />
            </div>

            <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/[0.06] p-4">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                <p className="text-sm leading-6 text-slate-300">
                  Esta clave permite únicamente enviar leads a esta organización. Para una
                  integración final recomendamos enviarla desde el servidor de la web de la
                  inmobiliaria y no publicarla en código visible del navegador.
                </p>
              </div>
            </div>
          </IntegrationCard>

          <IntegrationCard
            icon={<MessageCircle className="h-6 w-6" />}
            title="WhatsApp Business"
            description="Recibí conversaciones de WhatsApp Business y convertí mensajes entrantes en oportunidades comerciales."
            status="SIGUIENTE ETAPA"
            statusClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
            accentClassName="border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          >
            <p className="mt-5 text-sm leading-6 text-slate-400">
              La conexión se realizará mediante la plataforma oficial de WhatsApp Business de
              Meta. La inmobiliaria autorizará su cuenta sin compartir contraseñas con RevScale.
            </p>
          </IntegrationCard>

          <IntegrationCard
            icon={<Instagram className="h-6 w-6" />}
            title="Instagram"
            description="Centralizá consultas que llegan por mensajes de una cuenta profesional de Instagram."
            status="SIGUIENTE ETAPA"
            statusClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
            accentClassName="border-pink-400/20 bg-pink-500/10 text-pink-300"
          >
            <p className="mt-5 text-sm leading-6 text-slate-400">
              Los mensajes entrantes podrán alimentar el perfil comercial del lead para que el
              equipo no tenga que revisar distintos canales por separado.
            </p>
          </IntegrationCard>

          <IntegrationCard
            icon={<Facebook className="h-6 w-6" />}
            title="Facebook"
            description="Conectá Messenger y, más adelante, formularios de campañas para enviar los leads a PropertyOS."
            status="SIGUIENTE ETAPA"
            statusClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
            accentClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
          >
            <p className="mt-5 text-sm leading-6 text-slate-400">
              RevScale podrá identificar el origen de cada oportunidad y mantener el historial
              comercial dentro del mismo lead.
            </p>
          </IntegrationCard>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">Ejemplo de datos que recibe RevScale</h2>
          <p className="mt-2 text-sm text-slate-400">
            El desarrollador de la web de la inmobiliaria puede enviar este JSON mediante POST.
          </p>

          <pre className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-5 text-xs leading-6 text-slate-300">
            <code>{examplePayload}</code>
          </pre>
        </section>

        <section className="mt-8 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="mt-1 rounded-xl bg-blue-500/10 p-2 text-blue-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold">Objetivo de las integraciones</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Que el agente no tenga que copiar consultas manualmente. RevScale recibe la
                  información, la organiza y deja cada oportunidad preparada para priorización,
                  seguimiento y matching con propiedades.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              <ShieldCheck className="h-4 w-4 text-blue-300" />
              Conexiones por organización
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Credential({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-slate-900 px-4 py-3">
        <code className="whitespace-nowrap text-xs text-slate-300">
          {secret && value !== "Todavía no configurada" ? value : value}
        </code>
      </div>
    </div>
  );
}

function IntegrationCard({
  icon,
  title,
  description,
  status,
  statusClassName,
  accentClassName,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
  statusClassName: string;
  accentClassName: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-xl border p-3 ${accentClassName}`}>{icon}</div>

        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${statusClassName}`}
        >
          {status}
        </span>
      </div>

      <h2 className="mt-5 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      {children}
    </article>
  );
}
