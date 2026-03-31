import { userDisplayName } from '@/lib/userDisplay'
import type { PublicUser } from '@/features/friends/api/friends.api'

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

/** Gom nhóm theo chữ cái đầu sau khi bỏ dấu (A–Z, 0–9, #). */
export function letterBucketForUser(user: PublicUser): string {
  const label = userDisplayName(user)
  const first = stripDiacritics(label).trim().charAt(0).toUpperCase()
  if (/[A-Z]/.test(first)) return first
  if (/[0-9]/.test(first)) return '0-9'
  return '#'
}

export function groupFriendsByLetter<T extends { user: PublicUser }>(
  items: T[]
): { letter: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const row of items) {
    const L = letterBucketForUser(row.user)
    const list = map.get(L) ?? []
    list.push(row)
    map.set(L, list)
  }
  const letters = [...map.keys()].sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    if (a === '0-9' && b !== '0-9') return -1
    if (b === '0-9' && a !== '0-9') return 1
    return a.localeCompare(b, 'en')
  })
  return letters.map((letter) => ({ letter, items: map.get(letter)! }))
}
