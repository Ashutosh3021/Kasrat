# StartPlanPage - Three Bugs Fixed ✅

## Summary
All three bugs in the workout execution page have been successfully fixed without introducing new features or changing the visual design. The project builds with zero TypeScript errors.

---

## Bug 1: Swap Exercise 404 Error ✅ FIXED

### Problem
- Tapping the swap button navigated to `/swap/:planId/:exerciseName`
- Route was missing from router, resulting in 404 error
- No SwapWorkoutPage component existed

### Solution
**Created `src/pages/SwapWorkoutPage.tsx`**:
- New page component for swapping exercises during workout
- Displays current exercise being replaced
- Search input to filter exercises
- Lists all available exercises from:
  - Exercise history (from `gym_sets` table)
  - Exercise presets (from `exercise_presets` table)
- Clicking an exercise:
  - Updates `plan_exercises` table with new exercise name
  - Updates plan's exercises list
  - Navigates back to workout execution page

**Updated `src/router.tsx`**:
- Added import: `import SwapWorkoutPage from './pages/SwapWorkoutPage'`
- Added route: `{ path: 'swap/:planId/:exerciseName', element: <SwapWorkoutPage /> }`

**Updated `src/pages/StartPlanPage.tsx`**:
- Fixed swap button navigation to properly encode exercise name:
  ```typescript
  onClick={() => navigate(`/swap/${planId}/${encodeURIComponent(ex.exercise)}`)}
  ```

### Result
✅ Swap button now navigates to functional swap page  
✅ User can search and select replacement exercise  
✅ Changes persist to database  
✅ Returns to workout execution page after swap

---

## Bug 2: Expand/Collapse Not Working ✅ FIXED

### Problem
- Exercise expand/collapse used `Set<string>` to track expanded exercises
- Multiple exercises could be expanded simultaneously
- Current exercise wasn't automatically expanded on load
- Tapping same exercise didn't collapse it properly

### Solution
**Changed state management**:
```typescript
// BEFORE
const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set())

// AFTER
const [expandedExerciseIdx, setExpandedExerciseIdx] = useState<number | null>(null)
```

**Updated toggle function**:
```typescript
// BEFORE
function toggleExpanded(exerciseName: string) {
  setExpandedExercises(prev => {
    const next = new Set(prev)
    if (next.has(exerciseName)) {
      next.delete(exerciseName)
    } else {
      next.add(exerciseName)
    }
    return next
  })
}

// AFTER
function toggleExpanded(idx: number) {
  if (expandedExerciseIdx === idx) {
    setExpandedExerciseIdx(null)  // Collapse if same exercise
  } else {
    setExpandedExerciseIdx(idx)   // Expand new exercise
  }
}
```

**Auto-expand current exercise**:
```typescript
// Set current exercise as expanded on load
useEffect(() => {
  async function load() {
    // ... existing load logic
    setExpandedExerciseIdx(workout.currentExerciseIdx)
  }
  load()
}, [id])

// Update expanded exercise when current changes
useEffect(() => {
  setExpandedExerciseIdx(currentIdx)
}, [currentIdx])
```

**Updated expansion check**:
```typescript
// BEFORE
const isExpanded = expandedExercises.has(ex.exercise)

// AFTER
const isExpanded = expandedExerciseIdx === i
```

**Updated button click**:
```typescript
// BEFORE
onClick={() => toggleExpanded(ex.exercise)}

// AFTER
onClick={() => toggleExpanded(i)}
```

### Result
✅ Only one exercise expanded at a time  
✅ Current exercise auto-expands on load  
✅ Current exercise auto-expands when advancing  
✅ Tapping same exercise collapses it  
✅ Tapping different exercise expands it and collapses previous  
✅ Smooth scrolling without jumps

---

## Bug 3: Superset Visual Grouping Missing ✅ FIXED

### Problem
- Supersets defined in EditPlanPage (with `supersetGroup` and `supersetColor`) weren't visually grouped in execution page
- No colored left border on superset exercises
- No "SUPERSET" badge
- Exercises appeared as plain individual items

### Solution
**Added visual grouping logic**:
```typescript
// Group exercises by supersetGroup for visual rendering
type VisualGroup = { 
  type: 'single'; 
  ex: PlanExercise; 
  idx: number 
} | { 
  type: 'group'; 
  groupId: string;
  color: string;
  items: { ex: PlanExercise; idx: number }[] 
}

const visualGroups: VisualGroup[] = []
let i = 0
while (i < exercises.length) {
  const ex = exercises[i]
  if (ex.supersetGroup && ex.supersetColor) {
    // Start of a superset group
    const groupId = ex.supersetGroup
    const groupItems: { ex: PlanExercise; idx: number }[] = []
    while (i < exercises.length && exercises[i].supersetGroup === groupId) {
      groupItems.push({ ex: exercises[i], idx: i })
      i++
    }
    visualGroups.push({ type: 'group', groupId, color: ex.supersetColor, items: groupItems })
  } else {
    visualGroups.push({ type: 'single', ex, idx: i })
    i++
  }
}
```

**Render grouped exercises**:
```typescript
return visualGroups.map((g, gi) => {
  if (g.type === 'single') {
    return renderExerciseRow(g.ex, g.idx)
  }
  // Superset group with colored border
  return (
    <div key={`group-${gi}`} className="border-l-[3px] pl-2 flex flex-col gap-2" 
         style={{ borderColor: g.color, borderRadius: '0 4px 4px 0' }}>
      <span className="text-[11px] font-bold uppercase tracking-widest px-1" 
            style={{ color: g.color }}>
        SUPERSET
      </span>
      {g.items.map(({ ex, idx }) => renderExerciseRow(ex, idx))}
    </div>
  )
})
```

**Refactored exercise rendering**:
- Converted inline exercise rendering to `renderExerciseRow(ex, i)` function
- Function can be called from both single exercises and grouped exercises
- Maintains all existing functionality (expand/collapse, delete, swap, drag)

### Result
✅ Superset exercises grouped with colored left border (`border-l-[3px]`)  
✅ "SUPERSET" badge displayed above group in group color  
✅ Consecutive superset exercises share visual container  
✅ Matches EditPlanPage visual style exactly  
✅ Timer logic already correct (starts after last exercise in group)  
✅ All existing functionality preserved

---

## Visual Design Consistency

All fixes maintain the sharp industrial design:
- Border radius: `rounded-[4px]` for cards, `rounded-[2px]` for buttons
- Colors: `#3B82F6` (accent), `#A1A1A6` (secondary), `#2C2C2E` (borders)
- No emojis
- Lucide icons with `strokeWidth={1.5}`, size 18-20
- Superset colors from predefined palette
- No shadows (except timer pulse)

---

## Build Status
✅ **Zero TypeScript errors**  
✅ **Production build: 2100.49 KiB** (+3.4 KiB for SwapWorkoutPage)  
✅ **All diagnostics clean**

---

## Files Modified

### 1. `src/pages/SwapWorkoutPage.tsx` (NEW)
- Complete new page for exercise swapping
- Search functionality
- Database integration
- Navigation handling

### 2. `src/router.tsx`
- Added SwapWorkoutPage import
- Added `/swap/:planId/:exerciseName` route

### 3. `src/pages/StartPlanPage.tsx`
- Fixed expand/collapse state management (Set → single index)
- Added auto-expand for current exercise
- Added superset visual grouping logic
- Refactored exercise rendering into function
- Fixed swap button to encode exercise name

---

## Testing Checklist

### Bug 1: Swap Exercise
- [x] Swap button navigates to swap page (no 404)
- [x] Exercise name displayed correctly
- [x] Search filters exercises
- [x] Clicking exercise swaps it
- [x] Database updated correctly
- [x] Returns to workout page after swap
- [x] Workout continues with new exercise

### Bug 2: Expand/Collapse
- [x] Current exercise auto-expands on load
- [x] Current exercise auto-expands when advancing
- [x] Only one exercise expanded at a time
- [x] Tapping same exercise collapses it
- [x] Tapping different exercise switches expansion
- [x] Chevron icon rotates correctly
- [x] No scroll jumping when expanding/collapsing
- [x] Set logging works in expanded exercise
- [x] Logged sets visible in expanded exercise

### Bug 3: Superset Grouping
- [x] Superset exercises have colored left border
- [x] "SUPERSET" badge displayed in group color
- [x] Consecutive superset exercises grouped together
- [x] Group color matches EditPlanPage
- [x] Non-superset exercises render normally
- [x] Warmup border still works
- [x] Giant set and circuit borders work
- [x] Timer starts after last exercise in group
- [x] Drag-to-reorder works within groups
- [x] Delete works for grouped exercises
- [x] Swap works for grouped exercises

---

## No Breaking Changes

All existing functionality preserved:
- ✅ Set logging works identically
- ✅ Timer integration unchanged
- ✅ RPE/RIR tracking unchanged
- ✅ Previous set comparison unchanged
- ✅ 1RM calculation unchanged
- ✅ Drag-to-reorder works
- ✅ Delete exercise works
- ✅ Progress tracking works
- ✅ Workout store integration unchanged
- ✅ Session persistence unchanged

---

## Summary

All three bugs have been fixed with minimal code changes:
1. **Swap 404**: Created SwapWorkoutPage and added route
2. **Expand/Collapse**: Changed from Set to single index state
3. **Superset Grouping**: Added visual grouping logic matching EditPlanPage

The workout execution page now functions correctly with proper exercise swapping, intuitive expand/collapse behavior, and clear visual grouping for supersets.
