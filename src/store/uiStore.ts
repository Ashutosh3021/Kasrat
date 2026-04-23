import { create } from 'zustand'

interface UIState {
  newPlanOpen: boolean
  exerciseModalOpen: boolean
  exerciseModalPlanId: number | null
  deleteConfirmOpen: boolean
  deleteConfirmTarget: { type: string; id: number; name: string } | null
  daySelectorOpen: boolean
  daySelectorPlanId: number | null
  graphsFilterOpen: boolean
  whatsNewDialogOpen: boolean

  openNewPlan: () => void
  closeNewPlan: () => void
  openExerciseModal: (planId: number) => void
  closeExerciseModal: () => void
  openDeleteConfirm: (target: { type: string; id: number; name: string }) => void
  closeDeleteConfirm: () => void
  openDaySelector: (planId: number) => void
  closeDaySelector: () => void
  openGraphsFilter: () => void
  closeGraphsFilter: () => void
  openWhatsNew: () => void
  closeWhatsNew: () => void
}

export const useUIStore = create<UIState>((set) => ({
  newPlanOpen: false,
  exerciseModalOpen: false,
  exerciseModalPlanId: null,
  deleteConfirmOpen: false,
  deleteConfirmTarget: null,
  daySelectorOpen: false,
  daySelectorPlanId: null,
  graphsFilterOpen: false,
  whatsNewDialogOpen: false,

  openNewPlan: () => set({ newPlanOpen: true }),
  closeNewPlan: () => set({ newPlanOpen: false }),
  openExerciseModal: (planId) => set({ exerciseModalOpen: true, exerciseModalPlanId: planId }),
  closeExerciseModal: () => set({ exerciseModalOpen: false, exerciseModalPlanId: null }),
  openDeleteConfirm: (target) => set({ deleteConfirmOpen: true, deleteConfirmTarget: target }),
  closeDeleteConfirm: () => set({ deleteConfirmOpen: false, deleteConfirmTarget: null }),
  openDaySelector: (planId) => set({ daySelectorOpen: true, daySelectorPlanId: planId }),
  closeDaySelector: () => set({ daySelectorOpen: false, daySelectorPlanId: null }),
  openGraphsFilter: () => set({ graphsFilterOpen: true }),
  closeGraphsFilter: () => set({ graphsFilterOpen: false }),
  openWhatsNew: () => set({ whatsNewDialogOpen: true }),
  closeWhatsNew: () => set({ whatsNewDialogOpen: false }),
}))
