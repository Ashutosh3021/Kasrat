import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../supabase/client'

const inputCls =
  'w-full bg-[#1C1C1E] border border-[#2C2C2E] px-3 py-3 text-[17px] text-white ' +
  'placeholder-[#A1A1A6] focus:border-[#93032E] focus:outline-none'

function PasswordInput({
  id, label, value, onChange, autoComplete,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-[#A1A1A6]">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          className={`${inputCls} pr-10`}
          style={{ borderRadius: '2px' }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1A6] hover:text-white"
          aria-label={show ? 'Hide' : 'Show'}
        >
          {show ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  )
}

export default function SecuritySettingsPage() {
  const navigate = useNavigate()

  // ── Change email ──────────────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    if (!newEmail.trim()) { setEmailMsg({ type: 'err', text: 'Enter a new email address.' }); return }
    if (newEmail.trim() !== confirmEmail.trim()) {
      setEmailMsg({ type: 'err', text: 'Email addresses do not match.' }); return
    }
    setEmailLoading(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailLoading(false)
    if (error) {
      setEmailMsg({ type: 'err', text: error.message })
    } else {
      setEmailMsg({ type: 'ok', text: 'Confirmation sent to your new email. Click the link to complete the change.' })
      setNewEmail('')
      setConfirmEmail('')
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (newPw.length < 6) { setPwMsg({ type: 'err', text: 'Password must be at least 6 characters.' }); return }
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: 'Passwords do not match.' }); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    if (error) {
      setPwMsg({ type: 'err', text: error.message })
    } else {
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
      setNewPw('')
      setConfirmPw('')
    }
  }

  return (
    <div className="min-h-screen bg-[#151515] pb-8">
      <header className="sticky top-0 w-full z-50 bg-[#151515]/90 backdrop-blur-md flex items-center px-3 h-14 border-b border-[#2C2C2E]">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 -ml-2 flex items-center justify-center text-white hover:bg-[#1C1C1E]"
          style={{ borderRadius: '2px' }}
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-medium text-white absolute left-1/2 -translate-x-1/2">Security</h1>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto flex flex-col gap-8">

        {/* ── Change Email ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-1">Change Email</h2>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-4 flex flex-col gap-4" style={{ borderRadius: '4px' }}>
            <p className="text-[13px] text-[#A1A1A6]">
              A confirmation link will be sent to your new email address. Your email won't change until you click it.
            </p>
            <form onSubmit={handleUpdateEmail} className="flex flex-col gap-3" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-email" className="text-[13px] font-medium text-[#A1A1A6]">New Email</label>
                <input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  className={inputCls}
                  style={{ borderRadius: '2px' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm-email" className="text-[13px] font-medium text-[#A1A1A6]">Confirm New Email</label>
                <input
                  id="confirm-email"
                  type="email"
                  autoComplete="email"
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  placeholder="new@example.com"
                  className={inputCls}
                  style={{ borderRadius: '2px' }}
                />
              </div>
              {emailMsg && (
                <p className={`text-[13px] font-medium ${emailMsg.type === 'ok' ? 'text-emerald-400' : 'text-[#FF453A]'}`}>
                  {emailMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full h-12 bg-[#93032E] text-white font-medium text-[15px] disabled:opacity-60 transition-opacity"
                style={{ borderRadius: '2px' }}
              >
                {emailLoading ? 'Sending…' : 'Update Email'}
              </button>
            </form>
          </div>
        </section>

        {/* ── Change Password ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-1">Change Password</h2>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-4 flex flex-col gap-4" style={{ borderRadius: '4px' }}>
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3" noValidate>
              <PasswordInput
                id="new-pw"
                label="New Password"
                value={newPw}
                onChange={setNewPw}
                autoComplete="new-password"
              />
              <PasswordInput
                id="confirm-pw"
                label="Confirm New Password"
                value={confirmPw}
                onChange={setConfirmPw}
                autoComplete="new-password"
              />
              {pwMsg && (
                <p className={`text-[13px] font-medium ${pwMsg.type === 'ok' ? 'text-emerald-400' : 'text-[#FF453A]'}`}>
                  {pwMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full h-12 bg-[#93032E] text-white font-medium text-[15px] disabled:opacity-60 transition-opacity"
                style={{ borderRadius: '2px' }}
              >
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </section>

      </main>
    </div>
  )
}
