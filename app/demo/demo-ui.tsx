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
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b49a6b]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#f5efe4] text-balance md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa59c] md:text-[15px]">
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
    <div className="rounded-xl border border-[#353229] bg-[#1b1a17] p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8f8a80]">
        {title}
      </p>
      <p className="mt-3 font-serif text-[2rem] font-medium leading-none tracking-tight text-[#f5efe4] tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-3 text-xs leading-5 text-[#77736b]">{hint}</p>}
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
      className={`rounded-xl border border-[#353229] bg-[#1b1a17] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.12)] ${className}`}
    >
      {title && (
        <h2 className="mb-5 font-serif text-xl font-medium tracking-tight text-[#efe8db]">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#4a4438] bg-[#1c1a16] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#cdb88f]">
      Demo
      <span className="font-normal normal-case tracking-normal text-[#8f8a80]">
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
        <span className="text-[#b9b3a8]">{label}</span>
        <span className="font-medium text-[#eee7da] tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#2c2923]">
        <div
          className="h-full rounded-full bg-[#b49a6b]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
