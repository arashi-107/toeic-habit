import type { Plan } from '../data/plan'
import { addDays, dateRange, diffDays, type DateStr } from './date'
import { deruToday } from './deru'
import { kinfreToday } from './kinfre'
import type { DayLog } from './types'

/** standard = 標準で完了、minimum = 最低ラインで完了、partial = 途中まで、none = 何もしていない */
export type DayStatus = 'standard' | 'minimum' | 'partial' | 'none'

/** 記録をつける最後の日（本番の前日） */
export function planEnd(plan: Plan): DateStr {
  return addDays(plan.exams[plan.exams.length - 1].date, -1)
}

export function dayStatus(plan: Plan, logs: DayLog[], date: DateStr): DayStatus {
  const log = logs.find((l) => l.date === date)
  if (!log) return 'none'
  const k = kinfreToday(plan, logs, date)
  const kinfreOk = (!k.review || log.reviewDone) && k.mainDone
  const deruMin = deruToday(plan, logs, date, 'minimum')
  if (kinfreOk && deruMin.checked && log.listeningDone) {
    const deruStd = deruToday(plan, logs, date, 'standard')
    return log.mode === 'standard' && deruStd.checked ? 'standard' : 'minimum'
  }
  const any = log.reviewDone || k.mainDone || log.deru > 0 || log.listeningDone
  return any ? 'partial' : 'none'
}

export const isComplete = (s: DayStatus) => s === 'standard' || s === 'minimum'

/** ノルマが終わっていないのに理由が書かれていない過去の日 */
export function unexplainedDays(plan: Plan, logs: DayLog[], today: DateStr): DateStr[] {
  const last = diffDays(planEnd(plan), addDays(today, -1)) > 0 ? planEnd(plan) : addDays(today, -1)
  return dateRange(plan.startDate, last).filter((d) => {
    if (isComplete(dayStatus(plan, logs, d))) return false
    return !logs.find((l) => l.date === d)?.skipReason
  })
}

/** 連続でノルマを終えた日数（今日が終わっていれば今日も数える） */
export function streak(plan: Plan, logs: DayLog[], today: DateStr): number {
  let count = isComplete(dayStatus(plan, logs, today)) ? 1 : 0
  for (let d = addDays(today, -1); diffDays(plan.startDate, d) >= 0; d = addDays(d, -1)) {
    if (!isComplete(dayStatus(plan, logs, d))) break
    count++
  }
  return count
}
