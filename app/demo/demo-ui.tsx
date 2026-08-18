import type { ReactNode } from "react"

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
      <div>
        {eyebrow && (
          <p className="text-sm font-medium text-blue-400">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-3xl font-bold text-balance">{title}</h1>
        {subtitle && <p className="mt-2 text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function MetricCard({
  title,
  value,
  hint,
}: {
  title: string
  value: number | string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 ${className}`}
    >
      {title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}
      {children}
    </div>
  )
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
      Modo demo
      <span className="font-normal text-slate-400">{children}</span>
    </span>
  )
}

/** Barra horizontal simple para gráficos coherentes con la estética. */
export function BarRow({
  label,
  value,
  max,
  suffix = "",
}: {
  label: string
  value: number
  max: number
  suffix?: string
}) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
