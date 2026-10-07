import type { DateStr } from './date'

/** standard = 標準、minimum = 忙しい日（最低ライン） */
export type Mode = 'standard' | 'minimum'

/** 1日分の記録 */
export interface DayLog {
  date: DateStr
  mode: Mode
  /** 金フレ：前日の分の復習をしたか */
  reviewDone: boolean
  /** 金フレ：新しく覚えた語数（0 = まだ） */
  kinfreNew: number
  /** 金フレ：総復習で回した語数（全範囲を覚え終えた後） */
  kinfreTotal: number
  /** でる1000問：解いた問題数 */
  deru: number
  listeningDone: boolean
  /** ノルマが終わらなかった日の理由（翌日以降に入力） */
  skipReason?: string
  /** 翌日の開始時刻の宣言 'HH:MM' */
  nextStart?: string
}

export function emptyLog(date: DateStr): DayLog {
  return { date, mode: 'standard', reviewDone: false, kinfreNew: 0, kinfreTotal: 0, deru: 0, listeningDone: false }
}

export const byDate = (a: DayLog, b: DayLog) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
