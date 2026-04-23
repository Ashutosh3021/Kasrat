import { useNavigate } from 'react-router-dom'
import { Settings, ArrowLeft } from 'lucide-react'

interface TopBarProps {
  showBack?: boolean
  title?: string
  showSettings?: boolean
  onSettingsClick?: () => void
}

export default function TopBar({ showBack, title, showSettings = true, onSettingsClick }: TopBarProps) {
  const navigate = useNavigate()
  return (
    <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md flex justify-between items-center px-4 h-14 border-b border-[#2C2C2E]">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:opacity-80">
            <ArrowLeft size={22} />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#353437] flex items-center justify-center overflow-hidden">
            <span className="text-xs font-bold text-[#adc6ff]">K</span>
          </div>
        )}
        {!showBack && (
          <span className="text-xl font-black tracking-tighter text-[#3B82F6]">KASRAT</span>
        )}
        {showBack && title && (
          <span className="font-semibold text-[22px] leading-7 text-white absolute left-1/2 -translate-x-1/2">{title}</span>
        )}
      </div>
      {showSettings && (
        <button
          onClick={onSettingsClick ?? (() => navigate('/settings'))}
          className="text-zinc-400 hover:opacity-80 transition-opacity p-2"
        >
          <Settings size={22} />
        </button>
      )}
    </header>
  )
}
