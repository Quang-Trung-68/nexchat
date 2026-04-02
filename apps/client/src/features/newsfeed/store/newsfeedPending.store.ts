import { create } from 'zustand'

type NewsfeedPendingState = {
  pendingCount: number
  bump: () => void
  reset: () => void
}

export const useNewsfeedPendingStore = create<NewsfeedPendingState>((set) => ({
  pendingCount: 0,
  bump: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  reset: () => set({ pendingCount: 0 }),
}))
