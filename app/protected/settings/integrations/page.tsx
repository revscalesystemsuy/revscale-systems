import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Facebook,
  Globe2,
  Instagram,
  MessageCircle,
  PlugZap,
  ShieldCheck,
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
              Conectá los canales que usa tu inmobiliaria y hacé que las consultas lleguen a
              RevScale desde un solo lugar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Organización</p>
            <p className="mt-1 font-semibold">{organization?.name || "Tu inmobiliaria"}</p>
          </div>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <IntegrationCard
            icon={<MessageCircle className="h-6 w-6" />}
            title="WhatsApp Business"
            description="Recibí consultas de WhatsApp y convertí conversaciones en oportunidades dentro de RevScale."
            status="PRÓXIMAMENTE"
            accentClassName="border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
            buttonLabel="Conectar WhatsApp"
            disabled
          />

          <IntegrationCard
            icon={<Instagram className="h-6 w-6" />}
            title="Instagram"
            description="Centralizá mensajes de una cuenta profesional de Instagram dentro del perfil de cada lead."
            status="PRÓXIMAMENTE"
            accentClassName="border-pink-400/20 bg-pink-500/10 text-pink-300"
            buttonLabel="Conectar Instagram"
            disabled
          />

          <IntegrationCard
            icon={<Facebook className="h-6 w-6" />}
            title="Facebook"
            description="Recibí consultas de Messenger y leads provenientes de campañas en un mismo sistema."
            status="PRÓXIMAMENTE"
            accentClassName="border-blue-400/20 bg-blue-500/10 text-blue-300"
            buttonLabel="Conectar Facebook"
            disabled
          />

          <IntegrationCard
            icon={<Globe2 className="h-6 w-6" />}
            title="Sitio web"
            description="Hacé que los formularios de tu página web envíen automáticamente las consultas a RevScale."
            status="DISPONIBLE"
            accentClassName="border-cyan-400/20 bg-cyan-500/10 text-cyan-300"
            buttonLabel="Conectar sitio web"
            href="https://wa.me/59892715418?text=Hola%2C%20quiero%20conectar%20el%20sitio%20web%20de%20mi%20inmobiliaria%20con%20RevScale."
          />
        </section>

        <section className="mt-8 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Conexiones simples y seguras</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Cuando una integración esté habilitada, solo vas a tener que iniciar sesión,
                autorizar la cuenta y volver a RevScale. No vas a ver claves, códigos ni
                configuraciones técnicas.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function IntegrationCard({
  icon,
  title,
  description,
  status,
  accentClassName,
  buttonLabel,
  href,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
  accentClassName: string;
  buttonLabel: string;
  href?: string;
  disabled?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-xl border p-3 ${accentClassName}`}>{icon}</div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${
            status === "DISPONIBLE"
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              : "border-blue-400/20 bg-blue-500/10 text-blue-300"
          }`}
        >
          {status}
        </span>
      </div>

      <h2 className="mt-5 text-xl font-semibold">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{description}</p>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
        >
          {buttonLabel}
        </a>
      ) : (
        <button
          type="button"
          disabled={disabled}
          className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-500"
        >
          {buttonLabel}
        </button>
      )}
    </article>
  );
}
