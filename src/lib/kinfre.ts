import type { Plan, Section } from '../data/plan'
import { addDays, diffDays, type DateStr } from './date'
import { byDate, type DayLog } from './types'

/** 金フレ全体の通し番号（1始まり、両端を含む） */
export interface WordRange {
  from: number
  to: number
}

export const totalWords = (plan: Plan) => plan.kinfre.sections.reduce((sum, s) => sum + s.words, 0)

/** 通し番号の範囲を「助走の400語 21〜40語目」のようなセクション内の番号に直す */
export function describeRange(sections: Section[], r: WordRange): string {
  const parts: string[] = []
  let offset = 0
  for (const s of sections) {
    const a = Math.max(r.from, offset + 1)
    const b = Math.min(r.to, offset + s.words)
    if (a <= b) parts.push(`${s.name} ${a - offset}〜${b - offset}語目`)
    offset += s.words
  }
  return parts.join(' ＋ ')
}

export const describeRanges = (sections: Section[], ranges: WordRange[]) =>
  ranges.map((r) => describeRange(sections, r)).join(' ＋ ')

/** 総復習用：start 語回した後の続きから count 語。最後まで行ったら最初に戻る */
function wrap(start: number, count: number, total: number): WordRange[] {
  const pos = start % total
  if (pos + count <= total) return [{ from: pos + 1, to: pos + count }]
  return [
    { from: pos + 1, to: total },
    { from: 1, to: pos + count - total },
  ]
}

export interface KinfreToday {
  /** 前日の分の復習。まだ何も覚えていなければ null */
  review: { date: DateStr; ranges: WordRange[]; words: number } | null
  reviewDone: boolean
  /** 今日の新しい20語、または総復習 */
  main: { kind: 'new' | 'total'; ranges: WordRange[]; words: number }
  mainDone: boolean
  /** 今日より前までに覚えた語数 */
  learnedBefore: number
  /** 今日の分を含めて覚えた語数 */
  learned: number
}

export function kinfreToday(plan: Plan, logs: DayLog[], today: DateStr): KinfreToday {
  const total = totalWords(plan)
  let cumNew = 0
  let cumTotal = 0
  let review: KinfreToday['review'] = null
  let todayLog: DayLog | undefined

  for (const l of [...logs].sort(byDate)) {
    if (l.date === today) todayLog = l
    if (l.date >= today) continue
    const ranges: WordRange[] = []
    if (l.kinfreNew > 0) ranges.push({ from: cumNew + 1, to: Math.min(total, cumNew + l.kinfreNew) })
    if (l.kinfreTotal > 0) ranges.push(...wrap(cumTotal, l.kinfreTotal, total))
    if (ranges.length > 0) review = { date: l.date, ranges, words: l.kinfreNew + l.kinfreTotal }
    cumNew += l.kinfreNew
    cumTotal += l.kinfreTotal
  }
  cumNew = Math.min(cumNew, total)

  const t = todayLog
  let main: KinfreToday['main']
  let mainDone: boolean
  if (cumNew < total) {
    const words = Math.min(t && t.kinfreNew > 0 ? t.kinfreNew : plan.kinfre.dailyNew, total - cumNew)
    main = { kind: 'new', ranges: [{ from: cumNew + 1, to: cumNew + words }], words }
    mainDone = !!t && t.kinfreNew > 0
  } else {
    const words = t && t.kinfreTotal > 0 ? t.kinfreTotal : plan.kinfre.totalReviewDaily
    main = { kind: 'total', ranges: wrap(cumTotal, words, total), words }
    mainDone = !!t && t.kinfreTotal > 0
  }

  return {
    review,
    reviewDone: !!t?.reviewDone,
    main,
    mainDone,
    learnedBefore: cumNew,
    learned: Math.min(total, cumNew + (t?.kinfreNew ?? 0)),
  }
}

/** 予定では date までに覚えているはずの語数 */
export function kinfrePlanned(plan: Plan, date: DateStr): number {
  const days = diffDays(plan.startDate, date) + 1
  return Math.max(0, Math.min(totalWords(plan), days * plan.kinfre.dailyNew))
}

/** 予定で全範囲を覚え終える日 */
export function kinfreTargetEnd(plan: Plan): DateStr {
  return addDays(plan.startDate, Math.ceil(totalWords(plan) / plan.kinfre.dailyNew) - 1)
}

export interface SectionSchedule extends Section {
  firstWord: number
  lastWord: number
  from: DateStr
  to: DateStr
}

/** 各セクションを予定では何日から何日にやるか */
export function sectionSchedule(plan: Plan): SectionSchedule[] {
  const { dailyNew, sections } = plan.kinfre
  let offset = 0
  return sections.map((s) => {
    const firstWord = offset + 1
    const lastWord = offset + s.words
    offset = lastWord
    return {
      ...s,
      firstWord,
      lastWord,
      from: addDays(plan.startDate, Math.floor((firstWord - 1) / dailyNew)),
      to: addDays(plan.startDate, Math.floor((lastWord - 1) / dailyNew)),
    }
  })
}
