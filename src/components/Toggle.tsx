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
      className={`w-12 h-6 relative flex items-center p-1 transition-colors duration-200 border ${checked ? 'bg-[#93032E] border-[#93032E]' : 'bg-[#353437] border-[#353437]'}`}
      style={{ borderRadius: '2px' }}
    >
      <span className={`w-4 h-4 bg-white transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} style={{ borderRadius: '1px' }} />
    </button>
  )
}

