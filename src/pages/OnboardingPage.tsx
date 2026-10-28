import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { supabase } from '../supabase/client'
import { useSettingsStore } from '../store/settingsStore'
import { addBodyMeasurement } from '../supabase/writeSync'

const TOTAL_STEPS = 3

const STEP_META = [
  { number: '01', label: 'Profile', detail: 'Who you are' },
  { number: '02', label: 'Units', detail: 'How you measure' },
  { number: '03', label: 'Baseline', detail: 'Where you start' },
]

function ProgressBar({ step }: { step: number }) {
  return (
    <div
      className="grid grid-cols-3 gap-1.5"
      role="progressbar"
      aria-label="Onboarding progress"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={step + 1}
    >
      {STEP_META.map((meta, i) => (
        <span
          key={meta.number}
          className={`h-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-accent' : 'bg-line'}`}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { updateSetting } = useSettingsStore()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Guard: if profile already exists, redirect to home
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/login', { replace: true }); return }
      const { data } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (data) navigate('/', { replace: true })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Step 1 â€“ Name
  const [name, setName] = useState('')

  // Step 2 â€“ Units
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km')

  // Step 3 â€“ Body & Macros
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

      // 2. Log initial body weight measurement locally + sync
      await addBodyMeasurement({
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
    <div className="min-h-[100dvh] bg-ground lg:grid lg:grid-cols-[0.86fr_1.14fr]">
      <aside className="hero-panel relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <span className="text-[21px] font-black leading-none tracking-[-0.1em] text-on-accent">K</span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[17px] font-extrabold tracking-[-0.05em] text-ink">KASRAT</span>
            <span className="mono mt-1 text-[8px] uppercase tracking-[0.24em] text-muted">Training log</span>
          </span>
        </div>

        <div className="relative z-10 -mt-8">
          <p className="kicker text-accent-soft">Set the baseline</p>
          <p className="display mt-5 max-w-[8ch] text-[clamp(3.8rem,5.6vw,6rem)] text-ink">
            Three steps. Then the work.
          </p>

          <ol className="mt-9 space-y-4">
            {STEP_META.map((meta, i) => {
              const done = i < step
              const active = i === step
              return (
                <li key={meta.number} className="flex items-center gap-4">
                  <span
                    className={`mono flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[10px] tracking-[0.08em] ${
                      done
                        ? 'border-accent bg-accent text-on-accent'
                        : active
                          ? 'border-accent-soft text-accent-soft'
                          : 'border-line-strong text-muted-dim'
                    }`}
                  >
                    {done ? <Check size={13} strokeWidth={2.2} /> : meta.number}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[13px] font-semibold ${active || done ? 'text-ink' : 'text-muted'}`}>
                      {meta.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">{meta.detail}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <p className="mono relative z-10 text-[9px] uppercase tracking-[0.18em] text-muted-dim">
          Change any of it later in settings
        </p>
      </aside>

      <main className="flex min-h-[100dvh] flex-col px-4 py-6 sm:px-6 lg:justify-center lg:px-10 lg:py-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                <span className="text-[18px] font-black leading-none tracking-[-0.1em] text-on-accent">K</span>
              </span>
              <span className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">KASRAT</span>
            </div>
            <p className="mono text-[9px] uppercase tracking-[0.18em] text-muted max-lg:ml-auto">
              Setup {step + 1} / {TOTAL_STEPS}
            </p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="text-[11px] font-medium text-muted-dim transition-colors hover:text-ink"
            >
              Skip
            </button>
          </div>

          <ProgressBar step={step} />

          <div key={step} className="card mt-4 animate-rise p-6">
            {step === 0 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="kicker">Profile</p>
                  <h1 className="display mt-2 text-[32px] text-ink">What should we call you?</h1>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    Just a first name. It shows up on your home screen and nowhere else.
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="onboarding-name" className="field-label">First name</label>
                  <input
                    id="onboarding-name"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && next()}
                    placeholder="e.g. Alex"
                    className="input"
                  />
                </div>

                {name.trim() && (
                  <div className="rounded-2xl border border-accent/25 bg-accent/[0.07] p-4">
                    <p className="kicker text-accent-soft">Preview</p>
                    <p className="mt-2 text-[22px] font-bold leading-tight tracking-[-0.04em] text-ink">
                      Ready to lift, <span className="text-accent-soft">{name.trim()}</span>?
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="kicker">Units</p>
                  <h1 className="display mt-2 text-[32px] text-ink">How do you measure?</h1>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    Pick the numbers you already think in. Everything converts cleanly if you switch later.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="field-label">Weight</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['kg', 'lbs'] as const).map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setWeightUnit(u)}
                          aria-pressed={weightUnit === u}
                          className={`flex h-[64px] flex-col items-start justify-center rounded-2xl border px-4 text-left transition-colors ${
                            weightUnit === u
                              ? 'border-accent bg-accent text-on-accent'
                              : 'border-line bg-surface-high text-ink hover:border-line-strong'
                          }`}
                        >
                          <span className="text-[17px] font-bold uppercase">{u}</span>
                          <span className={`text-[10px] ${weightUnit === u ? 'text-on-accent/70' : 'text-muted'}`}>
                            {u === 'kg' ? 'Kilograms' : 'Pounds'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="field-label">Distance</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['km', 'mi'] as const).map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setDistanceUnit(u)}
                          aria-pressed={distanceUnit === u}
                          className={`flex h-[64px] flex-col items-start justify-center rounded-2xl border px-4 text-left transition-colors ${
                            distanceUnit === u
                              ? 'border-accent bg-accent text-on-accent'
                              : 'border-line bg-surface-high text-ink hover:border-line-strong'
                          }`}
                        >
                          <span className="text-[17px] font-bold uppercase">{u}</span>
                          <span className={`text-[10px] ${distanceUnit === u ? 'text-on-accent/70' : 'text-muted'}`}>
                            {u === 'km' ? 'Kilometres' : 'Miles'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="kicker">Baseline</p>
                  <h1 className="display mt-2 text-[32px] text-ink">Where are you starting?</h1>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    One body weight to anchor the trend. Macros are optional and editable.
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="onboarding-weight" className="field-label">
                    Body weight <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="onboarding-weight"
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      value={bodyWeight}
                      onChange={e => setBodyWeight(e.target.value)}
                      placeholder="75"
                      className="input pr-12"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-muted">
                      {weightUnit}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-surface-raised p-3.5">
                  <p className="field-label">Daily macro targets · optional</p>
                  <div className="mt-2 divide-y divide-line">
                    {([
                      ['Calories', calories, setCalories, 'kcal'],
                      ['Protein', protein, setProtein, 'g'],
                      ['Carbs', carbs, setCarbs, 'g'],
                      ['Fats', fats, setFats, 'g'],
                      ['Water', water, setWater, 'L'],
                    ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, unit]) => (
                      <div key={label} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                        <label className="w-20 shrink-0 text-[13px] font-medium text-ink-soft">{label}</label>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={val}
                            onChange={e => setter(e.target.value)}
                            aria-label={label}
                            className="input min-h-10 py-2 pr-12 text-right text-[13px]"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                            {unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12px] font-medium leading-snug text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-2.5">
              {step > 0 && (
                <button type="button" onClick={back} className="btn btn-secondary">
                  <ChevronLeft size={16} strokeWidth={1.8} />
                  Back
                </button>
              )}

              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={step === 0 && !name.trim()}
                  className="btn btn-primary flex-1"
                >
                  Continue
                  <ChevronRight size={16} strokeWidth={1.8} />
                </button>
              ) : (
                <button type="button" onClick={finish} disabled={saving} className="btn btn-primary flex-1">
                  {saving ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2} />
                      Start training
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <p className="mono mt-6 text-center text-[9px] uppercase tracking-[0.16em] text-muted-dim">
            Your data stays yours · Change everything later
          </p>
        </div>
      </main>
    </div>
  )
}
