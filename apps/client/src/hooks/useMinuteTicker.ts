import { useEffect, useState } from 'react'

/** Tăng mỗi phút (căn biên phút hệ thống) để ép re-render (sidebar timestamp). */
export function useMinuteTicker(): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null
    const delay = Math.max(0, 60_000 - (Date.now() % 60_000))
    const timeoutId = window.setTimeout(() => {
      setN((x) => x + 1)
      intervalId = window.setInterval(() => setN((x) => x + 1), 60_000)
    }, delay)
    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [])
  return n
}
