import type { ReactNode } from 'react'
import type { Plan } from '../data/plan'
import type { DateStr } from '../lib/date'
import type { DayLog } from '../lib/types'

export interface AppCtx {
  plan: Plan
  logs: DayLog[]
  today: DateStr
  now: Date
}

export function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
        on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
      }`}
    >
      {on && (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

export function Bar({ value, max, className = 'bg-indigo-500' }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export const LEVEL_TEXT = {
  green: 'text-emerald-600 dark:text-emerald-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  red: 'text-rose-600 dark:text-rose-400',
} as const

export const LEVEL_BG = {
  green: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900',
  yellow: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900',
  red: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900',
} as const

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 mb-2 px-1 text-sm font-bold muted">{children}</h2>
}
