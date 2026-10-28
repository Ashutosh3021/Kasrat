import { useNavigate } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import Toggle from '../../components/Toggle'
import { SettingsGroup, SettingsRow } from '../../components/SettingsList'
import { useSettingsStore } from '../../store/settingsStore'

const THEMES = [
  { value: 'light', label: 'Light', bg: '#F2EFE6', surface: '#FFFFFF', ink: '#111814', accent: '#B93618' },
  { value: 'dark', label: 'Dark', bg: '#0B100E', surface: '#19211D', ink: '#F2F0E9', accent: '#C63A19' },
  { value: 'pure_black', label: 'Pure black', bg: '#000000', surface: '#0C0F0D', ink: '#F2F0E9', accent: '#C63A19' },
]

export default function AppearanceSettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="page pt-14">
      <TopBar showBack title="Appearance" showSettings={false} />
      <main className="page-main space-y-7 pb-8">
        <header className="pt-1">
          <p className="kicker">Look & feel</p>
          <h1 className="display mt-2 text-[38px] text-ink">Set the room.</h1>
          <p className="mt-2 max-w-[36ch] text-[13px] leading-relaxed text-muted">
            Pick the light you train in. Everything changes immediately, including the charts.
          </p>
        </header>

        <SettingsGroup title="Theme">
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(theme => {
                const active = settings.themeMode === theme.value
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => updateSetting('themeMode', theme.value)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-2 text-left transition-all active:scale-[0.98] ${
                      active
                        ? 'border-accent bg-accent/10 shadow-[0_12px_28px_-20px_rgba(198,58,25,0.9)]'
                        : 'border-line bg-surface hover:border-line-strong'
                    }`}
                  >
                    <span
                      className="block h-[74px] overflow-hidden rounded-xl border"
                      style={{ background: theme.bg, borderColor: theme.surface }}
                      aria-hidden="true"
                    >
                      <span className="mx-2 mt-2 block h-1.5 w-7 rounded-full" style={{ background: theme.ink, opacity: 0.8 }} />
                      <span className="mx-2 mt-2 block h-7 rounded-lg" style={{ background: theme.surface }} />
                      <span className="mx-2 mt-1.5 block h-1.5 w-5 rounded-full" style={{ background: theme.accent }} />
                    </span>
                    <span className={`mt-2 block px-0.5 text-[12px] font-semibold ${active ? 'text-accent-soft' : 'text-ink'}`}>
                      {theme.label}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mono mt-3 px-1 text-[9px] uppercase tracking-[0.12em] text-muted-dim">
              {settings.themeMode === 'light' ? 'Bright, paper-like surfaces' : settings.themeMode === 'pure_black' ? 'OLED-friendly, maximum contrast' : 'Low-light training floor'}
            </p>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Data visualization">
          <SettingsRow
            label="System colors"
            hint="Match chart colors to your device"
            trailing={<Toggle checked={settings.systemColors} onChange={v => updateSetting('systemColors', v)} label="System colors" />}
          />
          <SettingsRow
            label="Curve lines"
            hint="Smooth strokes instead of hard angles"
            trailing={<Toggle checked={settings.curveLines} onChange={v => updateSetting('curveLines', v)} label="Curve lines" />}
          />
        </SettingsGroup>

        <SettingsGroup title="Display elements">
          <SettingsRow
            label="Hide body weight"
            trailing={<Toggle checked={settings.hideWeight} onChange={v => updateSetting('hideWeight', v)} label="Hide body weight" />}
          />
          <SettingsRow
            label="Hide categories"
            trailing={<Toggle checked={settings.hideCategories} onChange={v => updateSetting('hideCategories', v)} label="Hide categories" />}
          />
          <SettingsRow
            label="Hide global progress"
            trailing={<Toggle checked={settings.hideGlobalProgress} onChange={v => updateSetting('hideGlobalProgress', v)} label="Hide global progress" />}
          />
        </SettingsGroup>

        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Done
        </button>
      </main>
    </div>
  )
}
