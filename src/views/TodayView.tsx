import { useState } from 'react'
import { DayTasks } from '../components/DayTasks'
import { LEVEL_BG, LEVEL_TEXT, type AppCtx } from '../components/ui'
import { saveSetting, updateLog } from '../db'
import { addDays, diffDays, formatMD, toDateStr } from '../lib/date'
import { totalWords } from '../lib/kinfre'
import { deruPace, kinfrePace } from '../lib/progress'
import { dayStatus, isComplete, planEnd, streak } from '../lib/status'

function Countdown({ ctx }: { ctx: AppCtx }) {
  const { plan, today } = ctx
  return (
    <div className="flex flex-wrap gap-2">
      {plan.exams
        .filter((e) => e.date >= today)
        .map((e) => {
          const n = diffDays(today, e.date)
          return (
            <span key={e.date} className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-bold text-white">
              {n === 0 ? `今日は${e.label}` : `${e.label}まで ${n}日`}
            </span>
          )
        })}
    </div>
  )
}

/** 昨日宣言した開始時刻 */
function Declaration({ ctx, started }: { ctx: AppCtx; started: boolean }) {
  const { logs, today, now } = ctx
  const declared = logs.find((l) => l.date === addDays(today, -1))?.nextStart
  if (!declared) return null
  const [h, m] = declared.split(':').map(Number)
  // 日付が変わった後（午前3時まで）は、もう時刻を過ぎている
  const passed = toDateStr(now) !== today || now.getHours() * 60 + now.getMinutes() >= h * 60 + m
  if (passed && !started) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
        宣言した {declared} を過ぎています。今すぐ始めよう。
      </div>
    )
  }
  return <div className="card text-sm">昨日の宣言：今日は <b>{declared}</b> から始める</div>
}

function DebtAndPace({ ctx }: { ctx: AppCtx }) {
  const { plan, logs, today } = ctx
  const kp = kinfrePace(plan, logs, today)
  const dp = deruPace(plan, logs, today)
  const rows = [
    { name: '金フレ', p: kp, unit: '語' },
    { name: 'でる1000問', p: dp, unit: '問' },
  ]
  if (!kp.started) return null
  const worst = kp.level === 'red' || dp.level === 'red' ? 'red' : kp.level === 'yellow' || dp.level === 'yellow' ? 'yellow' : 'green'
  return (
    <div className={`rounded-2xl border p-4 text-sm ${LEVEL_BG[worst]}`}>
      {rows.map(({ name, p, unit }) => (
        <div key={name} className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="shrink-0 font-bold whitespace-nowrap">{name}</span>
          <span className={`text-right font-bold ${LEVEL_TEXT[p.level]}`}>
            {p.finished
              ? '1周目完了'
              : p.behind > 0
                ? `未消化 ${p.behind}${unit}（${p.behindDays.toFixed(1)}日分）→ 1日${p.catchUpPerDay}${unit}で挽回`
                : p.behind < 0
                  ? `予定より${-p.behind}${unit}先行`
                  : '予定どおり'}
          </span>
        </div>
      ))}
    </div>
  )
}

function TomorrowForm({ ctx }: { ctx: AppCtx }) {
  const { logs, today } = ctx
  const log = logs.find((l) => l.date === today)
  const previous = logs.find((l) => l.date === addDays(today, -1))?.nextStart
  const [time, setTime] = useState(log?.nextStart ?? previous ?? '21:00')
  const [editing, setEditing] = useState(!log?.nextStart)

  if (!editing && log?.nextStart) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span>
          明日は <b>{log.nextStart}</b> から始めると宣言しました
        </span>
        <button type="button" className="shrink-0 text-sm whitespace-nowrap underline muted" onClick={() => setEditing(true)}>
          変更
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <p className="font-bold">明日は何時から始める？</p>
      <div className="flex gap-2">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input flex-1" />
        <button
          type="button"
          className="btn-primary"
          disabled={!time}
          onClick={async () => {
            await updateLog(today, { nextStart: time })
            setEditing(false)
          }}
        >
          宣言する
        </button>
      </div>
    </div>
  )
}

function BeforeStart({ ctx }: { ctx: AppCtx }) {
  const { plan, today } = ctx
  const n = diffDays(today, plan.startDate)
  return (
    <div className="space-y-4">
      <div className="card text-center">
        <p className="muted">開始日</p>
        <p className="mt-1 text-2xl font-bold">{formatMD(plan.startDate)}</p>
        <p className="mt-2">あと {n}日</p>
      </div>
      <button
        type="button"
        className="btn-primary w-full"
        onClick={() => {
          if (confirm(`開始日を今日（${formatMD(today)}）に変えますか？ 予定がすべて1日ずつ前に動きます。`)) {
            saveSetting('startDate', today)
          }
        }}
      >
        今日から始める
      </button>
    </div>
  )
}

function AfterEnd({ ctx }: { ctx: AppCtx }) {
  const { plan, logs, today } = ctx
  const last = planEnd(plan)
  const days = diffDays(plan.startDate, last) + 1
  let done = 0
  for (let d = plan.startDate; d <= last; d = addDays(d, 1)) if (isComplete(dayStatus(plan, logs, d))) done++
  const k = kinfrePace(plan, logs, last)
  const isExamDay = plan.exams.some((e) => e.date === today)
  return (
    <div className="card space-y-2 text-center">
      <p className="text-2xl font-bold">{isExamDay ? '本番の日。やってきたことを信じて。' : 'おつかれさまでした'}</p>
      <p>
        {days}日のうち <b>{done}日</b> ノルマを達成
      </p>
      <p>
        金フレ <b>{totalWords(plan) - k.remaining}</b> / {totalWords(plan)}語
      </p>
    </div>
  )
}

export function TodayView({ ctx }: { ctx: AppCtx }) {
  const { plan, logs, today } = ctx
  if (today < plan.startDate) return <BeforeStart ctx={ctx} />
  if (today > planEnd(plan)) return <AfterEnd ctx={ctx} />

  const status = dayStatus(plan, logs, today)
  const complete = isComplete(status)
  const s = streak(plan, logs, today)
  const dayNo = diffDays(plan.startDate, today) + 1
  const totalDays = diffDays(plan.startDate, planEnd(plan)) + 1

  return (
    <div className="space-y-3">
      <header className="flex items-end justify-between px-1">
        <div>
          <p className="text-sm muted">
            {dayNo}日目 / {totalDays}日
          </p>
          <h1 className="text-2xl font-bold">{formatMD(today)}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs muted">連続</p>
          <p className="text-2xl font-bold text-orange-500">{s}日</p>
        </div>
      </header>
      <Countdown ctx={ctx} />
      <Declaration ctx={ctx} started={status !== 'none'} />
      <DebtAndPace ctx={ctx} />
      <DayTasks ctx={ctx} date={today} />
      {complete && (
        <div className="card space-y-3 border-2 border-emerald-400">
          <p className="text-center text-xl font-bold text-emerald-600 dark:text-emerald-400">
            今日のノルマ完了{status === 'minimum' ? '（最低ライン）' : ''}
          </p>
          <TomorrowForm ctx={ctx} />
        </div>
      )}
    </div>
  )
}
