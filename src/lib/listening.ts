import type { ListeningPhase, Plan } from '../data/plan'
import type { DateStr } from './date'
import type { DayLog, Mode } from './types'

export function phaseFor(plan: Plan, date: DateStr): ListeningPhase | undefined {
  return plan.listening.find((p) => p.from <= date && date <= p.to)
}

export interface ListeningToday {
  phase: ListeningPhase
  item: string
  /** 忙しい日：新しい問題に進まず、前日の音声で音読だけする */
  repeatOnly: boolean
  done: boolean
}

export function listeningToday(plan: Plan, logs: DayLog[], today: DateStr, mode: Mode): ListeningToday | null {
  const phase = phaseFor(plan, today)
  if (!phase) return null
  // このフェーズで、標準メニューで終えた日数だけ先に進む
  const sessions = logs.filter(
    (l) => l.date < today && l.listeningDone && l.mode === 'standard' && phaseFor(plan, l.date) === phase,
  ).length
  const n = phase.items.length
  const repeatOnly = mode === 'minimum' && !phase.mock
  const index = repeatOnly ? Math.max(0, sessions - 1) % n : sessions % n
  return {
    phase,
    item: phase.items[index],
    repeatOnly,
    done: !!logs.find((l) => l.date === today)?.listeningDone,
  }
}
