interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ${
        checked
          ? 'border-accent bg-accent'
          : 'border-line-strong bg-surface-high'
      }`}
    >
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-sm transition-all duration-200 ${
          checked
            ? 'left-[25px] bg-on-accent'
            : 'left-[3px] bg-ink-soft'
        }`}
        aria-hidden="true"
      />
    </button>
  )
}
