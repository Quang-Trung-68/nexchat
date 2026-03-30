/** Hiển thị tên người dùng (ưu tiên displayName). */
export function userDisplayName(p: { displayName?: string | null; username: string }): string {
  const d = p.displayName?.trim()
  return d || p.username
}

type ParticipantLike = { id: string; username: string; displayName?: string | null }

/** Tên trên bubble / tin nổi: ưu tiên profile trong `room.participants` nếu có. */
export function displayNameForMessageSender(
  sender: ParticipantLike,
  participants: ParticipantLike[] | undefined
): string {
  const p = participants?.find((x) => x.id === sender.id)
  return userDisplayName(p ?? sender)
}
