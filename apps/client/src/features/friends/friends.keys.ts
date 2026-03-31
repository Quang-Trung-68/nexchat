export const friendsKeys = {
  all: ['friends'] as const,
  accepted: () => ['friends', 'accepted'] as const,
  incoming: () => ['friends', 'incoming'] as const,
  outgoing: () => ['friends', 'outgoing'] as const,
  /** Lời mời đến + đã gửi (một API). */
  pending: () => ['friends', 'pending'] as const,
  relationship: (userId: string) => ['friends', 'relationship', userId] as const,
}
