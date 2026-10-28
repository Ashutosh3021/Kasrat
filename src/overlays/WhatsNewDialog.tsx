import { X } from 'lucide-react'

interface Props { onClose: () => void }

const RELEASES = [
  {
    version: '1.2.36',
    date: 'Apr 2026',
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
    <div className="fixed inset-0 z-[100] bg-ground/80 backdrop-blur-sm flex justify-center animate-fadeIn">
      <div className="w-full max-w-[390px] min-h-screen relative pb-8 flex flex-col bg-ground">
        <header className="flex items-center justify-between h-14 px-3 w-full bg-ground border-b border-line sticky top-0 z-50">
          <button onClick={onClose} className="flex items-center justify-center w-10 h-10 hover:text-accent-soft transition-colors text-accent-soft">
            <X size={22} strokeWidth={1.5} />
          </button>
          <div className="text-xl font-black italic tracking-tighter text-accent-soft">KASRAT</div>
          <div className="w-10" />
        </header>

        <main className="flex-1 px-3 pt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2 mb-4">
            <h1 className="text-[40px] font-semibold leading-10 tracking-tight text-ink">What's New</h1>
            <p className="text-[13px] font-medium text-muted">Version 1.2.36</p>
          </div>

          {RELEASES.map(r => (
            <article
              key={r.version}
              className={`bg-surface rounded-2xl p-3 relative overflow-hidden ${r.isNew ? 'border-l-4 border-accent-hover' : 'border border-line'}`}
            >
              {r.isNew && (
                <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[rgba(59,130,246,0.1)] to-transparent pointer-events-none" />
              )}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h2 className="text-[24px] font-semibold text-ink">{r.version} — {r.date}</h2>
                {r.isNew && (
                  <span className="bg-line text-ink text-[13px] font-medium px-2 py-1 rounded-lg flex items-center gap-1 border border-line">
                    New
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-3 relative z-10">
                {r.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-accent-soft mt-0.5 text-lg">✓</span>
                    <p className="text-[16px] text-muted">{c}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <div className="mt-8 pt-3 border-t border-line">
            <button
              onClick={onClose}
              className="w-full bg-transparent border border-line text-ink font-semibold text-[15px] h-12 rounded-lg flex items-center justify-center gap-2 hover:bg-line transition-colors"
            >
              Close
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
