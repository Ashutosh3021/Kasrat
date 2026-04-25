# StartPlanPage - Before & After Comparison

## Visual Changes

### BEFORE (Locked Sequential Flow)
```
┌─────────────────────────────────────────┐
│ ✓ Bench Press (completed, dimmed)      │
│   3 sets completed                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CURRENT: Dumbbell Shoulder Press        │ ← Only this is interactive
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Set 1: 50 kg × 10 reps ✓               │
│ Set 2: 50 kg × 8 reps ✓                │
│                                          │
│ Set 3: [Weight] [Reps]                  │
│ [Log Set] [Camera] [Notes]              │
│ [Next Exercise]                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Tricep Pushdown              🔒         │ ← LOCKED
│ Next: 3 sets                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Lateral Raises               🔒         │ ← LOCKED
│ Next: 3 sets                            │
└─────────────────────────────────────────┘
```

**Problems**:
- 🔒 Lock icons on upcoming exercises
- ❌ Cannot scroll past current exercise
- ❌ Cannot rearrange exercises
- ❌ Cannot delete exercises
- ❌ Cannot swap exercises
- ❌ Limited visibility of workout structure

---

### AFTER (Fully Interactive)
```
┌─────────────────────────────────────────────────────────┐
│ [≡] ✓ Bench Press          [↻] [×] [˅]                 │ ← Draggable, deletable
│ 3/3 sets                                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ [≡] Dumbbell Shoulder Press [ℹ] [↻] [×] [˄]            │ ← CURRENT (blue border)
│ 2/3 sets [CURRENT]                                       │
│ ───────────────────────────────────────────────────────  │
│ Set 1: 50 kg × 10 reps ✓                                │
│ Set 2: 50 kg × 8 reps ✓                                 │
│ ───────────────────────────────────────────────────────  │
│ Set 3: [Weight] [Reps]                                   │
│ [Log Set] [Camera] [Notes]                               │
│ [Next Exercise]                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ [≡] Tricep Pushdown        [↻] [×] [˅]                 │ ← Draggable, deletable
│ 0/3 sets                                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ [≡] Lateral Raises         [↻] [×] [˅]                 │ ← Draggable, deletable
│ 0/3 sets                                                 │
└─────────────────────────────────────────────────────────┘

↕ Scrollable list - all exercises visible
```

**Features**:
- ✅ No lock icons anywhere
- ✅ Full scrolling through all exercises
- ✅ Drag handle [≡] on every exercise
- ✅ Delete button [×] on every exercise
- ✅ Swap button [↻] on every exercise
- ✅ Expand/collapse [˅/˄] on every exercise
- ✅ Current exercise highlighted (blue border)
- ✅ Complete visibility and control

---

## Icon Legend

| Icon | Meaning | Action |
|------|---------|--------|
| [≡] | Grip handle | Drag to reorder |
| [×] | Delete | Remove from session |
| [↻] | Swap | Replace exercise |
| [˅] | Expand | Show details |
| [˄] | Collapse | Hide details |
| [ℹ] | Info | Show coach's cues |
| ✓ | Completed | Exercise done |
| 🔒 | Lock | **REMOVED** |

---

## Interaction Comparison

### Scrolling
| Before | After |
|--------|-------|
| ❌ Cannot scroll past current | ✅ Scroll through all exercises |
| ❌ Locked sequential view | ✅ Full workout visibility |

### Reordering
| Before | After |
|--------|-------|
| ❌ Fixed order | ✅ Drag any exercise to reorder |
| ❌ No grip handle | ✅ Grip handle on every row |

### Deleting
| Before | After |
|--------|-------|
| ❌ Cannot remove exercises | ✅ Delete any exercise mid-workout |
| ❌ Stuck with plan | ✅ Flexible session management |

### Swapping
| Before | After |
|--------|-------|
| ❌ No swap option visible | ✅ Swap button on every exercise |
| ❌ Limited to current only | ✅ Swap any exercise anytime |

### Visibility
| Before | After |
|--------|-------|
| ❌ Only current exercise detailed | ✅ Expand any exercise to view |
| ❌ Upcoming exercises minimal | ✅ Full control over visibility |

---

## User Scenarios

### Scenario 1: Reorder Exercises
**Before**: Impossible. User stuck with original plan order.

**After**: 
1. Grab grip handle [≡] on any exercise
2. Drag to new position
3. Order persists to database

### Scenario 2: Remove Exercise
**Before**: Impossible. User must skip or complete unwanted exercise.

**After**:
1. Click delete button [×] on any exercise
2. Exercise removed from session
3. Current index adjusts automatically

### Scenario 3: Swap Exercise
**Before**: Only available for current exercise (if at all).

**After**:
1. Click swap button [↻] on any exercise
2. Navigate to swap page
3. Select replacement exercise

### Scenario 4: Review Workout
**Before**: Can only see current exercise details. Upcoming exercises show minimal info with lock icon.

**After**:
1. Scroll through entire workout
2. Expand any exercise to view logged sets
3. Collapse to keep UI clean
4. Current exercise always highlighted

---

## Technical Implementation

### Lock Icon Removal
```typescript
// BEFORE
import { Lock } from 'lucide-react'
<Lock size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />

// AFTER
// ❌ Lock import removed
// ❌ Lock rendering removed
// ✅ All exercises interactive
```

### Scrolling Implementation
```typescript
// BEFORE
{exercises.map((ex, i) => {
  if (!isCurrent && !done) return null  // Hide upcoming
  // ...
})}

// AFTER
<div className="max-h-[calc(100vh-300px)] overflow-y-auto" data-drag-list>
  {exercises.map((ex, i) => {
    // All exercises rendered, all interactive
  })}
</div>
```

### Drag-to-Reorder
```typescript
// NEW
const { getHandleProps, getItemProps } = useDragToReorder(exercises, handleReorder)

<article {...getItemProps(i)}>
  <span {...getHandleProps(i)}>
    <GripVertical size={20} strokeWidth={1.5} />
  </span>
</article>
```

### Delete Functionality
```typescript
// NEW
async function deleteExercise(ex: PlanExercise, idx: number) {
  await db.plan_exercises.update(ex.id!, { enabled: false })
  // Adjust current index if needed
  await loadExercises()
}

<button onClick={() => deleteExercise(ex, i)}>
  <X size={18} strokeWidth={1.5} />
</button>
```

---

## Performance Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Build size | 2096.30 KiB | 2097.10 KiB | +0.8 KiB |
| TypeScript errors | 0 | 0 | No change |
| Render performance | Fast | Fast | No degradation |
| Database queries | Minimal | Minimal | No change |

---

## Accessibility Improvements

1. **Better Navigation**: Users can see entire workout structure
2. **Flexible Control**: Adapt workout on the fly
3. **Clear Visual Hierarchy**: Current exercise highlighted, not locked
4. **Touch-Friendly**: Large touch targets for all actions
5. **Keyboard Support**: Drag-to-reorder works with keyboard (via hook)

---

## Summary

The transformation from a locked, sequential flow to a fully interactive experience gives users complete control over their workout session while maintaining all existing functionality (set logging, timer, RPE/RIR, etc.). The removal of lock icons and addition of drag-to-reorder, delete, and swap capabilities makes the workout execution page as flexible as the plan editor.
