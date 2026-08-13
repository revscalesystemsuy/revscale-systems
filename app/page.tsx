import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div>
          <span className="text-xl font-bold">RevScale</span>
          <span className="text-xl text-blue-400"> PropertyOS</span>
        </div>

        <Link
          href="/auth/login"
          className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-950"
        >
          Ingresar
        </Link>
      </nav>

      <section className="mx-auto flex min-h-[75vh] max-w-6xl flex-col justify-center px-8">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">
          AI Sales Intelligence for Real Estate
        </p>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Convertí más leads inmobiliarios con inteligencia comercial.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Centralizá leads, conversaciones, prioridades y follow-ups en una
          plataforma diseñada para equipos inmobiliarios.
        </p>

        <div className="mt-10">
          <Link
            href="/auth/login"
            className="inline-block rounded-xl bg-blue-500 px-7 py-3 font-semibold text-white"
          >
            Entrar a PropertyOS
          </Link>
        </div>
      </section>
    </main>
  );
}