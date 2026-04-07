/** Origin API production (không có path `/api`). Dev: rỗng → dùng relative `/api` qua Vite proxy. */
export function getApiOrigin(): string {
  const u = import.meta.env.VITE_API_URL
  if (u && String(u).trim()) return String(u).replace(/\/$/, '')
  return ''
}

/** URL đầy đủ tới API (ví dụ OAuth redirect). */
export function apiUrl(path: string): string {
  const base = getApiOrigin()
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}
