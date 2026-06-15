/**
 * Workout Feature Toolbar
 * =======================
 * A composable toolbar row that bundles all new workout-time features:
 *   - Feature 14: Precision level toggle (Min / Std / Full)
 *   - Feature 6:  Estimation calculator modal trigger
 *   - Feature 7:  Add custom exercise sheet trigger
 *   - Feature 11: Session feedback sheet trigger (shown after finishing)
 *   - Feature 2:  Adaptive suggestion banner
 *   - Feature 13: AI suggestions panel
 *
 * Drop this component into any workout page header WITHOUT modifying
 * the existing page code — just render it above or below existing JSX.
 *
 * Usage:
 *   <WorkoutFeatureToolbar
 *     showFeedback={isFinished}
 *     sessionDate="2026-06-15"
 *     onCustomExerciseCreated={(name) => handleAdd(name)}
 *   />
 */

import { useState } from 'react'
import { Calculator, Plus, Sparkles } from 'lucide-react'
import PrecisionToggle from '../precisionLevels/PrecisionToggle'
import EstimationModal from '../estimationTools/EstimationModal'
import AddCustomExerciseSheet from '../manualEntry/AddCustomExerciseSheet'
import SessionFeedbackSheet from '../subjectiveFeedback/SessionFeedbackSheet'
import AdaptiveBanner from '../adaptiveProgram/AdaptiveBanner'
import AISuggestionsPanel from '../aiGuidance/AISuggestionsPanel'

interface WorkoutFeatureToolbarProps {
  /** When true, renders the post-workout feedback prompt */
  showFeedback?: boolean
  /** YYYY-MM-DD of the current session, required when showFeedback = true */
  sessionDate?: string
  /** Called when user creates a custom exercise */
  onCustomExerciseCreated?: (name: string) => void
  /** Show AI + adaptive panels (default false to keep toolbar compact) */
  showAI?: boolean
}

export default function WorkoutFeatureToolbar({
  showFeedback = false,
  sessionDate,
  onCustomExerciseCreated,
  showAI = false,
}: WorkoutFeatureToolbarProps) {
  const [estimationOpen, setEstimationOpen] = useState(false)
  const [customExOpen, setCustomExOpen] = useState(false)
  const [feedbackDismissed, setFeedbackDismissed] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      {/* ── Toolbar row ── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#2C2C2E] bg-[#151515]/80 backdrop-blur-sm">
        {/* Feature 14: Precision toggle */}
        <PrecisionToggle />

        <div className="flex items-center gap-1">
          {/* Feature 6: Estimation calculator */}
          <button
            onClick={() => setEstimationOpen(true)}
            title="1RM Calculator"
            aria-label="Open estimation calculator"
            className="p-2 rounded-[2px] text-[#A1A1A6] hover:text-[#93032E] hover:bg-[#93032E]/10 transition-colors"
          >
            <Calculator size={18} strokeWidth={1.5} />
          </button>

          {/* Feature 7: Custom exercise */}
          <button
            onClick={() => setCustomExOpen(true)}
            title="Add Custom Exercise"
            aria-label="Add custom exercise"
            className="p-2 rounded-[2px] text-[#A1A1A6] hover:text-[#93032E] hover:bg-[#93032E]/10 transition-colors"
          >
            <Plus size={18} strokeWidth={1.5} />
          </button>

          {/* Feature 13: AI toggle */}
          {showAI && (
            <button
              onClick={() => setAiExpanded(e => !e)}
              title="AI Suggestions"
              aria-label="Toggle AI suggestions"
              className={`p-2 rounded-[2px] transition-colors ${
                aiExpanded
                  ? 'text-[#BF5AF2] bg-[#BF5AF2]/10'
                  : 'text-[#A1A1A6] hover:text-[#BF5AF2] hover:bg-[#BF5AF2]/10'
              }`}
            >
              <Sparkles size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Feature 2: Adaptive adjustment banner */}
      <div className="px-3 pt-2">
        <AdaptiveBanner />
      </div>

      {/* Feature 13: AI suggestions panel (expanded) */}
      {showAI && aiExpanded && (
        <div className="px-3 pt-1 pb-2">
          <AISuggestionsPanel />
        </div>
      )}

      {/* ── Modals ── */}

      {/* Feature 6: Estimation calculator */}
      {estimationOpen && (
        <EstimationModal onClose={() => setEstimationOpen(false)} />
      )}

      {/* Feature 7: Custom exercise sheet */}
      {customExOpen && (
        <AddCustomExerciseSheet
          onClose={() => setCustomExOpen(false)}
          onCreated={(name) => {
            setCustomExOpen(false)
            onCustomExerciseCreated?.(name)
          }}
        />
      )}

      {/* Feature 11: Post-workout feedback sheet */}
      {showFeedback && !feedbackDismissed && (
        <SessionFeedbackSheet
          sessionDate={sessionDate ?? today}
          onClose={() => setFeedbackDismissed(true)}
        />
      )}
    </>
  )
}
