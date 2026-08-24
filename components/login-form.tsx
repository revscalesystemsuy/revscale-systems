"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        const message = signInError.message.toLowerCase();
        if (message.includes("invalid login credentials")) {
          setError("El correo o la contraseña no son correctos. Si no recordás la contraseña, usá ‘Recuperar contraseña’.");
        } else if (message.includes("email not confirmed")) {
          setError("Primero tenés que confirmar tu correo electrónico.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.push("/protected");
      router.refresh();
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("No se pudo iniciar sesión. Probá nuevamente en unos segundos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)]">
      <div className="text-center">
        <Link href="/" className="inline-flex items-baseline gap-2">
          <span className="font-serif text-2xl tracking-tight text-[#292722]">RevScale</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">PropertyOS</span>
        </Link>
        <h1 className="mt-6 font-serif text-3xl font-medium tracking-tight text-[#29251f]">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-[#716a61]">Ingresá a tu operación comercial inmobiliaria.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-[#4b453d]">Correo electrónico</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3 text-[#292722] outline-none transition placeholder:text-[#8a8379] focus:border-[#8a714d]"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="password" className="text-sm font-medium text-[#4b453d]">Contraseña</label>
            <Link href="/auth/forgot-password" className="text-xs font-medium text-[#7a6547] hover:text-[#4e4130]">Recuperar contraseña</Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#cdbfaa] bg-[#fffaf2] px-4 py-3 text-[#292722] outline-none transition placeholder:text-[#8a8379] focus:border-[#8a714d]"
            placeholder="••••••••"
          />
        </div>

        {error && <div className="rounded-xl border border-[#d7b7aa] bg-[#f7e8df] p-3 text-sm text-[#7a3f32]">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#2f2b25] px-5 py-3 font-semibold text-[#fffaf2] transition hover:bg-[#1f1c18] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      <div className="mt-6 border-t border-[#ddd1c1] pt-5 text-center text-sm text-[#716a61]">
        ¿Sos un cliente nuevo?{" "}
        <Link href="/auth/sign-up" className="font-semibold text-[#6f5c40] hover:text-[#493d2d]">Registrarse</Link>
      </div>
    </div>
  );
}
