/**
 * Feature 13: AI Guidance — Suggestions Panel
 *
 * A bottom sheet or inline panel that shows rule-based AI suggestions
 * with "Apply" and "Dismiss" actions.
 *
 * Usage:
 *   <AISuggestionsPanel />
 * Drop into any workout page or the home screen.
 */

import { useCallback, useEffect, useState } from 'react'
import { Sparkles, X, Check, RefreshCw } from 'lucide-react'
import { generateAISuggestions, suggestSubstitution, type AISuggestion } from './aiEngine'

const DISMISSED_KEY = 'kasrat_ai_dismissed'

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]') }
  catch { return [] }
}

function addDismissed(id: string) {
  const current = getDismissed()
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]))
}

interface Props {
  /** Optional: also show substitution suggestion for a specific exercise */
  focusExercise?: string
}

export default function AISuggestionsPanel({ focusExercise }: Props) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [dismissed, setDismissed] = useState<string[]>(getDismissed)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const all = await generateAISuggestions(5)
      if (focusExercise) {
        const sub = suggestSubstitution(focusExercise)
        if (sub && !all.find(s => s.id === sub.id)) all.unshift(sub)
      }
      setSuggestions(all)
    } finally {
      setLoading(false)
    }
  }, [focusExercise])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const visible = suggestions.filter(s => !dismissed.includes(s.id))

  function handleDismiss(id: string) {
    addDismissed(id)
    setDismissed(d => [...d, id])
  }

  if (visible.length === 0 && !loading) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.5} className="text-[#BF5AF2]" />
          <span className="text-[15px] font-semibold text-white">AI Suggestions</span>
          {visible.length > 0 && (
            <span className="text-[11px] font-medium text-white bg-[#BF5AF2] px-1.5 py-0.5 rounded-full">
              {visible.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); load() }}
            className="p-1 text-[#A1A1A6] hover:text-white"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="text-[13px] text-[#A1A1A6]">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="flex items-center gap-2 py-3 justify-center">
              <RefreshCw size={14} strokeWidth={1.5} className="text-[#BF5AF2] animate-spin" />
              <span className="text-[13px] text-[#A1A1A6]">Analysing your performance…</span>
            </div>
          ) : visible.length === 0 ? (
            <p className="text-[13px] text-[#A1A1A6] py-2 text-center">
              No suggestions right now. Keep training!
            </p>
          ) : (
            visible.map(s => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onDismiss={() => handleDismiss(s.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  onDismiss,
}: {
  suggestion: AISuggestion
  onDismiss: () => void
}) {
  const [applied, setApplied] = useState(false)

  const typeColors: Record<AISuggestion['type'], string> = {
    substitution: '#0A84FF',
    load_adjustment: '#FF9F0A',
    volume_change: '#30D158',
  }
  const color = typeColors[suggestion.type]

  return (
    <div
      className="flex items-start justify-between gap-3 p-3 rounded-[4px] border bg-[#1C1C1E]"
      style={{ borderColor: `${color}60` }}
    >
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color }}>
          {suggestion.type.replace(/_/g, ' ')}
        </span>
        <p className="text-[14px] text-[#e4e2e4]">{suggestion.message}</p>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {!applied ? (
          <button
            onClick={() => setApplied(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-[2px] text-[12px] font-semibold"
            style={{ background: `${color}20`, color }}
          >
            <Check size={12} strokeWidth={2} />
            Apply
          </button>
        ) : (
          <span className="text-[12px] text-[#30D158] font-medium px-2 py-1">✓ Noted</span>
        )}
        <button
          onClick={onDismiss}
          className="p-1 text-[#A1A1A6] hover:text-white self-center"
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
