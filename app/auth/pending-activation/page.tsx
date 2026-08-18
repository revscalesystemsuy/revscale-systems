import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/lib/organization-role";

export default async function PendingActivationPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/auth/login");

  const context = await getCurrentOrganizationContext();
  if (context) redirect("/protected");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-blue-400/20 bg-white/[0.03] p-8 text-center shadow-2xl">
        <div className="text-5xl">✅</div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
          RevScale PropertyOS
        </p>
        <h1 className="mt-2 text-3xl font-bold">Cuenta creada correctamente</h1>
        <p className="mt-4 text-slate-300">
          Tu email ya está confirmado. Ahora falta que RevScale active la inmobiliaria y el plan solicitado.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Cuando la cuenta sea activada, vas a poder entrar con el mismo email y contraseña y acceder al sistema sin volver a registrarte.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <a
            href="https://wa.me/59892715418?text=Hola%2C%20ya%20confirm%C3%A9%20mi%20cuenta%20de%20RevScale%20y%20quiero%20activar%20mi%20plan."
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
          >
            Contactar a RevScale
          </a>
          <Link
            href="/protected"
            className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-slate-200 hover:bg-white/5"
          >
            Comprobar activación
          </Link>
        </div>
      </div>
    </main>
  );
}
