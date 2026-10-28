import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="kicker px-1">{title}</h2>
      <div className="card overflow-hidden divide-y divide-line">{children}</div>
    </section>
  )
}

export function SettingsRow({
  label,
  hint,
  value,
  trailing,
  onClick,
  danger,
  disabled,
}: {
  label: string
  hint?: string
  value?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}) {
  const content = (
    <>
      <span className="min-w-0 text-left">
        <span className={`block text-[14px] font-medium tracking-[-0.01em] ${danger ? 'text-danger' : 'text-ink'}`}>
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-muted">{hint}</span>}
      </span>
      <span className="flex max-w-[62%] min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5 text-right text-[13px] text-muted">
        {value}
        {trailing ?? (onClick ? <ChevronRight size={16} strokeWidth={1.7} className="shrink-0 text-muted-dim" /> : null)}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-ink/[0.035] disabled:opacity-50"
      >
        {content}
      </button>
    )
  }

  return <div className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-3">{content}</div>
}
