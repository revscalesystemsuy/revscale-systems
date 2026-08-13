export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="animate-pulse">
        <div className="h-8 w-64 rounded bg-white/10" />
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}