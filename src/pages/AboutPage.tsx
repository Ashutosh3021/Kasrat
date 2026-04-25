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
    <div className="min-h-screen bg-black pb-8">
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-3 h-14 bg-black border-b border-[#2C2C2E]">
        <button onClick={() => navigate(-1)} className="text-zinc-400 hover:opacity-80 p-2 -ml-2">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <span className="text-xl font-black italic text-[#3B82F6] tracking-tight uppercase font-bold">KASRAT</span>
        <button onClick={() => navigate('/settings')} className="text-zinc-400 hover:opacity-80 p-2 -mr-2">
          <Settings size={22} strokeWidth={1.5} />
        </button>
      </nav>

      <main className="pt-24 px-3 pb-[env(safe-area-inset-bottom)] flex flex-col items-center max-w-lg mx-auto w-full">
        <header className="flex flex-col items-center mb-8 w-full">
          <div className="w-28 h-28 bg-[#3B82F6] rounded-[4px] flex items-center justify-center mb-6">
            <span className="text-[64px] font-black text-white leading-none italic">K</span>
          </div>
          <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-white mb-1">KASRAT</h1>
          <p className="text-[13px] font-medium text-[#A1A1A6] tracking-widest uppercase mb-3">Version 1.1.16</p>
          <p className="text-[17px] text-[#A1A1A6] text-center max-w-[240px]">Track your gym progress</p>
        </header>

        <nav aria-label="About App Links" className="w-full flex flex-col gap-3 mb-8">
          {LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#1C1C1E] rounded-[4px] p-3 flex items-center justify-between active:scale-[0.98] transition-transform border border-[#2C2C2E] focus:border-[#3B82F6] outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[2px] bg-[#2C2C2E] flex items-center justify-center text-[#A1A1A6] group-hover:text-[#3B82F6] transition-colors">
                  <link.icon size={20} strokeWidth={1.5} />
                </div>
                <span className="font-semibold text-[15px] text-white">{link.label}</span>
              </div>
              <ChevronRight size={20} strokeWidth={1.5} className="text-[#A1A1A6] group-hover:text-white transition-colors" />
            </a>
          ))}
        </nav>

        <footer className="mt-auto pt-8 pb-8 flex flex-col items-center w-full">
          <p className="text-[13px] font-medium text-[#A1A1A6]">
            Made for lifters
          </p>
          <p className="text-[13px] font-medium text-[#424754] mt-2">© 2025 KASRAT</p>
        </footer>
      </main>
    </div>
  )
}
