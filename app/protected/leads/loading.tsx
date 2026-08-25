export default function Loading() {
  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-3 w-28 rounded bg-[#d9cdbd]" />
        <div className="mt-4 h-10 w-64 rounded bg-[#d9cdbd]" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-[#e2d7c8]" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-28 rounded-xl border border-[#d7cbbb] bg-[#f7f0e6]" />
          <div className="h-28 rounded-xl border border-[#d7cbbb] bg-[#f7f0e6]" />
          <div className="h-28 rounded-xl border border-[#d7cbbb] bg-[#f7f0e6]" />
          <div className="h-28 rounded-xl border border-[#d7cbbb] bg-[#f7f0e6]" />
        </div>

        <div className="mt-8 h-80 rounded-2xl border border-[#d7cbbb] bg-[#f7f0e6]" />
      </div>
    </main>
  );
}
