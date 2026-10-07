import { addDays, diffDays, type DateStr } from './date'

export type PaceLevel = 'green' | 'yellow' | 'red'

export interface PaceInput {
  today: DateStr
  start: DateStr
  /** 今日のノルマが終わっているか（終わっていれば今日まで、まだなら昨日までで比べる） */
  todayDone: boolean
  total: number
  /** 実際に終えた量（今日の分を含む） */
  actual: number
  plannedThrough: (date: DateStr) => number
  doneOn: (date: DateStr) => number
  targetEnd: DateStr
  /** 「1日分」とみなす量 */
  unit: number
}

export interface Pace {
  started: boolean
  compDate: DateStr
  planned: number
  /** 正なら遅れ、負なら先行 */
  behind: number
  behindDays: number
  level: PaceLevel
  remaining: number
  /** 直近7日間の1日あたりの平均 */
  avg7: number
  /** このペースで全部終わる日。ペースが0なら null */
  projectedEnd: DateStr | null
  /** 予定の日に間に合わせるために必要な1日あたりの量 */
  catchUpPerDay: number
  finished: boolean
}

export function analyzePace(i: PaceInput): Pace {
  const compDate = i.todayDone ? i.today : addDays(i.today, -1)
  const started = diffDays(i.start, compDate) >= 0
  const done = Math.min(i.actual, i.total)
  const remaining = i.total - done
  const planned = started ? i.plannedThrough(compDate) : 0
  const behind = planned - done
  const behindDays = behind / i.unit
  const level: PaceLevel = behindDays < 1 ? 'green' : behindDays < 3 ? 'yellow' : 'red'

  let avg7 = 0
  if (started) {
    const days = Math.min(7, diffDays(i.start, compDate) + 1)
    let sum = 0
    for (let k = 0; k < days; k++) sum += i.doneOn(addDays(compDate, -k))
    avg7 = sum / days
  }

  const finished = remaining <= 0
  const projectedEnd = finished || avg7 <= 0 ? null : addDays(compDate, Math.ceil(remaining / avg7))
  const daysLeft = diffDays(compDate, i.targetEnd)
  const catchUpPerDay = finished ? 0 : daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining

  return { started, compDate, planned, behind, behindDays, level, remaining, avg7, projectedEnd, catchUpPerDay, finished }
}
