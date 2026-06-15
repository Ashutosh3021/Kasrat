/**
 * Feature 10: Smartphone Compatibility — PWA Install Banner
 *
 * A dismissible install banner shown after the user has completed
 * INSTALL_THRESHOLD (2) sessions. Drop into App.tsx render tree
 * without modifying the existing App component.
 */

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import {
  canShowInstallPrompt,
  triggerInstallPrompt,
  dismissInstallPrompt,
} from './pwaUtils'

export default function PWAInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small delay so the UI has settled before checking
    const t = setTimeout(() => setVisible(canShowInstallPrompt()), 2000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  async function handleInstall() {
    const outcome = await triggerInstallPrompt()
    if (outcome !== 'unavailable') setVisible(false)
  }

  function handleDismiss() {
    dismissInstallPrompt()
    setVisible(false)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-[#1C1C1E] border border-[#93032E]/40 rounded-[4px] p-3 flex items-start gap-3 shadow-lg">
      <div className="w-10 h-10 bg-[#93032E] rounded-[4px] flex items-center justify-center shrink-0">
        <span className="text-[22px] font-black text-white italic leading-none">K</span>
      </div>
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-white">Install Kasrat</p>
        <p className="text-[13px] text-[#A1A1A6] mt-0.5">
          Add to your home screen for the best experience.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 bg-[#93032E] text-white text-[13px] font-semibold px-3 py-1.5 rounded-[2px]"
          >
            <Download size={14} strokeWidth={2} />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-[13px] text-[#A1A1A6] font-medium px-2 py-1.5"
          >
            Not now
          </button>
        </div>
      </div>
      <button onClick={handleDismiss} className="text-[#A1A1A6] p-1 shrink-0">
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}
