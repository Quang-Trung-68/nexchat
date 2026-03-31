/** Mặt giận U+1F620 — dùng chung client/server để tránh lệch encoding khi validate. */
export const EMOJI_ANGRY_FACE = '\u{1F620}'

/** Chuẩn hóa trước khi gửi API / so khớp allowlist (NFC — tránh lệch VS16 / tổ hợp). */
export function normalizeReactionEmoji(s: string): string {
  return s.normalize('NFC').trim()
}

/** Tập emoji được phép khi react (Bước 12) — khớp validate server + picker client. */
export const ALLOWED_REACTION_EMOJIS = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '🙏',
  '🔥',
  '✨',
  '👀',
  '💯',
  '🎉',
  '👏',
  '👌',
  '😍',
  '🤔',
  '😭',
  '😊',
  '💪',
  '🤣',
  '⭐',
  EMOJI_ANGRY_FACE,
] as const

export type AllowedReactionEmoji = (typeof ALLOWED_REACTION_EMOJIS)[number]

/** Danh sách đã NFC — dùng khi so sánh với payload. */
export const ALLOWED_REACTION_EMOJIS_NORMALIZED: readonly string[] = ALLOWED_REACTION_EMOJIS.map((e) =>
  normalizeReactionEmoji(e)
)
