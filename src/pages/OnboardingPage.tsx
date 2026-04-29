import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { supabase } from '../supabase/client'
import { db } from '../db/database'
import { useSettingsStore } from '../store/settingsStore'
import { pullRemoteData } from '../hooks/useSync'

const TOTAL_STEPS = 3

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const pct = Math.round(((step + 1) / TOTAL_STEPS) * 100)
  return (
    <div className="w-full h-1 bg-[#2C2C2E] overflow-hidden" style={{ borderRadius: '2px' }}>
      <div
        className="h-full transition-all duration-300"
        style={{ width: `${pct}%`, background: '#BE1755', borderRadius: '2px' }}
      />
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputCls =
  'w-full bg-[#2C2C2E] border border-[#2C2C2E] px-3 py-3 text-[17px] text-white ' +
  'placeholder-[#A1A1A6] focus:border-[#93032E] focus:outline-none'

const unitBtn = (active: boolean) =>
  `flex-1 h-11 font-medium text-[15px] border transition-colors ${
    active ? 'bg-[#93032E] border-[#93032E] text-white' : 'bg-[#2C2C2E] border-[#2C2C2E] text-[#A1A1A6]'
  }`

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { updateSetting } = useSettingsStore()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1 – Name
  const [name, setName] = useState('')

  // Step 2 – Units
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km')

  // Step 3 – Body & Macros
  const [bodyWeight, setBodyWeight] = useState('')
  const [calories, setCalories] = useState('2000')
  const [protein, setProtein] = useState('150')
  const [carbs, setCarbs] = useState('250')
  const [fats, setFats] = useState('70')
  const [water, setWater] = useState('3')

  function next() { setError(''); setStep(s => s + 1) }
  function back() { setError(''); setStep(s => s - 1) }

  async function finish() {
    if (!bodyWeight || isNaN(parseFloat(bodyWeight))) {
      setError('Please enter your body weight')
      return
    }
    setSaving(true)
    setError('')

    try {
      // 1. Update local Dexie settings immediately (offline-first)
      await updateSetting('strengthUnit', weightUnit)
      await updateSetting('cardioUnit', distanceUnit)
      await updateSetting('nutritionCaloriesGoal', Number(calories) || 2000)
      await updateSetting('nutritionProteinGoal', Number(protein) || 150)
      await updateSetting('nutritionCarbsGoal', Number(carbs) || 250)
      await updateSetting('nutritionFatsGoal', Number(fats) || 70)
      await updateSetting('nutritionWaterGoal', Number(water) || 3)

      // 2. Log initial body weight measurement locally
      await db.body_measurements.add({
        created: new Date().toISOString(),
        bodyWeight: parseFloat(bodyWeight),
      })

      // 3. Save profile to Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: user.id,
          name: name.trim() || 'Lifter',
          units: { weight: weightUnit, distance: distanceUnit },
          macro_targets: {
            calories: Number(calories) || null,
            protein: Number(protein) || null,
            carbs: Number(carbs) || null,
            fats: Number(fats) || null,
            water: Number(water) || null,
          },
          supplements: [],
        })
        if (profileErr) throw profileErr

        // 4. Pull remote data (likely empty for new user, but ensures consistency)
        if (navigator.onLine) {
          await pullRemoteData(user.id)
        }
      }

      navigate('/', { replace: true })
    } catch (err) {
      console.error('[onboarding] finish error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#151515] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Progress bar + step label */}
        <div className="flex flex-col gap-2">
          <ProgressBar step={step} />
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <p className="text-[13px] font-medium text-[#E05C85]">
              {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-4 flex flex-col gap-6" style={{ borderRadius: '4px' }}>

          {/* ── Step 0: Name ── */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-[24px] font-semibold text-white leading-tight">What should we call you?</h2>
                <p className="text-[15px] text-[#A1A1A6]">Stored in your profile.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#A1A1A6]">First Name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && name.trim() && next()}
                  placeholder="e.g. Alex"
                  className={inputCls}
                  style={{ borderRadius: '2px' }}
                />
              </div>

              {name.trim() && (
                <div className="bg-[#151515] border border-[#2C2C2E] px-4 py-3" style={{ borderRadius: '4px' }}>
                  <p className="text-[20px] font-semibold text-white">
                    Ready to lift, <span style={{ color: '#93032E' }}>{name.trim()}</span>?
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: Units ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-[24px] font-semibold text-white leading-tight">Default Units</h2>
                <p className="text-[15px] text-[#A1A1A6]">You can change these later in Settings.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#A1A1A6]">Weight</label>
                  <div className="flex gap-2">
                    {(['kg', 'lbs'] as const).map(u => (
                      <button key={u} onClick={() => setWeightUnit(u)}
                        className={unitBtn(weightUnit === u)} style={{ borderRadius: '2px' }}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#A1A1A6]">Distance</label>
                  <div className="flex gap-2">
                    {(['km', 'mi'] as const).map(u => (
                      <button key={u} onClick={() => setDistanceUnit(u)}
                        className={unitBtn(distanceUnit === u)} style={{ borderRadius: '2px' }}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Body & Macros ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-[24px] font-semibold text-white leading-tight">Body & Nutrition</h2>
                <p className="text-[15px] text-[#A1A1A6]">Set your baseline. Macros are optional.</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Body weight — mandatory */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[#A1A1A6]">
                    Body Weight <span className="text-[#FF453A]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      value={bodyWeight}
                      onChange={e => setBodyWeight(e.target.value)}
                      placeholder="75"
                      className={`${inputCls} pr-12`}
                      style={{ borderRadius: '2px' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A1A1A6]">
                      {weightUnit}
                    </span>
                  </div>
                </div>

                {/* Macro targets */}
                <div className="flex flex-col gap-1">
                  <p className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest mb-1">
                    Daily Macro Targets (optional)
                  </p>
                  {([
                    ['Calories', calories, setCalories, 'kcal'],
                    ['Protein',  protein,  setProtein,  'g'],
                    ['Carbs',    carbs,    setCarbs,    'g'],
                    ['Fats',     fats,     setFats,     'g'],
                    ['Water',    water,    setWater,    'L'],
                  ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, unit]) => (
                    <div key={label} className="flex items-center gap-3 py-1.5 border-b border-[#2C2C2E] last:border-0">
                      <span className="text-[15px] text-white w-20 shrink-0">{label}</span>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={val}
                          onChange={e => setter(e.target.value)}
                          className="w-full bg-[#151515] border border-[#2C2C2E] px-3 py-2 text-[15px] text-white text-right pr-10 focus:border-[#93032E] focus:outline-none"
                          style={{ borderRadius: '2px' }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A1A1A6]">
                          {unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-[#FF453A] text-[13px] font-medium">{error}</p>}

          {/* Navigation */}
          <div className="flex gap-3 pt-1">
            {step > 0 && (
              <button
                onClick={back}
                className="h-12 px-4 border border-[#2C2C2E] text-[#A1A1A6] font-medium text-[15px] flex items-center gap-1 hover:border-[#93032E]/40 transition-colors"
                style={{ borderRadius: '2px' }}
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
                Back
              </button>
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={next}
                disabled={step === 0 && !name.trim()}
                className="flex-1 h-12 bg-[#93032E] text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                style={{ borderRadius: '2px' }}
              >
                Next
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                className="flex-1 h-12 bg-[#93032E] text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                style={{ borderRadius: '2px' }}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} strokeWidth={1.5} />
                    Let's go
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <button
          onClick={() => navigate('/', { replace: true })}
          className="text-[13px] text-[#424754] hover:text-[#A1A1A6] transition-colors text-center"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
