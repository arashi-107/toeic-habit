import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN as plan } from '../data/plan'
import { addDays, diffDays, formatMD, studyDate } from './date'
import { deruPlanned, deruTargetEnd, deruToday } from './deru'
import { describeRange, kinfrePlanned, kinfreTargetEnd, kinfreToday, sectionSchedule, totalWords } from './kinfre'
import { listeningToday } from './listening'
import { analyzePace } from './pace'
import { dayStatus, streak, unexplainedDays } from './status'
import { emptyLog, type DayLog } from './types'

const log = (date: string, patch: Partial<DayLog> = {}): DayLog => ({ ...emptyLog(date), ...patch })
const fullDay = (date: string, patch: Partial<DayLog> = {}) =>
  log(date, { reviewDone: true, kinfreNew: 20, deru: 10, listeningDone: true, ...patch })

describe('日付', () => {
  it('午前3時までは前日扱い', () => {
    expect(studyDate(new Date(2026, 9, 9, 2, 59), 3)).toBe('2026-10-08')
    expect(studyDate(new Date(2026, 9, 9, 3, 0), 3)).toBe('2026-10-09')
  })
  it('月をまたいだ計算', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(diffDays('2026-10-07', '2027-01-13')).toBe(98)
    expect(formatMD('2026-10-08')).toBe('10/8（木）')
  })
})

describe('金フレ', () => {
  it('全部で1277語、予定では12/10に覚え終える', () => {
    expect(totalWords(plan)).toBe(1277)
    expect(kinfreTargetEnd(plan)).toBe('2026-12-10')
    expect(kinfrePlanned(plan, '2026-10-27')).toBe(400)
  })

  it('セクションごとの予定日', () => {
    const s = sectionSchedule(plan)
    expect([s[0].from, s[0].to]).toEqual(['2026-10-08', '2026-10-27'])
    expect([s[1].from, s[1].to]).toEqual(['2026-10-28', '2026-10-29'])
    expect(s[8].to).toBe('2026-12-10')
  })

  it('セクションをまたぐ範囲の表示', () => {
    expect(describeRange(plan.kinfre.sections, { from: 421, to: 440 })).toBe(
      'Supplement 1 21〜30語目 ＋ Supplement 2 1〜10語目',
    )
  })

  it('初日は復習がなく、新しい20語は1〜20語目', () => {
    const k = kinfreToday(plan, [], '2026-10-08')
    expect(k.review).toBeNull()
    expect(k.main.ranges).toEqual([{ from: 1, to: 20 }])
  })

  it('前日に覚えた20語が今日の復習になる', () => {
    const logs = [fullDay('2026-10-08'), fullDay('2026-10-09')]
    const k = kinfreToday(plan, logs, '2026-10-10')
    expect(k.review?.ranges).toEqual([{ from: 21, to: 40 }])
    expect(k.main.ranges).toEqual([{ from: 41, to: 60 }])
  })

  it('サボった日の翌日は、最後に覚えた20語を復習する', () => {
    const logs = [fullDay('2026-10-08')]
    const k = kinfreToday(plan, logs, '2026-10-10')
    expect(k.review?.date).toBe('2026-10-08')
    expect(k.main.ranges).toEqual([{ from: 21, to: 40 }])
  })

  it('全部覚えたら総復習（80語ずつ、最後まで行ったら最初に戻る）', () => {
    const logs = [log('2026-10-08', { kinfreNew: 1277 }), log('2026-10-09', { kinfreTotal: 1240 })]
    const k = kinfreToday(plan, logs, '2026-10-10')
    expect(k.main.kind).toBe('total')
    expect(k.main.ranges).toEqual([
      { from: 1241, to: 1277 },
      { from: 1, to: 43 },
    ])
  })
})

describe('でる1000問', () => {
  it('平日10問・休日20問で12月下旬に1周目が終わる', () => {
    expect(deruPlanned(plan, '2026-10-08')).toBe(10) // 木曜
    expect(deruPlanned(plan, '2026-10-10')).toBe(40) // 土曜は20問
    const end = deruTargetEnd(plan)
    expect(end >= '2026-12-15' && end <= '2026-12-26').toBe(true)
  })

  it('今日の範囲と忙しい日の問題数', () => {
    const logs = [log('2026-10-08', { deru: 10 })]
    expect(deruToday(plan, logs, '2026-10-09', 'standard')).toMatchObject({ from: 11, to: 20, quota: 10 })
    expect(deruToday(plan, logs, '2026-10-09', 'minimum')).toMatchObject({ from: 11, to: 15, quota: 5 })
  })
})

describe('リスニング', () => {
  it('標準の日だけ次の5問に進み、忙しい日は前日の音声を繰り返す', () => {
    const logs = [fullDay('2026-10-08')]
    expect(listeningToday(plan, logs, '2026-10-09', 'standard')?.item).toBe('TEST 1 Q6〜10（Part 1・2）')
    expect(listeningToday(plan, logs, '2026-10-09', 'minimum')?.item).toBe('TEST 1 Q1〜5（Part 1）')
  })
  it('模試の日', () => {
    expect(listeningToday(plan, [], '2026-12-19', 'standard')?.phase.mock).toBe(true)
  })
})

describe('記録の状態', () => {
  it('標準・最低ライン・途中・なし', () => {
    const logs = [
      fullDay('2026-10-08'),
      fullDay('2026-10-09', { mode: 'minimum', deru: 5 }),
      log('2026-10-10', { kinfreNew: 20 }),
    ]
    expect(dayStatus(plan, logs, '2026-10-08')).toBe('standard')
    expect(dayStatus(plan, logs, '2026-10-09')).toBe('minimum')
    expect(dayStatus(plan, logs, '2026-10-10')).toBe('partial')
    expect(dayStatus(plan, logs, '2026-10-11')).toBe('none')
  })

  it('前日の復習をしていなければ完了にならない', () => {
    const logs = [fullDay('2026-10-08'), fullDay('2026-10-09', { reviewDone: false })]
    expect(dayStatus(plan, logs, '2026-10-09')).toBe('partial')
  })

  it('理由が書かれていない日と連続日数', () => {
    const logs = [fullDay('2026-10-08'), log('2026-10-09'), fullDay('2026-10-10'), fullDay('2026-10-11', { deru: 20 })]
    expect(unexplainedDays(plan, logs, '2026-10-12')).toEqual(['2026-10-09'])
    expect(streak(plan, logs, '2026-10-12')).toBe(2)
  })
})

describe('遅れの予測', () => {
  it('2日分遅れていれば黄色、挽回ペースを出す', () => {
    const p = analyzePace({
      today: '2026-10-12',
      start: '2026-10-08',
      todayDone: false,
      total: 1277,
      actual: 40,
      plannedThrough: (d) => kinfrePlanned(plan, d),
      doneOn: (d) => (d === '2026-10-08' || d === '2026-10-09' ? 20 : 0),
      targetEnd: '2026-12-10',
      unit: 20,
    })
    expect(p.planned).toBe(80)
    expect(p.behind).toBe(40)
    expect(p.level).toBe('yellow')
    expect(p.avg7).toBe(10)
    expect(p.projectedEnd).toBe(addDays('2026-10-11', 124))
    expect(p.catchUpPerDay).toBe(Math.ceil(1237 / diffDays('2026-10-11', '2026-12-10')))
  })
})
