export function formatMessageTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/** Thời gian sidebar: phút/giờ trước → hôm qua → dd/mm (cùng năm) → dd/mm/yyyy */
export function formatSidebarTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (Number.isNaN(d.getTime())) return ''

  const diffMs = Math.max(0, now.getTime() - d.getTime())
  const diffM = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)

  if (diffM < 1) return 'Vừa xong'
  if (diffM < 60) return `${diffM} phút trước`

  const sameCalendarDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (sameCalendarDay && diffH >= 1) {
    return `${diffH} giờ trước`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()

  if (isYesterday) return 'Hôm qua'

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDaySeparator(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
