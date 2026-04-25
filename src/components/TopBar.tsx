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
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
        ) : (
          <div className="w-8 h-8 bg-[#353437] flex items-center justify-center overflow-hidden" style={{ borderRadius: '2px' }}>
            <span className="text-xs font-medium text-[#3B82F6]">K</span>
          </div>
        )}
        {!showBack && (
          <span className="text-xl font-semibold tracking-tight text-[#3B82F6]">KASRAT</span>
        )}
        {showBack && title && (
          <span className="font-medium text-[22px] leading-7 text-white absolute left-1/2 -translate-x-1/2">{title}</span>
        )}
      </div>
      {showSettings && (
        <button
          onClick={onSettingsClick ?? (() => navigate('/settings'))}
          className="text-[#A1A1A6] hover:opacity-80 transition-opacity p-2"
        >
          <Settings size={20} strokeWidth={1.5} />
        </button>
      )}
    </header>
  )
}

