import Link from "next/link";

export default function UpgradePlanGate({
  title,
  description,
  requiredPlan,
}: {
  title: string;
  description: string;
  requiredPlan: "Professional" | "Enterprise";
}) {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-8">
          <div className="inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
            Disponible en {requiredPlan}
          </div>

          <h1 className="mt-5 text-3xl font-bold">{title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-400">{description}</p>

          <Link
            href="/pricing"
            className="mt-7 inline-flex rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400"
          >
            Mejorar plan
          </Link>
        </div>
      </div>
    </main>
  );
}
