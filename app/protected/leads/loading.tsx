export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-5 w-32 rounded bg-white/10" />
        <div className="mt-8 h-10 w-72 rounded bg-white/10" />

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
        </div>

        <div className="mt-8 h-64 rounded-2xl bg-white/5" />
      </div>
    </main>
  );
}