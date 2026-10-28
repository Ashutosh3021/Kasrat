import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, LogOut, RefreshCw, Sparkles } from 'lucide-react'
import TopBar from '../components/TopBar'
import { SettingsGroup, SettingsRow } from '../components/SettingsList'
import Toggle from '../components/Toggle'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'
import { useSyncStore } from '../store/syncStore'
import WhatsNewDialog from '../overlays/WhatsNewDialog'
import { restoreDefaultExercises } from '../db/defaults'
import { supabase } from '../supabase/client'
import { clearLocalUserData } from '../supabase/sync'
import { useAuthStore } from '../store/authStore'
import { processSyncQueue, pullRemoteData } from '../hooks/useSync'
import GoalSelectorWidget from '../features/goalTargeting/GoalSelectorWidget'
import SyncStatusBadge from '../features/crossPlatformSync/SyncStatusBadge'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()
  const { openWhatsNew, whatsNewDialogOpen, closeWhatsNew } = useUIStore()
  const { user, setSession } = useAuthStore()
  const { isSyncing, setIsSyncing, lastSyncedAt, setHasPulled } = useSyncStore()
  const [restoreMessage, setRestoreMessage] = useState('')
  const [syncMessage, setSyncMessage] = useState('')

  async function handleRestoreExercises() {
    await restoreDefaultExercises()
    setRestoreMessage('Default exercises restored')
    setTimeout(() => setRestoreMessage(''), 3000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    await clearLocalUserData()
    setSession(null)
    useSyncStore.getState().resetSync()
    navigate('/login', { replace: true })
  }

  async function handleSyncNow() {
    if (!user || isSyncing) return
    setIsSyncing(true)
    setSyncMessage('')
    try {
      setHasPulled(false)
      await processSyncQueue(user.id)
      await pullRemoteData(user.id)
      setSyncMessage('Data synced successfully')
    } catch (err) {
      console.error('[settings] sync failed:', err)
      setSyncMessage('Sync failed — check your connection')
    } finally {
      setIsSyncing(false)
      setTimeout(() => setSyncMessage(''), 3000)
    }
  }

  const lastSyncedText = lastSyncedAt
    ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Never synced'

  const themeLabel =
    settings.themeMode === 'light' ? 'Light' : settings.themeMode === 'pure_black' ? 'Pure black' : 'Dark'

  const supplementCount = (() => {
    try {
      return JSON.parse(settings.supplementsList ?? '[]').length
    } catch {
      return 0
    }
  })()

  return (
    <div className="page pt-14">
      <TopBar showSettings={false} />
      <main className="page-main space-y-7 pb-8">
        <header className="flex items-end justify-between gap-4 pt-2">
          <div>
            <p className="kicker">Account & preferences</p>
            <h1 className="display-hero mt-2 text-ink">Settings</h1>
          </div>
          <span className="chip">v1.2.36</span>
        </header>

        <SettingsGroup title="Appearance">
          <SettingsRow label="Theme" value={themeLabel} onClick={() => navigate('/settings/appearance')} />
          <SettingsRow
            label="System colors"
            hint="Use platform-tuned chart colors"
            trailing={<Toggle checked={settings.systemColors} onChange={v => updateSetting('systemColors', v)} label="System colors" />}
          />
          <SettingsRow
            label="Curve lines"
            hint="Smooth chart strokes"
            trailing={<Toggle checked={settings.curveLines} onChange={v => updateSetting('curveLines', v)} label="Curve lines" />}
          />
          <SettingsRow
            label="Hide categories"
            hint="Remove category labels from exercises"
            trailing={<Toggle checked={settings.hideCategories} onChange={v => updateSetting('hideCategories', v)} label="Hide categories" />}
          />
        </SettingsGroup>

        <SettingsGroup title="Training">
          <div className="p-4">
            <GoalSelectorWidget compact />
          </div>
        </SettingsGroup>

        <SettingsGroup title="Workout">
          <SettingsRow label="Readiness check" onClick={() => navigate('/readiness')} />
          <SettingsRow
            label="Rest timers"
            hint="Start the timer after a set"
            trailing={<Toggle checked={settings.restTimers} onChange={v => updateSetting('restTimers', v)} label="Rest timers" />}
          />
          <SettingsRow
            label="Vibrate on alarm"
            hint="Haptic alert when the timer ends"
            trailing={<Toggle checked={settings.vibrate} onChange={v => updateSetting('vibrate', v)} label="Vibrate on alarm" />}
          />
          <SettingsRow label="Timer settings" value={`${Math.floor(settings.timerDuration / 60)} min default`} onClick={() => navigate('/settings/timer')} />
        </SettingsGroup>

        <SettingsGroup title="Data & format">
          <SettingsRow label="Units" value={`${settings.strengthUnit} / ${settings.cardioUnit}`} onClick={() => navigate('/settings/data')} />
          <SettingsRow label="Date & time" value={settings.longDateFormat} onClick={() => navigate('/settings/format')} />
          <SettingsRow label="Body measurements" onClick={() => navigate('/body-measurements')} />
          <SettingsRow
            label="Default max sets"
            trailing={
              <span className="flex items-center gap-3 rounded-[10px] border border-line bg-surface-high px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => updateSetting('maxSets', Math.max(1, settings.maxSets - 1))}
                  className="text-accent-soft transition-opacity hover:opacity-70"
                  aria-label="Decrease default max sets"
                >
                  <Minus size={14} strokeWidth={2} />
                </button>
                <span className="w-4 text-center text-[13px] font-semibold text-ink tnum">{settings.maxSets}</span>
                <button
                  type="button"
                  onClick={() => updateSetting('maxSets', settings.maxSets + 1)}
                  className="text-accent-soft transition-opacity hover:opacity-70"
                  aria-label="Increase default max sets"
                >
                  <Plus size={14} strokeWidth={2} />
                </button>
              </span>
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Nutrition">
          <SettingsRow
            label="Macro targets"
            value={`${settings.nutritionCaloriesGoal ?? 2000} kcal`}
            onClick={() => navigate('/settings/data')}
          />
          <SettingsRow
            label="Supplements"
            value={`${supplementCount} added`}
            onClick={() => navigate('/settings/data')}
          />
        </SettingsGroup>

        <SettingsGroup title="Plans & navigation">
          <SettingsRow
            label="Show reorder handles"
            trailing={<Toggle checked={settings.showReorderHandles} onChange={v => updateSetting('showReorderHandles', v)} label="Show reorder handles" />}
          />
          <SettingsRow
            label="Show plan counts"
            trailing={<Toggle checked={settings.showPlanCounts} onChange={v => updateSetting('showPlanCounts', v)} label="Show plan counts" />}
          />
          <SettingsRow
            label="Hidden tabs"
            value={
              settings.hiddenTabs.split(',').filter(Boolean).length > 0 ? (
                <span className="flex flex-wrap justify-end gap-1">
                  {settings.hiddenTabs.split(',').filter(Boolean).map(t => (
                    <span key={t} className="chip">{t}</span>
                  ))}
                </span>
              ) : (
                'None'
              )
            }
            onClick={() => navigate('/settings/tabs')}
          />
        </SettingsGroup>

        <SettingsGroup title="Exercise library">
          <SettingsRow label="Restore default exercises" onClick={handleRestoreExercises} />
        </SettingsGroup>
        {restoreMessage && (
          <p className="chip chip-success ml-1 w-fit">{restoreMessage}</p>
        )}

        {user && (
          <SettingsGroup title="Cloud & account">
            <SettingsRow label="Cloud sync" hint={lastSyncedText} trailing={<SyncStatusBadge />} />
            <SettingsRow
              label="Sync now"
              hint="Push local changes, then pull remote"
              onClick={handleSyncNow}
              disabled={isSyncing}
              trailing={
                <RefreshCw size={16} strokeWidth={1.7} className={`text-muted ${isSyncing ? 'animate-spin' : ''}`} />
              }
            />
            <SettingsRow label="Security" onClick={() => navigate('/settings/security')} />
            <SettingsRow label={user.email ?? 'Signed in'} hint="Signed in" />
            <SettingsRow
              label="Log out"
              onClick={handleLogout}
              danger
              trailing={<LogOut size={16} strokeWidth={1.7} className="text-danger" />}
            />
          </SettingsGroup>
        )}

        {syncMessage && (
          <p className="chip chip-accent ml-1 w-fit">{syncMessage}</p>
        )}

        <SettingsGroup title="About">
          <SettingsRow
            label="What's new"
            hint="Release notes and recent updates"
            onClick={openWhatsNew}
            trailing={<Sparkles size={15} strokeWidth={1.7} className="text-accent-soft" />}
          />
          <SettingsRow label="About Kasrat" value="1.2.36" onClick={() => navigate('/about')} />
        </SettingsGroup>

        <p className="mono pb-4 text-center text-[9px] uppercase tracking-[0.18em] text-muted-dim">
          Built for showing up
        </p>
      </main>

      {whatsNewDialogOpen && <WhatsNewDialog onClose={closeWhatsNew} />}
    </div>
  )
}
