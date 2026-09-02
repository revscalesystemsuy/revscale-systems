"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPasswordSecurityError } from "@/lib/password-security";

const PRODUCTION_ORIGIN = "https://revscale-systems-eta.vercel.app";

export function SignUpForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    try {
      const passwordSecurityError = await getPasswordSecurityError(password);
      if (passwordSecurityError) {
        setError(passwordSecurityError);
        return;
      }

      const supabase = createClient();
      const origin = window.location.hostname === "localhost" ? window.location.origin : PRODUCTION_ORIGIN;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/login?confirmed=1` },
      });

      if (signUpError) throw signUpError;
      router.push(`/pricing?new=1&email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)]">
      <div className="text-center">
        <Link href="/" className="inline-flex items-baseline gap-2">
          <span className="font-serif text-2xl tracking-tight text-[#292722]">RevScale</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
        </Link>
        <h1 className="mt-6 font-serif text-3xl font-medium text-[#29251f]">Registrarse</h1>
        <p className="mt-2 text-sm text-[#716a61]">Creá tu cuenta y en el siguiente paso elegí el plan para tu inmobiliaria.</p>
      </div>

      <form onSubmit={handleSignUp} className="mt-7 space-y-4">
        {[
          ["email", "Correo electrónico", "email", email, setEmail],
          ["password", "Contraseña", "password", password, setPassword],
          ["repeat-password", "Repetir contraseña", "password", repeatPassword, setRepeatPassword],
        ].map(([id, label, type, value, setter]) => (
          <div key={String(id)}>
            <label htmlFor={String(id)} className="text-sm font-medium text-[#4b453d]">{String(label)}</label>
            <input
              id={String(id)}
              type={String(type)}
              required
              minLength={String(type) === "password" ? 12 : undefined}
              autoComplete={String(type) === "password" ? "new-password" : "email"}
              value={String(value)}
              onChange={(e) => (setter as (value: string) => void)(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3 text-[#292722] outline-none transition focus:border-[#8a714d]"
            />
          </div>
        ))}

        <p className="text-xs leading-5 text-[#716a61]">Usá 12+ caracteres con mayúscula, minúscula, número y símbolo. También rechazamos contraseñas presentes en filtraciones conocidas.</p>

        {error && <div className="rounded-xl border border-[#d7b7aa] bg-[#f7e8df] p-3 text-sm text-[#7a3f32]">{error}</div>}

        <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-[#2f2b25] px-5 py-3 font-semibold text-[#fffaf2] transition hover:bg-[#1f1c18] disabled:opacity-60">
          {isLoading ? "Validando seguridad..." : "Registrarme y elegir plan"}
        </button>
      </form>

      <div className="mt-6 border-t border-[#ddd1c1] pt-5 text-center text-sm text-[#716a61]">
        ¿Ya tenés cuenta? <Link href="/auth/login" className="font-semibold text-[#6f5c40]">Iniciar sesión</Link>
      </div>
    </div>
  );
}
