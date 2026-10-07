import { useState } from 'react'
import { DayTasks } from '../components/DayTasks'
import type { AppCtx } from '../components/ui'
import { db, updateLog } from '../db'
import { addDays, formatMD, type DateStr } from '../lib/date'
import { dayStatus } from '../lib/status'

const REASONS = ['時間がなかった', '疲れて寝てしまった', 'やる気が出なかった', '忘れていた', '予定があった', '体調が悪かった']

/** ノルマが終わっていない日の理由を書くまで、今日の画面に進ませない */
export function SkipGate({ ctx, days }: { ctx: AppCtx; days: DateStr[] }) {
  const { plan, logs, today } = ctx
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [fixYesterday, setFixYesterday] = useState(false)
  const yesterday = addDays(today, -1)
  const text = [reason, detail.trim()].filter(Boolean).join('：')

  const save = async () => {
    await db.transaction('rw', db.logs, async () => {
      for (const d of days) await updateLog(d, { skipReason: text })
    })
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-bold">先に振り返ろう</h1>
        <p className="mt-1 muted">ノルマが終わっていない日があります。理由を書くまで今日の画面には進めません。</p>
      </div>

      <div className="card">
        <ul className="space-y-1">
          {days.map((d) => (
            <li key={d} className="flex justify-between">
              <span className="font-bold">{formatMD(d)}</span>
              <span className="text-rose-600 dark:text-rose-400">
                {dayStatus(plan, logs, d) === 'partial' ? '途中まで' : '何もしていない'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {days.includes(yesterday) &&
        (fixYesterday ? (
          <div className="space-y-2">
            <p className="px-1 font-bold">昨日（{formatMD(yesterday)}）の記録</p>
            <DayTasks ctx={ctx} date={yesterday} />
          </div>
        ) : (
          <button
            type="button"
            className="w-full rounded-xl border-2 border-indigo-200 bg-white py-3 font-bold text-indigo-600 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-400"
            onClick={() => setFixYesterday(true)}
          >
            昨日はやった（記録をつけ忘れた）
          </button>
        ))}

      <div className="card space-y-3">
        <p className="font-bold">なぜできなかった？</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(reason === r ? '' : r)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                reason === r ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          className="input"
          placeholder="次に同じことが起きたらどうする？（例：帰りが遅い日は電車で金フレだけやる）"
        />
        <button type="button" className="btn-primary w-full" disabled={!text} onClick={save}>
          記録して今日の画面へ
        </button>
      </div>
    </div>
  )
}
