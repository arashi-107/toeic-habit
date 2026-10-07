// 日付は 'YYYY-MM-DD' の文字列で扱う（端末のローカル日付）
export type DateStr = string

const DAY_MS = 86_400_000
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toUtcMs(s: DateStr): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = new Date(toUtcMs(s) + n * DAY_MS)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** from から to までの日数（to が後なら正） */
export function diffDays(from: DateStr, to: DateStr): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS)
}

/** 0 = 日曜 … 6 = 土曜 */
export function weekday(s: DateStr): number {
  return new Date(toUtcMs(s)).getUTCDay()
}

/** 勉強の日付。cutoffHour 時までは前日扱いにする */
export function studyDate(now: Date, cutoffHour: number): DateStr {
  return toDateStr(new Date(now.getTime() - cutoffHour * 3_600_000))
}

/** 10/8（木） */
export function formatMD(s: DateStr): string {
  const [, m, d] = s.split('-').map(Number)
  return `${m}/${d}（${WEEKDAYS[weekday(s)]}）`
}

/** from から to まで（両端を含む）の日付の配列 */
export function dateRange(from: DateStr, to: DateStr): DateStr[] {
  const n = diffDays(from, to)
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addDays(from, i))
}
