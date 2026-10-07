import { useState } from 'react'
import type { AppCtx } from '../components/ui'
import { addDays, diffDays, formatMD, weekday, type DateStr } from '../lib/date'
import { deruToday } from '../lib/deru'
import { kinfreToday } from '../lib/kinfre'
import { dayStatus, isComplete, planEnd, streak, type DayStatus } from '../lib/status'

const STATUS_STYLE: Record<DayStatus, string> = {
  standard: 'bg-emerald-500 text-white',
  minimum: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100',
  partial: 'bg-amber-300 text-amber-950',
  none: 'bg-rose-500 text-white',
}

const STATUS_LABEL: Record<DayStatus, string> = {
  standard: '標準で完了',
  minimum: '最低ラインで完了',
  partial: '途中まで',
  none: '何もしていない',
}

function months(from: DateStr, to: DateStr): DateStr[] {
  const result: DateStr[] = []
  let [y, m] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  while (y < ty || (y === ty && m <= tm)) {
    result.push(`${y}-${String(m).padStart(2, '0')}-01`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return result
}

function DayDetail({ ctx, date }: { ctx: AppCtx; date: DateStr }) {
  const { plan, logs } = ctx
  const log = logs.find((l) => l.date === date)
  const k = kinfreToday(plan, logs, date)
  const d = deruToday(plan, logs, date, log?.mode ?? 'standard')
  const status = dayStatus(plan, logs, date)
  const mark = (b: boolean) => (b ? '○' : '×')
  return (
    <div className="card mt-3 space-y-1 text-sm">
      <p className="text-base font-bold">
        {formatMD(date)}　{STATUS_LABEL[status]}
      </p>
      {log && <p className="muted">{log.mode === 'minimum' ? '忙しい日（最低ライン）' : '標準'}</p>}
      {k.review && <p>金フレ 前日の復習：{mark(k.reviewDone)}</p>}
      <p>
        金フレ {k.main.kind === 'new' ? '新しい単語' : '総復習'}：{k.mainDone ? `${log?.kinfreNew || log?.kinfreTotal}語` : '×'}
      </p>
      <p>でる1000問：{d.doneToday}問</p>
      <p>リスニング：{mark(!!log?.listeningDone)}</p>
      {log?.skipReason && <p className="pt-1 text-rose-600 dark:text-rose-400">理由：{log.skipReason}</p>}
      {log?.nextStart && <p className="muted">翌日の宣言：{log.nextStart}</p>}
    </div>
  )
}

export function CalendarView({ ctx }: { ctx: AppCtx }) {
  const { plan, logs, today } = ctx
  const [selected, setSelected] = useState<DateStr | null>(null)
  const last = planEnd(plan)
  const lastExam = plan.exams[plan.exams.length - 1].date
  const examDates = new Set(plan.exams.map((e) => e.date))

  const passed = today < plan.startDate ? [] : Array.from({ length: Math.min(diffDays(plan.startDate, today), diffDays(plan.startDate, last) + 1) }, (_, i) => addDays(plan.startDate, i))
  const completed = passed.filter((d) => isComplete(dayStatus(plan, logs, d))).length

  return (
    <div>
      <h1 className="px-1 text-2xl font-bold">カレンダー</h1>
      <div className="card mt-3 grid grid-cols-2 text-center">
        <div>
          <p className="text-xs muted">連続</p>
          <p className="text-2xl font-bold text-orange-500">{streak(plan, logs, today)}日</p>
        </div>
        <div>
          <p className="text-xs muted">達成した日（昨日まで）</p>
          <p className="text-2xl font-bold">
            {completed}
            <span className="text-base font-normal muted"> / {passed.length}日</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-1 text-xs">
        {(Object.keys(STATUS_LABEL) as DayStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded ${STATUS_STYLE[s]}`} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {selected && <DayDetail ctx={ctx} date={selected} />}

      {months(plan.startDate, lastExam).map((first) => {
        const [y, m] = first.split('-').map(Number)
        const daysInMonth = new Date(y, m, 0).getDate()
        const blanks = weekday(first)
        return (
          <div key={first} className="card mt-3">
            <p className="mb-2 font-bold">
              {y}年{m}月
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
                <span key={w} className="muted">
                  {w}
                </span>
              ))}
              {Array.from({ length: blanks }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const date = addDays(first, i)
                const inPlan = date >= plan.startDate && date <= last
                const past = date < today
                const status = inPlan && (past || date === today) ? dayStatus(plan, logs, date) : null
                const show = status && (past || isComplete(status))
                const style = show ? STATUS_STYLE[status] : 'bg-slate-100 dark:bg-slate-800'
                const ring = date === today ? 'ring-2 ring-indigo-500' : examDates.has(date) ? 'ring-2 ring-rose-500' : ''
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!inPlan || date > today}
                    onClick={() => setSelected(date)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${style} ${ring} ${
                      !inPlan && !examDates.has(date) ? 'opacity-40' : ''
                    }`}
                  >
                    {i + 1}
                    {examDates.has(date) && <span className="text-[9px] leading-none font-bold">試験</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
