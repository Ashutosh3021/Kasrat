/**
 * Kasrat — New Features Index
 * ===========================
 * Central export hub for all 15 new features.
 * Import from here to keep imports tidy across the app.
 *
 * Nothing in this file modifies existing code.
 */

// ── Feature 1: Goal-Specific Targeting ──────────────────────────────────────
export { useGoalTargetingStore, applyGoalModifiers, GOAL_MODIFIERS } from './goalTargeting/goalTargetingStore'
export type { GoalType, GoalModifiers } from './goalTargeting/goalTargetingStore'
export { default as GoalSelectorWidget } from './goalTargeting/GoalSelectorWidget'

// ── Feature 2: Adaptive Program Adjustments ──────────────────────────────────
export { detectPlateau, calculateAdherence, getSessionVolumeHistory, getAdjustmentRecommendation } from './adaptiveProgram/adaptiveEngine'
export type { AdjustmentRecommendation, AdjustmentType } from './adaptiveProgram/adaptiveEngine'
export { default as AdaptiveBanner } from './adaptiveProgram/AdaptiveBanner'

// ── Feature 3: Comprehensive Weight Monitoring ────────────────────────────────
export { default as WeightEntryWidget } from './weightMonitoring/WeightEntryWidget'

// ── Feature 4: Weight Averaging Functionality ─────────────────────────────────
export { computeWeightTrend } from './weightAveraging/weightAveraging'
export type { WeeklyWeightAverage, WeightTrendResult } from './weightAveraging/weightAveraging'
export { default as WeightTrendChart } from './weightAveraging/WeightTrendChart'

// ── Feature 5: Training Phase Templates ──────────────────────────────────────
export { generateTemplate, recommendGoal } from './trainingPhaseTemplates/templateGenerator'
export type { WizardInputs, WizardGoalType, WizardEmphasis, WizardTemplate } from './trainingPhaseTemplates/wizardTypes'
export { default as TrainingPhaseWizard } from './trainingPhaseTemplates/TrainingPhaseWizard'

// ── Feature 6: Estimation Tools ───────────────────────────────────────────────
export { estimate1RM, projectRepsFromRPE, estimateLoadForRepRange, computeEstimates } from './estimationTools/estimationUtils'
export type { EstimationResult } from './estimationTools/estimationUtils'
export { default as EstimationModal } from './estimationTools/EstimationModal'

// ── Feature 7: Manual Entry Features ─────────────────────────────────────────
export { addCustomExercise, getRecentCustomExercises } from './manualEntry/customExerciseUtils'
export type { CustomExerciseInput } from './manualEntry/customExerciseUtils'
export { default as AddCustomExerciseSheet } from './manualEntry/AddCustomExerciseSheet'

// ── Feature 8: Progress Visualization ────────────────────────────────────────
export { computeSessionVolumes, computeRoutineVolumeSeries, computePersonalBests, computeWeeklyRoutineComparison } from './progressVisualization/volumeUtils'
export type { SessionVolumePoint, RoutineVolumeSeries, PersonalBestPoint, RoutineComparison } from './progressVisualization/volumeUtils'
export { default as ProgressDashboard } from './progressVisualization/ProgressDashboard'

// ── Feature 9: Cross-Platform Syncing ────────────────────────────────────────
export { backoffDelay, getFailedQueueItems, incrementRetryCount, resolveConflict, enqueueSoftDelete, getSyncStatus } from './crossPlatformSync/syncEnhancements'
export type { SyncStatus } from './crossPlatformSync/syncEnhancements'
export { default as SyncStatusBadge } from './crossPlatformSync/SyncStatusBadge'

// ── Feature 10: Smartphone Compatibility ─────────────────────────────────────
export { registerInstallPromptListener, canShowInstallPrompt, triggerInstallPrompt, dismissInstallPrompt, isStandalonePWA, isMobileDevice, incrementSessionCount } from './smartphoneCompat/pwaUtils'
export { default as PWAInstallBanner } from './smartphoneCompat/PWAInstallBanner'

// ── Feature 11: Subjective Feedback Integration ───────────────────────────────
export { saveFeedback, getFeedbackForDate, getRecentFeedback, computeRecoveryScore, shouldSuggestDeload } from './subjectiveFeedback/subjectiveFeedbackUtils'
export type { SessionFeedback, RecoveryScore } from './subjectiveFeedback/subjectiveFeedbackUtils'
export { default as SessionFeedbackSheet } from './subjectiveFeedback/SessionFeedbackSheet'

// ── Feature 12: Individualised Program Generation ─────────────────────────────
export { generateIndividualisedPlan, saveGeneratedPlan } from './individualisedProgram/programGenerator'
export type { ProgramInputs, GeneratedPlan, ExperienceLevel, EquipmentType } from './individualisedProgram/programGenerator'
export { default as ProgramGeneratorPage } from './individualisedProgram/ProgramGeneratorPage'

// ── Feature 13: AI Guidance ───────────────────────────────────────────────────
export { generateAISuggestions, suggestSubstitution } from './aiGuidance/aiEngine'
export type { AISuggestion, SuggestionType } from './aiGuidance/aiEngine'
export { default as AISuggestionsPanel } from './aiGuidance/AISuggestionsPanel'

// ── Feature 14: Training-Specific Precision Levels ────────────────────────────
export { usePrecisionStore } from './precisionLevels/precisionStore'
export type { PrecisionMode } from './precisionLevels/precisionStore'
export { default as PrecisionToggle } from './precisionLevels/PrecisionToggle'

// ── Feature 15: Track Volume Per Session ──────────────────────────────────────
export { default as SessionVolumeCard } from './sessionVolume/SessionVolumeCard'
