import { X } from 'lucide-react'

interface Props { onClose: () => void }

const RELEASES = [
  {
    version: '1.1.16',
    date: 'Apr 2025',
    isNew: true,
    changes: [
      'Initial release of KASRAT fitness tracker',
      'Full offline support with IndexedDB storage',
      'Rest timer with audio and vibration alerts',
      'Strength and cardio graph tracking',
    ]
  }
]

export default function WhatsNewDialog({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center animate-fadeIn">
      <div className="w-full max-w-[390px] min-h-screen relative pb-8 flex flex-col bg-black">
        <header className="flex items-center justify-between h-14 px-3 w-full bg-black border-b border-[#2C2C2E] sticky top-0 z-50">
          <button onClick={onClose} className="flex items-center justify-center w-10 h-10 hover:text-[#3B82F6] transition-colors text-[#3B82F6]">
            <X size={22} strokeWidth={1.5} />
          </button>
          <div className="text-xl font-black italic tracking-tighter text-[#3B82F6]">KASRAT</div>
          <div className="w-10" />
        </header>

        <main className="flex-1 px-3 pt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2 mb-4">
            <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-white">What's New</h1>
            <p className="text-[13px] font-medium text-[#A1A1A6]">Version 1.1.16</p>
          </div>

          {RELEASES.map(r => (
            <article
              key={r.version}
              className={`bg-[#1C1C1E] rounded-[4px] p-3 relative overflow-hidden ${r.isNew ? 'border-l-4 border-[#3B82F6]' : 'border border-[#2C2C2E]'}`}
            >
              {r.isNew && (
                <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[rgba(59,130,246,0.1)] to-transparent pointer-events-none" />
              )}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h2 className="text-[22px] font-semibold text-white">{r.version} — {r.date}</h2>
                {r.isNew && (
                  <span className="bg-[#2C2C2E] text-white text-[13px] font-medium px-2 py-1 rounded-[2px] flex items-center gap-1 border border-[#2C2C2E]">
                    New
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-3 relative z-10">
                {r.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#3B82F6] mt-0.5 text-lg">✓</span>
                    <p className="text-[17px] text-[#A1A1A6]">{c}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <div className="mt-8 pt-3 border-t border-[#2C2C2E]">
            <button
              onClick={onClose}
              className="w-full bg-transparent border border-[#2C2C2E] text-white font-semibold text-[15px] h-12 rounded-[2px] flex items-center justify-center gap-2 hover:bg-[#2C2C2E] transition-colors"
            >
              Close
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
