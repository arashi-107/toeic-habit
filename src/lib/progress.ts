import type { Plan } from '../data/plan'
import type { DateStr } from './date'
import { deruPlanned, deruTargetEnd, deruToday } from './deru'
import { kinfrePlanned, kinfreTargetEnd, kinfreToday, totalWords } from './kinfre'
import { analyzePace, type Pace } from './pace'
import type { DayLog } from './types'

const amountOn = (logs: DayLog[], date: DateStr, key: 'kinfreNew' | 'deru') =>
  logs.find((l) => l.date === date)?.[key] ?? 0

export function kinfrePace(plan: Plan, logs: DayLog[], today: DateStr): Pace {
  const k = kinfreToday(plan, logs, today)
  return analyzePace({
    today,
    start: plan.startDate,
    todayDone: k.main.kind === 'new' ? k.mainDone : true,
    total: totalWords(plan),
    actual: k.learned,
    plannedThrough: (d) => kinfrePlanned(plan, d),
    doneOn: (d) => amountOn(logs, d, 'kinfreNew'),
    targetEnd: kinfreTargetEnd(plan),
    unit: plan.kinfre.dailyNew,
  })
}

export function deruPace(plan: Plan, logs: DayLog[], today: DateStr): Pace {
  const mode = logs.find((l) => l.date === today)?.mode ?? 'standard'
  const d = deruToday(plan, logs, today, mode)
  return analyzePace({
    today,
    start: plan.startDate,
    todayDone: d.checked,
    total: plan.deru.total,
    actual: d.firstPassDone,
    plannedThrough: (dd) => deruPlanned(plan, dd),
    doneOn: (dd) => amountOn(logs, dd, 'deru'),
    targetEnd: deruTargetEnd(plan),
    unit: plan.deru.weekday,
  })
}
