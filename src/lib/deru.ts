import type { Plan } from '../data/plan'
import { addDays, diffDays, weekday, type DateStr } from './date'
import type { DayLog, Mode } from './types'

export function isHoliday(plan: Plan, date: DateStr): boolean {
  const w = weekday(date)
  return w === 0 || w === 6 || plan.holidays.includes(date)
}

/** 標準の日の問題数（平日10問・休日20問） */
export function standardQuota(plan: Plan, date: DateStr): number {
  return isHoliday(plan, date) ? plan.deru.holiday : plan.deru.weekday
}

export function deruQuota(plan: Plan, date: DateStr, mode: Mode): number {
  return mode === 'minimum' ? plan.deru.minimum : standardQuota(plan, date)
}

/** 予定では date までに解いているはずの問題数（1周目） */
export function deruPlanned(plan: Plan, date: DateStr): number {
  let sum = 0
  for (let d = plan.startDate; diffDays(d, date) >= 0; d = addDays(d, 1)) {
    sum += standardQuota(plan, d)
    if (sum >= plan.deru.total) return plan.deru.total
  }
  return sum
}

/** 予定で1周目が終わる日 */
export function deruTargetEnd(plan: Plan): DateStr {
  let sum = 0
  let d = plan.startDate
  for (;;) {
    sum += standardQuota(plan, d)
    if (sum >= plan.deru.total) return d
    d = addDays(d, 1)
  }
}

export interface DeruToday {
  /** 1周目の途中か（false なら間違えた問題の解き直し） */
  firstPass: boolean
  /** 今日の範囲（何問目〜何問目）。1周目のときだけ意味がある */
  from: number
  to: number
  quota: number
  doneToday: number
  checked: boolean
  /** 1周目で解いた問題数（今日の分を含む） */
  firstPassDone: number
}

export function deruToday(plan: Plan, logs: DayLog[], today: DateStr, mode: Mode): DeruToday {
  const total = plan.deru.total
  let before = 0
  let doneToday = 0
  for (const l of logs) {
    if (l.date < today) before += l.deru
    else if (l.date === today) doneToday = l.deru
  }
  const quota = deruQuota(plan, today, mode)
  const firstPass = before < total
  const need = firstPass ? Math.min(quota, total - before) : quota
  return {
    firstPass,
    from: before + 1,
    to: Math.min(total, before + Math.max(quota, doneToday)),
    quota: need,
    doneToday,
    checked: doneToday >= need,
    firstPassDone: Math.min(total, before + doneToday),
  }
}
