# New Features Implementation Plan

## Overview

This document outlines the implementation plan for 15 new features in **Kasrat**, a mobile-first Progressive Web App (PWA) for fitness and progress tracking. The app already uses React + Vite, Zustand for state management, Supabase for backend, and Dexie for offline IndexedDB storage. The core purpose is to enable users to log workouts, track body metrics, and receive adaptive guidance toward their fitness goals (muscle gain, fat loss, or maintenance).

## Architecture & Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + Vite 7 + TypeScript | Component-based UI, fast HMR, mobile-first PWA |
| **State Management** | Zustand 5 | Lightweight global store for UI state, settings, and user session |
| **PWA** | vite-plugin-pwa + Workbox | Offline caching, installable, push notifications optional |
| **Backend** | Supabase (PostgreSQL) | Auth (Supabase Auth), REST/Realtime API, row-level security |
| **Offline DB** | Dexie.js | IndexedDB wrapper for structured offline storage |
| **Charts** | Recharts 3 | Data visualization for progress metrics |
| **UI Lib** | TailwindCSS 4 + lucide-react | Responsive styling, icons |

### Data Flow

```
UI Component ──dispatch──► Zustand Store ──sync──► Dexie (IndexedDB)
                                              │
                                              └──online──► Supabase
                                              │
                                              └──offline──► Queue (sync_queue table)
```

### State Management Structure

- **authStore.ts**: User session, profile data
- **settingsStore**: User preferences, goals, units
- **workoutStore**: Active workout, sets being logged
- **sync hook**: Handles online/offline sync with retry logic

### Real-time Considerations

- Supabase Realtime broadcasts for live plan updates across devices
- `onAuthStateChange` triggers data sync on login/logout
- `sync_queue` table processes pending writes when connectivity returns

---

## Feature Implementation Details

### 1. Goal‑Specific Targeting

**Objective**  
Adjust training volume, intensity, and exercise selection based on user-selected goal (muscle gain, fat loss, or maintenance).

**User Story**  
As a user, I want the app to automatically adjust my training parameters based on my primary goal (bulk, cut, or maintain), so I don't have to manually recalculate set/rep schemes.

**Data Model Changes**  
```sql
-- New column on profiles table
ALTER TABLE profiles ADD COLUMN goal_preference TEXT CHECK (goal_preference IN ('bulk', 'cut', 'maintain'));

-- New table for goal-specific templates
CREATE TABLE goal_templates (
  id UUID PRIMARY KEY,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('bulk', 'cut', 'maintain')),
  template_data JSONB NOT NULL, -- { volume_multiplier, intensity_factor, recommended_exercises[] }
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Business Logic / Algorithms**  
- Volume Multiplier: `bulk = 1.15`, `cut = 0.85`, `maintain = 1.0`
- Intensity Factor: `bulk = 0.75` (RPE ceiling), `cut = 0.85`, `maintain = 0.80`
- Exercise Selection: Filter presets by goal tags (e.g., `compound_priority` for bulk, `circuit_focus` for cut)

**UI/UX Considerations**  
- Onboarding wizard step: "What is your primary goal?"
- Settings page: Goal preference selector with explanation tooltips
- Plan generation UI: Shows applied goal modifiers before save

**Edge Cases & Constraints**  
- If goal changes mid-cycle: Apply new templates to future sessions only
- Missing goal preference: Default to 'maintain' with neutral modifiers

---

### 2. Adaptive Program Adjustments

**Objective**  
Automatically modify sets, reps, or progression based on user adherence and progress trends.

**User Story**  
As a user, I want the app to suggest program changes when I'm overreaching or plateauing, so I can continue progressing without guesswork.

**Data Model Changes**  
```sql
ALTER TABLE plans ADD COLUMN adaptive_config JSONB DEFAULT '{"auto_adjust": false, "adjustment_sensitivity": "medium"}';

CREATE TABLE progression_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  plan_id UUID REFERENCES plans(id),
  metric_name TEXT NOT NULL, -- 'volume', 'intensity', 'adherence'
  old_value NUMERIC,
  new_value NUMERIC,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Business Logic / Algorithms**  
- Adherence Score = (completed_sessions / scheduled_sessions) * 100 over 2 weeks
- Plateau Detection: Linear regression on volume trend; slope < 0.05 kg/session for 4+ sessions
- Adjustment Rules:
  - If adherence < 70%: Reduce volume by 10%
  - If plateau detected: Add 2.5-5% load increment
  - If consistent overload: Deload every 4th week

**UI/UX Considerations**  
- Toast notification: "Program adjusted: +5% load on squats"
- History panel: Shows progression log entries
- Toggle: "Enable adaptive adjustments" per plan

**Edge Cases & Constraints**  
- Insufficient data: Require 6+ sessions before applying adjustments
- Manual overrides: User-set weights take precedence over auto-adjust

---

### 3. Comprehensive Weight Monitoring

**Objective**  
Record daily body weight to track variations alongside training data, synced across devices.

**User Story**  
As a user, I want to log my daily weight each morning, so I can see how my training and nutrition affect my body composition.

**Data Model Changes**  
Already exists in `body_measurements` table with `body_weight` column. No schema changes needed.

**Business Logic / Algorithms**  
- Auto-prompt: Show weight input widget on first app open each day
- Validation: Reject values < 30kg or > 300kg (configurable per user)

**UI/UX Considerations**  
- Today widget on HomePage with quick weight entry
- Integration with onboarding flow for initial weight

**Edge Cases & Constraints**  
- Missing data for a day: Allow backfill
- Outliers: Flag values > 3kg different from trend for confirmation

---

### 4. Weight Averaging Functionality

**Objective**  
Calculate weekly weight averages to smooth out daily fluctuations.

**User Story**  
As a user, I want to see my weekly average weight instead of daily spikes, so I can understand true progress.

**Data Model Changes**  
```sql
-- Materialized view refreshed daily
CREATE MATERIALIZED VIEW weekly_weight_averages AS
SELECT user_id, date_trunc('week', created) as week_start, AVG(body_weight) as avg_weight
FROM body_measurements GROUP BY user_id, week_start;

-- Local cache in day_status
ALTER TABLE day_status ADD COLUMN weekly_avg_weight NUMERIC;
```

**Business Logic / Algorithms**  
- Weekly Average = Mean of daily weights from Monday to Sunday
- Trend Indicator = Current week avg - Previous week avg
- Smoothing: Apply 3-day moving average for spike detection

**UI/UX Considerations**  
- Chart overlay: Smoothed trend line vs raw data points
- Progress ring: "Weekly trend: -0.3kg" with direction indicator

**Edge Cases & Constraints**  
- No data for a week: Show "--" placeholder, prompt for backfill
- Partial week: Average available days, mark as "partial"

---

### 5. Training Phase Templates

**Objective**  
Replace existing static templates with a wizard-based program generator that determines goal based on body composition and allows emphasis selection.

**User Story**  
As a user, I want a wizard to ask about my body fat percentage and weight so it can recommend whether to bulk, cut, or recomp, and let me choose which muscle groups to emphasize.

**Data Model Changes**  
```sql
-- New table for wizard-generated templates
CREATE TABLE wizard_templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL, -- 'Custom Bulk - Arms Focus'
  goal_type TEXT CHECK (goal_type IN ('bulk', 'cut', 'recomp')),
  emphasis TEXT CHECK (emphasis IN ('balanced', 'arms', 'chest', 'back', 'legs')),
  sessions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track wizard responses for future personalization
CREATE TABLE wizard_responses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  question_key TEXT, -- 'fat_percentage', 'body_weight', 'emphasis_preference'
  response_value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Business Logic / Algorithms**  
- Goal Determination: If fat% > 25% → suggest cut; if fat% < 12% and weight low → suggest bulk; else recompute
- Emphasis Mapping:
  - `arms`: Increase volume on bicep/tricep exercises by 20%
  - `chest`: Add 1-2 extra chest exercises per week
  - `back`: Prioritize vertical pulls and rows
  - `legs`: Increase leg volume, reduce upper body focus
- Volume Distribution: Apply emphasis multipliers while keeping routines intact (same exercise selection as base template)
- Auto-exercise: Select from `exercise_presets` filtered by equipment availability

**UI/UX Considerations**  
- Multi-step wizard modal:
  1. "What's your approximate body fat percentage?"
  2. "Current body weight?"
  3. "Which areas do you want to emphasize?" (balanced, arms, chest, back, legs)
- Goal recommendation: Show "We recommend a cut plan" based on inputs
- Emphasis preview: Show adjusted volume per muscle group before creating

**Edge Cases & Constraints**  
- User unsure of fat%: Provide visual guide (skin fold charts, comparison images)
- Under 25 with conflicting goals: Allow manual override
- Equipment limitations: Gracefully reduce variety, suggest alternatives

---

### 6. Estimation Tools

**Objective**  
Assist users in estimating effort, load, or reps when exact data isn't available.

**User Story**  
As a user, I want to estimate my 1RM or reps in reserve when I'm unsure of exact numbers, so I can still log accurate data.

**Data Model Changes**  
```sql
-- Extend gym_sets for estimated values
ALTER TABLE gym_sets ADD COLUMN estimated BOOLEAN DEFAULT false;
ALTER TABLE gym_sets ADD COLUMN estimation_method TEXT; -- '1rm_brzycki', 'rir_projection'
```

**Business Logic / Algorithms**  
- 1RM Estimation (Brzycki): `1RM = weight * 36 / (37 - reps)` (reps ≤ 36)
- RPE Projection: If RPE 8 for 8 reps, estimate 1 more rep at same weight
- Load Estimation: Based on rep range percentages (e.g., 75% for 8-10 reps)

**UI/UX Considerations**  
- Toggle: "Estimate 1RM" in set logging
- Quick calc button: Opens modal for rep/RPE projections
- Visual badge: "Estimated" on chart entries

**Edge Cases & Constraints**  
- Very high reps (>15): Use Epley formula instead
- Conflicting RPE/actual reps: Prioritize user input

---

### 7. Manual Entry Features

**Objective**  
Allow full manual logging of sets, reps, weight, and custom exercises.

**User Story**  
As a user, I want to add exercises not in the preset library and log custom sets, so I can track any workout I do.

**Data Model Changes**  
Already supported via `custom_exercises` and `gym_sets` tables. No new schema required.

**Business Logic / Algorithms**  
- Custom exercise creation: Store in `custom_exercises` with user metadata
- Muscle mapping: Allow user to assign primary/secondary muscles
- Auto-suggestion: Show recent custom exercises first

**UI/UX Considerations**  
- Floating action button on QuickWorkout: "Add Custom Exercise"
- Inline editing: Add sets directly from workout screen
- Recent exercises: Quick-add from history list

**Edge Cases & Constraints**  
- Duplicate custom exercises: Merge or warn user
- Missing muscle data: Default to 'Other' category

---

### 8. Progress Visualization

**Objective**  
Charts and graphs plotting volume, intensity, 1RM, body weight, and other metrics against time and targets.

**User Story**  
As a user, I want to see visual trends of my training and body metrics, so I can understand my progress at a glance.

**Data Model Changes**  
No schema changes; use existing `gym_sets` and `body_measurements` data.

**Business Logic / Algorithms**  
- Volume = Sum(weight × reps) per session
- Intensity = Total volume / body weight (if logged)
- Estimated 1RM progression: Track personal bests with interpolation
- Goal lines: Show target weight range based on goal timeline

**UI/UX Considerations**  
- Tabbed chart interface: Volume, Intensity, 1RM, Weight
- Interactive tooltips: Show exact values on hover/tap
- Line per routine (Push, Pull, Legs) for individual session volume

**Edge Cases & Constraints**  
- No historical data: Show empty state with "Log your first workout"
- Large date ranges: Aggregate by week/month automatically

---

### 9. Cross‑Platform Syncing

**Objective**  
Ensure training data, plans, and measurements stay consistent across web and mobile.

**User Story**  
As a user, I want my logged sets on my phone to appear instantly on my laptop, so I can review my progress anywhere.

**Data Model Changes**  
Already implemented via `useSync.ts` hook and `sync_queue` table. Enhancements:

```sql
ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE sync_queue ADD COLUMN last_error TEXT;
```

**Business Logic / Algorithms**  
- Sync Strategy: Immediate push when online, queue when offline
- Conflict Resolution: Last-write-wins with timestamp comparison
- Batch Processing: Group updates by table to reduce API calls

**UI/UX Considerations**  
- Sync status indicator: Cloud icon with spinner/check/error states
- Manual refresh: Pull-to-refresh triggers sync
- Offline banner: "Offline mode - data will sync when online"

**Edge Cases & Constraints**  
- Device clock skew: Use server timestamps for ordering
- Deleted items: Soft-delete with tombstone for sync

---

### 10. Smartphone Compatibility

**Objective**  
Optimized mobile-first PWA for fast logging during workouts, while traveling, or at the gym.

**User Story**  
As a user, I want the app to work seamlessly on my phone with large buttons and quick logging, so I can focus on my workout.

**Data Model Changes**  
None required.

**Business Logic / Algorithms**  
- PWA Installation: Prompt after 2 sessions
- Keyboard shortcuts: Number pad for reps/weight on mobile
- Large touch targets: 48px minimum for interactive elements

**UI/UX Considerations**  
- Quick-add floating button always visible during workouts
- One-handed operation: Bottom-aligned controls
- Dark mode: Auto-switch based on device preference

**Edge Cases & Constraints**  
- Small screens: Horizontal scrolling for exercise selector
- Slow network: Cache-first for exercise presets

---

### 11. Subjective Feedback Integration

**Objective**  
Log energy, mood, and soreness after sessions to help adjust future workouts.

**User Story**  
As a user, I want to rate my energy and soreness after each workout, so the app can suggest easier or harder sessions.

**Data Model Changes**  
```sql
ALTER TABLE gym_sets ADD COLUMN energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10);
ALTER TABLE gym_sets ADD COLUMN mood_level INTEGER CHECK (mood_level BETWEEN 1 AND 10);
ALTER TABLE gym_sets ADD COLUMN soreness_level INTEGER CHECK (soreness_level BETWEEN 1 AND 10);

-- Or separate table for session-level feedback
CREATE TABLE session_feedback (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  session_date DATE, -- groups sets by workout
  energy INTEGER CHECK (energy BETWEEN 1 AND 10),
  mood INTEGER CHECK (mood BETWEEN 1 AND 10),
  soreness INTEGER CHECK (soreness BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Business Logic / Algorithms**  
- Session Feedback Prompt: Show after last set logged
- Recovery Score = (energy + mood + (10 - soreness)) / 3
- Auto-adjust: If recovery < 4 for 3 consecutive sessions, suggest deload

**UI/UX Considerations**  
- Slider controls: 1-10 rating for each metric
- Emoji indicators: Visual cues for quick input
- Summary chart: Overlay subjective scores on performance trends

**Edge Cases & Constraints**  
- Skipped feedback: Allow completion without rating
- Inconsistent ratings: Smooth with rolling average

---

### 12. Individualised Program Generation

**Objective**  
Generate personalized weekly training plans based on wizard-derived goals, equipment availability, experience level, and muscle emphasis preferences.

**User Story**  
As a user, I want the app to create a custom plan based on my body composition, available equipment, and which muscles I want to prioritize.

**Data Model Changes**  
```sql
ALTER TABLE profiles ADD COLUMN experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE profiles ADD COLUMN available_equipment JSONB; -- ['dumbbell', 'barbell', 'machine']
ALTER TABLE profiles ADD COLUMN muscle_emphasis TEXT CHECK (muscle_emphasis IN ('balanced', 'arms', 'chest', 'back', 'legs'));

-- This uses the wizard_templates table from Feature 5
```

**Business Logic / Algorithms**  
- Base Template Selection: Choose PPL or Upper/Lower based on available days
- Goal Application: Apply volume/intensity modifiers from Feature 1 (bulk: +15%, cut: -15%)
- Emphasis Adjustment:
  - `arms`: +20% volume on arm exercises, -10% on others
  - `chest`: Add extra chest exercise to Push days
  - `back`: Add extra pulling movement to Pull days
  - `legs`: Move squats to start of session, add leg exercise to Upper days
- Experience Scaling:
  - Beginner: 3 sets × 8-12 reps, 90s rest
  - Intermediate: 3-4 sets × 6-10 reps, 60-90s rest
  - Advanced: 4-5 sets × 4-8 reps, 30-60s rest
- Equipment Adaptation: Swap barbell for dumbbell/machine as needed

**UI/UX Considerations**  
- Wizard integration: Step 1 (body stats) → Step 2 (emphasis) → Step 3 (plan preview)
- Weekly calendar preview showing adjusted volume per day
- "Regenerate with different emphasis" button

**Edge Cases & Constraints**  
- Limited equipment: Fallback to bodyweight variants
- No preference set: Default to balanced distribution
- Conflict with existing plan: Prompt to archive or overwrite

---

### 13. Artificial Intelligence Guidance

**Objective**  
Suggest exercise substitutions, load adjustments, or volume changes based on performance trends.

**User Story**  
As a user, I want AI-powered suggestions when I'm stuck or my gym doesn't have the right equipment, so I can keep progressing.

**Data Model Changes**  
```sql
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  suggestion_type TEXT, -- 'substitution', 'load_adjustment', 'volume_change'
  context JSONB, -- exercise, recent performance data
  suggestion JSONB, -- recommended action
  accepted BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE gym_sets ADD COLUMN ai_suggested BOOLEAN DEFAULT false;
```

**Business Logic / Algorithms**  
- Substitution Engine (Rule-based):
  - If barbell not available → dumbbell alternative
  - If exercise performance dropped → suggest deload set
- Load Adjustment:
  - If 3 consecutive sessions at same weight with RPE > 8 → -5% recommendation
  - If 5 consecutive sessions with RPE < 7 → +5% recommendation
- Trigger Conditions:
  - Volume plateau detected
  - Missed sessions > 2 consecutive
  - Equipment mismatch flag from user

**UI/UX Considerations**  
- Suggestions panel: Bottom sheet with "Apply" / "Dismiss" buttons
- Inline suggestion: Show alternative exercise during logging
- Notification: "AI suggests trying incline dumbbell press instead of barbell"

**Edge Cases & Constraints**  
- Conflicting suggestions: Prioritize load adjustments over substitutions
- User rejection: Learn from dismissed suggestions

---

### 14. Training‑Specific Precision Levels

**Objective**  
Support flexible logging (e.g., "just log main lifts" vs. full session tracking) for busy days.

**User Story**  
As a user, I want to quickly log only my major compound lifts on busy days, so I can track progress without full session detail.

**Data Model Changes**  
```sql
ALTER TABLE settings ADD COLUMN logging_precision TEXT DEFAULT 'full' CHECK (logging_precision IN ('minimal', 'standard', 'full'));

ALTER TABLE gym_sets ADD COLUMN priority_level TEXT CHECK (priority_level IN ('primary', 'secondary'));
```

**Business Logic / Algorithms**  
- Minimal Mode: Only log exercises tagged as 'primary' (squat, deadlift, bench, etc.)
- Standard Mode: Log primary + secondary exercises
- Full Mode: Log all sets including warmups and accessories
- Toggle: Available in quick-workout header

**UI/UX Considerations**  
- Precision selector: Toggle in workout toolbar
- Visual distinction: Primary sets highlighted in list
- Resume full mode: "Complete session" button adds remaining exercises

**Edge Cases & Constraints**  
- Switching mid-workout: Preserve logged sets, only affect new entries
- Templates with mixed priorities: All exercises available, user chooses level

---

### 15. Track Volume Of Each Session Individually

**Objective**  
For each routine (e.g., "Push"), plot individual session volumes separately.

**User Story**  
As a user, I want to see how each Push session's volume compares to previous Push sessions, so I can ensure progressive overload.

**Data Model Changes**  
```sql
-- Volume computed on-the-fly; no permanent storage needed
-- Optional caching in daily_aggregates (for performance)
CREATE TABLE daily_aggregates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  date DATE,
  routine_name TEXT, -- 'Push', 'Pull', 'Legs'
  total_volume NUMERIC,
  set_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date, routine_name)
);
```

**Business Logic / Algorithms**  
- Volume Calculation: Σ(sets) weight × reps (exclude warmups if flagged)
- Routine Association: Group sets by plan name or manual session label
- Trend Analysis: Moving average per routine for progression check

**UI/UX Considerations**  
- Multi-line chart: Separate colored lines for each routine
- Session cards: Show volume per session in history
- Comparison: "This Push volume: 5,200kg vs last: 5,050kg (+3%)"

**Edge Cases & Constraints**  
- Missing routine name: Group under "General" sessions
- Incomplete sessions: Show partial volume with indicator

---

## Cross-Cutting Concerns

### Syncing Strategy
- **Online**: Immediate write-through to Supabase with local cache update
- **Offline**: Write to Dexie, enqueue in `sync_queue` with exponential backoff retry
- **Conflict Resolution**: Server timestamp trumps client; last-write-wins

### Offline Support
- **Cache**: Exercise presets, templates, and user settings cached permanently
- **Queue**: All mutations stored in `sync_queue` table
- **Background Sync**: Service worker processes queue when connectivity detected

### Error Handling
- **Network Failures**: Retry with exponential backoff (1s → 2s → 4s → max 60s)
- **Validation Errors**: Inline feedback on form fields
- **Sync Conflicts**: Show merge suggestion UI

### Performance Optimization
- **IndexedDB Indexes**: Compound indexes on `(date, routine_name)` for fast queries
- **Chart Rendering**: Virtual scrolling for long time-series, memoization for derived data
- **Batch Operations**: Group Supabase upserts by table, max 100 rows per request

---

## Implementation Phases

| Phase | Features | Rationale |
|-------|----------|-----------|
| **Phase 1** | 3, 7, 14, 15 (Weight Monitoring, Manual Entry, Precision Levels, Volume Tracking) | Core logging foundation; minimal schema changes |
| **Phase 2** | 1, 4, 6, 11 (Goal Targeting, Weight Averaging, Estimation, Subjective Feedback) | Enhance logging with goal awareness and user assistance |
| **Phase 3** | 5, 8, 12 (Templates, Visualization, Individualised Programs) | Add program structure and insights |
| **Phase 4** | 2, 13 (Adaptive Adjustments, AI Guidance) | Intelligent adaptation based on logged data |
| **Phase 5** | 9, 10 (Cross-Platform Syncing, Smartphone Compatibility) | Already partially implemented; polish and test |

### Milestone Timeline
- **Week 1-2**: Phase 1 complete (core logging enhancements)
- **Week 3-4**: Phase 2 complete (goal-aware features)
- **Week 5-6**: Phase 3 complete (templates and charts)
- **Week 7-8**: Phase 4 complete (adaptive and AI features)
- **Week 9**: Phase 5 final polish and testing

---

## Testing & Validation

### Unit Tests
- **Volume Calculation**: Test various set combinations against expected totals
- **1RM Estimation**: Verify Brzycki/Epley formulas against known values
- **Progression Logic**: Test plateau detection and adjustment triggers

### Integration Tests
- **Sync Flow**: Simulate offline → online transition, verify queue processing
- **Template Generation**: Validate plan output matches goal parameters
- **Goal Targeting**: Confirm volume/intensity modifiers applied correctly

### User Acceptance Tests
- **Workout Logging**: Complete session on mobile with weight, sets, subjective feedback
- **Chart Accuracy**: Verify weekly averages and trend lines match manual calculations
- **Adaptive Feedback**: Trigger plateau scenario, confirm adjustment suggestion appears
- **Cross-Device Sync**: Log on phone, verify instant appearance on web

### Test Data Commands
```bash
# Run all tests
npm run test

# Run specific feature tests
npm run test -- --feature=volume-tracking
npm run test -- --feature=weight-averaging
```

---

*Document generated for Kasrat fitness tracking application. Last updated: June 2026.*