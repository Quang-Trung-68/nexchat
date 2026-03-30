import { create } from 'zustand'

/** Blob URL đang chờ upload Cloudinary — gắn theo messageId để hiện placeholder trong thread. */
interface PendingImageUploadsState {
  byMessageId: Record<string, { previewUrls: string[] }>
  register: (messageId: string, previewUrls: string[]) => void
  clear: (messageId: string) => void
  reset: () => void
}

export const usePendingImageUploadsStore = create<PendingImageUploadsState>((set, get) => ({
  byMessageId: {},
  register: (messageId, previewUrls) =>
    set((s) => ({
      byMessageId: { ...s.byMessageId, [messageId]: { previewUrls } },
    })),
  clear: (messageId) =>
    set((s) => {
      const cur = get().byMessageId[messageId]
      if (cur) {
        for (const u of cur.previewUrls) {
          try {
            URL.revokeObjectURL(u)
          } catch {
            /* ignore */
          }
        }
      }
      const next = { ...s.byMessageId }
      delete next[messageId]
      return { byMessageId: next }
    }),
  reset: () => {
    const all = get().byMessageId
    for (const id of Object.keys(all)) {
      for (const u of all[id].previewUrls) {
        try {
          URL.revokeObjectURL(u)
        } catch {
          /* ignore */
        }
      }
    }
    set({ byMessageId: {} })
  },
}))
