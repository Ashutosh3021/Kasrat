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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-ground/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          {showBack ? (
            <>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="icon-btn -ml-1"
                aria-label="Go back"
              >
                <ArrowLeft size={19} strokeWidth={1.8} />
              </button>
              {title && (
                <h1 className="truncate text-[18px] font-bold tracking-[-0.035em] text-ink">{title}</h1>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="group flex items-center gap-2.5 text-left"
              aria-label="Kasrat home"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shadow-[0_12px_28px_-16px_rgba(198,58,25,0.95)] transition-transform duration-200 group-hover:-rotate-3 group-active:scale-95">
                <span className="text-[19px] font-black leading-none tracking-[-0.1em] text-on-accent">K</span>
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[16px] font-extrabold tracking-[-0.045em] text-ink">KASRAT</span>
                <span className="mono mt-1 text-[8px] uppercase tracking-[0.24em] text-muted">Training log</span>
              </span>
            </button>
          )}
        </div>

        {showSettings ? (
          <button
            type="button"
            onClick={onSettingsClick ?? (() => navigate('/settings'))}
            className="icon-btn -mr-1"
            aria-label="Open settings"
          >
            <Settings size={18} strokeWidth={1.8} />
          </button>
        ) : (
          <span className="h-11 w-11" aria-hidden="true" />
        )}
      </div>
    </header>
  )
}
