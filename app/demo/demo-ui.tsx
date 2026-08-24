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
    <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8e7754]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#28251f] text-balance md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6a61] md:text-[15px]">
            {subtitle}
          </p>
        )}
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
    <div className="rounded-xl border border-[#d6cbbb] bg-[#f7f1e8] p-5 shadow-[0_12px_35px_rgba(74,63,48,0.05)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8378]">
        {title}
      </p>
      <p className="mt-3 font-serif text-[2rem] font-medium leading-none tracking-tight text-[#2f2b24] tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-3 text-xs leading-5 text-[#8a8378]">{hint}</p>}
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
    <section
      className={`rounded-xl border border-[#d6cbbb] bg-[#f7f1e8] p-6 shadow-[0_16px_42px_rgba(74,63,48,0.05)] ${className}`}
    >
      {title && (
        <h2 className="mb-5 font-serif text-xl font-medium tracking-tight text-[#302c25]">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#cdbfa9] bg-[#f2eadf] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a714d]">
      Demo
      <span className="font-normal normal-case tracking-normal text-[#7e776d]">
        {children}
      </span>
    </span>
  )
}

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
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-[#625d55]">{label}</span>
        <span className="font-medium text-[#302c25] tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#ddd2c3]">
        <div
          className="h-full rounded-full bg-[#8d7654]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
