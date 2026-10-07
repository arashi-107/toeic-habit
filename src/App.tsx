import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { AppCtx } from './components/ui'
import { buildPlan, type UserSettings } from './data/plan'
import { db } from './db'
import { studyDate } from './lib/date'
import { unexplainedDays } from './lib/status'
import { CalendarView } from './views/CalendarView'
import { ProgressView } from './views/ProgressView'
import { SettingsView } from './views/SettingsView'
import { SkipGate } from './views/SkipGate'
import { TodayView } from './views/TodayView'

type Tab = 'today' | 'progress' | 'calendar' | 'settings'

const TABS: [Tab, string][] = [
  ['today', '今日'],
  ['progress', '進捗'],
  ['calendar', 'カレンダー'],
  ['settings', '設定'],
]

/** 日付の切り替わりや宣言時刻を反映するため、現在時刻を定期的に更新する */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return now
}

export default function App() {
  const now = useNow()
  const logs = useLiveQuery(() => db.logs.toArray())
  const settingRows = useLiveQuery(() => db.settings.toArray())
  const [tab, setTab] = useState<Tab>('today')

  if (!logs || !settingRows) return null

  const settings = Object.fromEntries(settingRows.map((r) => [r.key, r.value])) as UserSettings
  const plan = buildPlan(settings)
  // 開発中だけ ?today=YYYY-MM-DD で日付を指定して表示を確認できる
  const debugToday = import.meta.env.DEV ? new URLSearchParams(location.search).get('today') : null
  const ctx: AppCtx = { plan, logs, today: debugToday ?? studyDate(now, plan.cutoffHour), now }
  const pending = unexplainedDays(plan, logs, ctx.today)

  return (
    <div className="min-h-dvh">
      <main className="pt-safe mx-auto max-w-md px-4 pb-28">
        {tab === 'today' && (pending.length > 0 ? <SkipGate ctx={ctx} days={pending} /> : <TodayView ctx={ctx} />)}
        {tab === 'progress' && <ProgressView ctx={ctx} />}
        {tab === 'calendar' && <CalendarView ctx={ctx} />}
        {tab === 'settings' && <SettingsView ctx={ctx} />}
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                window.scrollTo(0, 0)
              }}
              className={`relative py-3 text-sm font-bold ${tab === t ? 'text-indigo-600 dark:text-indigo-400' : 'muted'}`}
            >
              {label}
              {t === 'today' && pending.length > 0 && (
                <span className="absolute top-2 right-1/4 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
