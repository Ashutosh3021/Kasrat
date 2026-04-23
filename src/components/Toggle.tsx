interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

export default function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full relative flex items-center p-1 transition-colors duration-200 ${checked ? 'bg-[#4d8eff]' : 'bg-[#353437]'}`}
    >
      <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )
}
