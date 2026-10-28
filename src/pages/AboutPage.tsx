import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Settings, Bug, Star, Lock, FileText, Code } from 'lucide-react'

const GITHUB = 'https://github.com/Ashutosh3021/Kasrat'

const LINKS = [
  { icon: Bug, label: 'Report a Bug', href: GITHUB },
  { icon: Star, label: 'Rate the App', href: GITHUB },
  { icon: Lock, label: 'Privacy Policy', href: GITHUB },
  { icon: FileText, label: 'Licenses', href: GITHUB },
  { icon: Code, label: 'GitHub Repository', href: GITHUB },
]

export default function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-ground pb-8">
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-3 h-14 bg-ground border-b border-line">
        <button onClick={() => navigate(-1)} className="text-zinc-400 hover:opacity-80 p-2 -ml-2">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <span className="text-xl font-black italic text-accent-soft tracking-tight uppercase font-bold">KASRAT</span>
        <button onClick={() => navigate('/settings')} className="text-zinc-400 hover:opacity-80 p-2 -mr-2">
          <Settings size={22} strokeWidth={1.5} />
        </button>
      </nav>

      <main className="pt-24 px-3 pb-[env(safe-area-inset-bottom)] flex flex-col items-center max-w-lg mx-auto w-full">
        <header className="flex flex-col items-center mb-8 w-full">
          <div className="w-28 h-28 bg-accent rounded-2xl flex items-center justify-center mb-6">
            <span className="text-[64px] font-black text-ink leading-none italic">K</span>
          </div>
          <h1 className="text-[40px] font-semibold leading-10 tracking-tight text-ink mb-1">KASRAT</h1>
          <p className="text-[13px] font-medium text-muted tracking-widest uppercase mb-3">Version 1.2.36</p>
          <p className="text-[16px] text-muted text-center max-w-[240px]">Track your gym progress</p>
        </header>

        <nav aria-label="About App Links" className="w-full flex flex-col gap-3 mb-8">
          {LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-surface rounded-2xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform border border-line focus:border-accent-hover outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-line flex items-center justify-center text-muted group-hover:text-accent-soft transition-colors">
                  <link.icon size={20} strokeWidth={1.5} />
                </div>
                <span className="font-semibold text-[15px] text-ink">{link.label}</span>
              </div>
              <ChevronRight size={20} strokeWidth={1.5} className="text-muted group-hover:text-ink transition-colors" />
            </a>
          ))}
        </nav>

        <footer className="mt-auto pt-8 pb-8 flex flex-col items-center w-full">
          <p className="text-[13px] font-medium text-muted">
            Made for lifters
          </p>
          <p className="text-[13px] font-medium text-muted-dim mt-2">© 2026 KASRAT</p>
        </footer>
      </main>
    </div>
  )
}
