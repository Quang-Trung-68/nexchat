import type { MessageSenderDto } from '@/features/messages/types/message.types'

/** Payload REST/socket có thể là camelCase hoặc snake_case (DB: display_name). */
export type MessageSenderPayload = MessageSenderDto & { display_name?: string | null }

/**
 * Chuẩn hoá sender: giữ `displayName` đúng từ DB, không nhét `username` vào `displayName`.
 * UI dùng `userDisplayName()` để fallback khi thiếu.
 */
export function normalizeMessageSender(s: MessageSenderPayload): MessageSenderDto {
  const raw = s.displayName ?? s.display_name
  const trimmed = raw?.trim()
  return {
    id: s.id,
    username: s.username,
    ...(trimmed ? { displayName: trimmed } : {}),
    avatarUrl: s.avatarUrl ?? null,
  }
}
