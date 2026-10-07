import type { DateStr } from '../lib/date'

export interface Section {
  name: string
  level?: string
  words: number
}

export interface ListeningPhase {
  from: DateStr
  to: DateStr
  title: string
  /** 模試など、時間を計って通しで解く日 */
  mock?: boolean
  /** 1日1つずつ順番に進め、最後まで行ったら最初に戻る */
  items: string[]
}

export interface Plan {
  startDate: DateStr
  /** この時刻（時）までは前日の勉強として扱う */
  cutoffHour: number
  exams: { date: DateStr; label: string }[]
  kinfre: {
    dailyNew: number
    /** 全範囲を覚え終えた後の総復習で、1日に回す語数 */
    totalReviewDaily: number
    sections: Section[]
  }
  deru: {
    total: number
    weekday: number
    holiday: number
    minimum: number
  }
  /** 土日以外で休日として扱う日 */
  holidays: DateStr[]
  listening: ListeningPhase[]
}

// 公式問題集のパートと問題番号の対応
const PARTS: [number, number, number][] = [
  [1, 6, 1],
  [7, 31, 2],
  [32, 70, 3],
  [71, 100, 4],
]

function questions(test: number, from: number, to: number): string {
  const parts = PARTS.filter(([a, b]) => from <= b && to >= a).map(([, , p]) => p)
  return `TEST ${test} Q${from}〜${to}（Part ${parts.join('・')}）`
}

function blocks(test: number, ranges: [number, number][]): string[] {
  return ranges.map(([a, b]) => questions(test, a, b))
}

/** Part 3・4 を3問（1セット）ずつ */
function sets(test: number): string[] {
  const items: string[] = []
  for (let q = 32; q <= 100; q += 3) items.push(questions(test, q, q + 2))
  return items
}

export const DEFAULT_PLAN: Plan = {
  startDate: '2026-10-08',
  cutoffHour: 3,
  exams: [
    { date: '2026-11-04', label: '試験①' },
    { date: '2027-01-13', label: '本番' },
  ],
  kinfre: {
    dailyNew: 20,
    totalReviewDaily: 80,
    sections: [
      { name: '助走の400語', level: '600点レベル', words: 400 },
      { name: 'Supplement 1', words: 30 },
      { name: 'Supplement 2', words: 150 },
      { name: 'Column 1', words: 68 },
      { name: 'Column 2', words: 77 },
      { name: '加速の300語', level: '730点レベル', words: 300 },
      { name: 'Supplement 3', words: 130 },
      { name: 'Supplement 4', words: 68 },
      { name: 'Supplement 5', words: 54 },
    ],
  },
  deru: { total: 1000, weekday: 10, holiday: 20, minimum: 5 },
  // 文化の日・勤労感謝の日・元日・成人の日
  holidays: ['2026-11-03', '2026-11-23', '2027-01-01', '2027-01-11'],
  // 日付が重なる場合は、配列の前にあるものが優先される
  listening: [
    { from: '2026-12-19', to: '2026-12-19', title: '模試', mock: true, items: ['TEST 2 のリスニングを通しで解く（Part 1〜4・約45分）'] },
    { from: '2026-12-20', to: '2026-12-20', title: '模試', mock: true, items: ['TEST 2 のリーディングを通しで解く（Part 5〜7・75分）'] },
    { from: '2027-01-09', to: '2027-01-09', title: '時間配分の練習', mock: true, items: ['TEST 1 のリスニングを通しで解き直す（約45分）'] },
    { from: '2027-01-10', to: '2027-01-10', title: '時間配分の練習', mock: true, items: ['TEST 1 のリーディングを通しで解き直す（75分）'] },
    {
      from: '2026-10-08',
      to: '2026-11-04',
      title: 'TEST 1 Part 1・2 を1日5問',
      items: blocks(1, [
        [1, 5],
        [6, 10],
        [11, 15],
        [16, 20],
        [21, 25],
        [26, 31],
      ]),
    },
    { from: '2026-11-05', to: '2026-12-18', title: 'TEST 1 Part 3・4 を1日1セット', items: sets(1) },
    { from: '2026-12-21', to: '2027-01-12', title: 'TEST 2 Part 3・4 を1日1セット', items: sets(2) },
  ],
}

/** 設定画面で変えられる値 */
export interface UserSettings {
  startDate?: DateStr
  deruTotal?: number
}

export function buildPlan(settings: UserSettings): Plan {
  return {
    ...DEFAULT_PLAN,
    startDate: settings.startDate ?? DEFAULT_PLAN.startDate,
    deru: { ...DEFAULT_PLAN.deru, total: settings.deruTotal ?? DEFAULT_PLAN.deru.total },
  }
}
