import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { supabase } from '../supabase/client'
import { db } from '../db/database'
import { useSettingsStore } from '../store/settingsStore'

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 2,
            background: i <= current ? '#93032E' : '#2C2C2E',
          }}
        />
      ))}
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputCls = 'w-full bg-[#151515] border border-[#2C2C2E] px-3 py-3 text-[17px] text-white placeholder-[#A1A1A6] focus:border-[#93032E] focus:outline-none'

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1 – Name
  const [name, setName] = useState('')

  // Step 2 – Units
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(settings.strengthUnit as 'kg' | 'lbs' ?? 'kg')
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>(settings.cardioUnit as 'km' | 'mi' ?? 'km')

  // Step 3 – Body & Macros
  const [bodyWeight, setBodyWeight] = useState('')
  const [calories, setCalories] = useState(String(settings.nutritionCaloriesGoal ?? 2000))
  const [protein, setProtein] = useState(String(settings.nutritionProteinGoal ?? 150))
  const [carbs, setCarbs] = useState(String(settings.nutritionCarbsGoal ?? 250))
  const [fats, setFats] = useState(String(settings.nutritionFatsGoal ?? 70))
  const [water, setWater] = useState(String(settings.nutritionWaterGoal ?? 3))

  const TOTAL_STEPS = 3

  function next() { setError(''); setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)) }
  function back() { setError(''); setStep(s => Math.max(s - 1, 0)) }

  async function finish() {
    if (!bodyWeight || isNaN(parseFloat(bodyWeight))) {
      setError('Please enter your body weight')
      return
    }
    setSaving(true)
    setError('')

    try {
      // Update local Dexie settings
      await updateSetting('strengthUnit', weightUnit)
      await updateSetting('cardioUnit', distanceUnit)
      await updateSetting('nutritionCaloriesGoal', Number(calories) || 2000)
      await updateSetting('nutritionProteinGoal', Number(protein) || 150)
      await updateSetting('nutritionCarbsGoal', Number(carbs) || 250)
      await updateSetting('nutritionFatsGoal', Number(fats) || 70)
      await updateSetting('nutritionWaterGoal', Number(water) || 3)

      // Log initial body weight measurement
      await db.body_measurements.add({
        created: new Date().toISOString(),
        bodyWeight: parseFloat(bodyWeight),
      })

      // Save profile to Supabase (if authenticated)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert({
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
      }

      navigate('/', { replace: true })
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#151515] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <StepDots current={step} total={TOTAL_STEPS} />
          <p className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        {/* ── Step 0: Name ── */}
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-[28px] font-semibold text-white leading-tight">What should we call you?</h2>
              <p className="text-[15px] text-[#A1A1A6]">Your name is only stored locally and in your profile.</p>
            </div>

            <div className="flex flex-col gap-2">
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
              <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-4" style={{ borderRadius: '4px' }}>
                <p className="text-[22px] font-semibold text-white">
                  Ready to lift, <span className="text-[#93032E]">{name.trim()}</span>?
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Units ── */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-[28px] font-semibold text-white leading-tight">Your units</h2>
              <p className="text-[15px] text-[#A1A1A6]">You can change these later in Settings.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#A1A1A6]">Weight</label>
                <div className="flex gap-2">
                  {(['kg', 'lbs'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setWeightUnit(u)}
                      className={`flex-1 h-11 font-medium text-[15px] border transition-colors ${
                        weightUnit === u
                          ? 'bg-[#93032E] border-[#93032E] text-white'
                          : 'border-[#2C2C2E] text-[#A1A1A6]'
                      }`}
                      style={{ borderRadius: '2px' }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#A1A1A6]">Distance</label>
                <div className="flex gap-2">
                  {(['km', 'mi'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setDistanceUnit(u)}
                      className={`flex-1 h-11 font-medium text-[15px] border transition-colors ${
                        distanceUnit === u
                          ? 'bg-[#93032E] border-[#93032E] text-white'
                          : 'border-[#2C2C2E] text-[#A1A1A6]'
                      }`}
                      style={{ borderRadius: '2px' }}
                    >
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-[28px] font-semibold text-white leading-tight">Body & nutrition</h2>
              <p className="text-[15px] text-[#A1A1A6]">Set your starting point. Macros are optional.</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Body weight */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#A1A1A6]">
                  Body Weight <span className="text-[#FF453A]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={bodyWeight}
                    onChange={e => setBodyWeight(e.target.value)}
                    placeholder="75"
                    className={`${inputCls} pr-12`}
                    style={{ borderRadius: '2px' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A1A1A6]">{weightUnit}</span>
                </div>
              </div>

              {/* Macro targets */}
              <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col gap-3" style={{ borderRadius: '4px' }}>
                <p className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest">Daily Macro Targets (optional)</p>
                {([
                  ['Calories', calories, setCalories, 'kcal'],
                  ['Protein', protein, setProtein, 'g'],
                  ['Carbs', carbs, setCarbs, 'g'],
                  ['Fats', fats, setFats, 'g'],
                  ['Water', water, setWater, 'L'],
                ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, unit]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A1A1A6]">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p className="text-[#FF453A] text-[13px] font-medium">{error}</p>}

        {/* Navigation buttons */}
        <div className="flex gap-3">
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
              {saving ? 'Saving…' : (
                <>
                  <Check size={18} strokeWidth={1.5} />
                  Let's go
                </>
              )}
            </button>
          )}
        </div>

        {/* Skip onboarding entirely */}
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
