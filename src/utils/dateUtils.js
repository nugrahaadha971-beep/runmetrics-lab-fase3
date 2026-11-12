// Semua fungsi murni. Tanggal = string 'YYYY-MM-DD' (tanggal lokal perangkat).
// tzOffsetMin = menit di timur UTC (WIB = +420), kebalikan dari Date.getTimezoneOffset().
const DAY_MS = 86400000
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (n) => String(n).padStart(2, '0')

export function getTzOffsetMin(ms) {
  return 0 - new Date(ms).getTimezoneOffset()
}

export function toLocalDateString(ms, tzOffsetMin) {
  const d = new Date(ms + tzOffsetMin * 60000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export const localDateOf = (ms) => toLocalDateString(ms, getTzOffsetMin(ms))
export const todayLocal = (nowMs = Date.now()) => localDateOf(nowMs)

function toUtcMs(dateStr) {
  const m = DATE_RE.exec(dateStr)
  if (!m) throw new Error(`Tanggal tidak valid: ${dateStr}`)
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function isValidDateString(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false
  return toLocalDateString(toUtcMs(s), 0) === s
}

export const addDays = (dateStr, n) => toLocalDateString(toUtcMs(dateStr) + n * DAY_MS, 0)
export const daysBetween = (a, b) => Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS)

// Awal minggu = Senin.
export function weekStartMonday(dateStr) {
  const dow = new Date(toUtcMs(dateStr)).getUTCDay() // 0 = Minggu
  return addDays(dateStr, -((dow + 6) % 7))
}

// Pace detik/km -> 'm:ss'. null, NaN, Infinity, dan <= 0 menjadi '—'.
export function formatPace(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—'
  const t = Math.round(sec)
  return `${Math.floor(t / 60)}:${pad(t % 60)}`
}

// Durasi detik -> 'hh:mm:ss'.
export function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '—'
  const t = Math.round(sec)
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`
}
