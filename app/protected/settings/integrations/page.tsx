import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Facebook,
  Globe2,
  Instagram,
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
    .select("name")
    .eq("id", membership.organization_id)
    .single();

  const webIntegrationReady = Boolean(
    process.env.INTEGRATIONS_SIGNING_SECRET &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
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
              entren automáticamente a RevScale y el equipo pueda priorizarlos, seguirlos y
              trabajarlos desde un solo lugar.
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
            description="Recibí automáticamente en RevScale las consultas que llegan desde los formularios de tu página web."
            status={webIntegrationReady ? "DISPONIBLE" : "CONFIGURACIÓN PENDIENTE"}
            statusClassName={
              webIntegrationReady
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                : "border-amber-400/20 bg-amber-500/10 text-amber-300"
            }
            accentClassName="border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          >
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm font-semibold text-white">Qué hace RevScale por vos</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <Feature text="Recibe los leads de tu web sin carga manual." />
                <Feature text="Detecta si el contacto ya existe y evita duplicados." />
                <Feature text="Organiza la información y calcula una prioridad inicial." />
                <Feature text="Deja el lead listo para seguimiento, matching y próximas acciones." />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/[0.06] p-4">
              <p className="text-sm leading-6 text-slate-300">
                La conexión técnica se configura de forma segura por detrás. Tu equipo no tiene
                que copiar claves, ver códigos ni modificar RevScale.
              </p>
            </div>

            <a
              href="https://wa.me/59892715418?text=Hola%2C%20quiero%20conectar%20el%20sitio%20web%20de%20mi%20inmobiliaria%20con%20RevScale."
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Solicitar conexión del sitio web
            </a>
          </IntegrationCard>

          <IntegrationCard
            icon={<MessageCircle className="h-6 w-6" />}
            title="WhatsApp Business"
            description="Centralizá conversaciones de WhatsApp Business y convertí mensajes entrantes en oportunidades comerciales."
            status="PRÓXIMAMENTE"
            statusClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
            accentClassName="border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          >
            <p className="mt-5 text-sm leading-6 text-slate-400">
              La inmobiliaria podrá autorizar su cuenta de WhatsApp Business y hacer que los
              mensajes relevantes alimenten automáticamente sus leads en RevScale.
            </p>
          </IntegrationCard>

          <IntegrationCard
            icon={<Instagram className="h-6 w-6" />}
            title="Instagram"
            description="Centralizá consultas que llegan por mensajes de una cuenta profesional de Instagram."
            status="PRÓXIMAMENTE"
            statusClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
            accentClassName="border-pink-400/20 bg-pink-500/10 text-pink-300"
          >
            <p className="mt-5 text-sm leading-6 text-slate-400">
              Las consultas podrán sumarse al perfil comercial del lead para que el equipo no
              tenga que revisar distintos canales por separado.
            </p>
          </IntegrationCard>

          <IntegrationCard
            icon={<Facebook className="h-6 w-6" />}
            title="Facebook"
            description="Centralizá consultas de Messenger y leads provenientes de campañas."
            status="PRÓXIMAMENTE"
            statusClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
            accentClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
          >
            <p className="mt-5 text-sm leading-6 text-slate-400">
              RevScale podrá identificar el origen de cada oportunidad y mantener su actividad
              comercial dentro del mismo lead.
            </p>
          </IntegrationCard>
        </section>

        <section className="mt-8 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="mt-1 rounded-xl bg-blue-500/10 p-2 text-blue-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold">Todo llega a un mismo lugar</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  El objetivo es que tu equipo no tenga que copiar consultas ni revisar cada
                  canal por separado. RevScale organiza cada oportunidad para priorización,
                  seguimiento y matching con propiedades.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              <ShieldCheck className="h-4 w-4 text-blue-300" />
              Integraciones seguras
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <span>{text}</span>
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
