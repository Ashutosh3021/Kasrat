import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Settings } from 'lucide-react'

const LINKS = [
  { icon: '🐛', label: 'Report a Bug', href: '#' },
  { icon: '⭐', label: 'Rate the App', href: '#' },
  { icon: '🔒', label: 'Privacy Policy', href: '#' },
  { icon: '📄', label: 'Licenses', href: '#' },
  { icon: '💻', label: 'GitHub Repository', href: '#' },
]

export default function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-black pb-8">
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-4 h-14 bg-black border-b border-[#2C2C2E]">
        <button onClick={() => navigate(-1)} className="text-zinc-400 hover:opacity-80 p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <span className="text-xl font-black italic text-[#3B82F6] tracking-tight uppercase font-bold">KASRAT</span>
        <button onClick={() => navigate('/settings')} className="text-zinc-400 hover:opacity-80 p-2 -mr-2">
          <Settings size={22} />
        </button>
      </nav>

      <main className="pt-24 px-4 pb-[env(safe-area-inset-bottom)] flex flex-col items-center max-w-lg mx-auto w-full">
        <header className="flex flex-col items-center mb-8 w-full">
          <div className="w-28 h-28 bg-[#4d8eff] rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(77,142,255,0.15)]">
            <span className="text-[64px] font-black text-[#00285d] leading-none italic">K</span>
          </div>
          <h1 className="text-[32px] font-bold leading-10 tracking-tight text-white mb-1">KASRAT</h1>
          <p className="text-[13px] font-medium text-[#c6c6cb] tracking-widest uppercase mb-3">Version 1.0.0</p>
          <p className="text-[17px] text-[#c2c6d6] text-center max-w-[240px]">Track your gym progress</p>
        </header>

        <nav aria-label="About App Links" className="w-full flex flex-col gap-3 mb-8">
          {LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="group bg-[#1f1f21] rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform border border-transparent focus:border-[#adc6ff] outline-none"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#353437] flex items-center justify-center text-[#c2c6d6] group-hover:text-[#adc6ff] transition-colors">
                  <span className="text-lg">{link.icon}</span>
                </div>
                <span className="font-semibold text-[15px] text-white">{link.label}</span>
              </div>
              <ChevronRight size={20} className="text-[#8c909f] group-hover:text-white transition-colors" />
            </a>
          ))}
        </nav>

        <footer className="mt-auto pt-8 pb-8 flex flex-col items-center w-full">
          <p className="text-[13px] font-medium text-[#c6c6cb] flex items-center gap-1">
            Made with <span className="text-red-500 text-base">❤️</span> for lifters
          </p>
          <p className="text-[13px] font-medium text-[#424754] mt-2">© 2025 KASRAT</p>
        </footer>
      </main>
    </div>
  )
}
