import { useState, type ReactNode } from 'react'
import { updateLog } from '../db'
import { formatMD, type DateStr } from '../lib/date'
import { deruToday } from '../lib/deru'
import { describeRanges, kinfreToday, totalWords } from '../lib/kinfre'
import { listeningToday } from '../lib/listening'
import { kinfrePace } from '../lib/progress'
import type { Mode } from '../lib/types'
import { CheckCircle, type AppCtx } from './ui'

const LISTENING_STEPS = [
  '解く（3分）：音声だけで解く。Part 3・4 は先に設問を読んでから聞く',
  '答え合わせ（4分）：スクリプトを読み、聞き取れなかった部分に線を引く',
  'スクリプトを見ながら聞く（3分）：線の部分が実際にどう聞こえるか確かめる',
  'オーバーラッピング（5分）：スクリプトを見ながら音声と同時に声に出す ×3回',
  'シャドーイング（5分）：スクリプトを見ずに少し後を追いかけて声に出す ×2〜3回（速ければ0.8倍速）',
]

function TaskCard({
  done,
  onToggle,
  label,
  title,
  children,
}: {
  done: boolean
  onToggle: () => void
  label: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className={`card transition ${done ? 'opacity-70' : ''}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 text-left">
        <CheckCircle on={done} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-indigo-600 dark:text-indigo-400">{label}</span>
          <span className={`block font-bold leading-snug ${done ? 'line-through decoration-2' : ''}`}>{title}</span>
        </span>
      </button>
      {children && <div className="mt-2 pl-11 text-sm">{children}</div>}
    </div>
  )
}

/** その日のノルマ（金フレ2項目・でる1000問・リスニング）のチェック */
export function DayTasks({ ctx, date }: { ctx: AppCtx; date: DateStr }) {
  const { plan, logs } = ctx
  const log = logs.find((l) => l.date === date)
  const mode: Mode = log?.mode ?? 'standard'
  const k = kinfreToday(plan, logs, date)
  const d = deruToday(plan, logs, date, mode)
  const li = listeningToday(plan, logs, date, mode)
  const pace = kinfrePace(plan, logs, date)
  const sections = plan.kinfre.sections
  const total = totalWords(plan)
  const [showSteps, setShowSteps] = useState(false)

  const setMode = (m: Mode) => updateLog(date, { mode: m })
  const toggleReview = () => updateLog(date, (l) => ({ reviewDone: !l.reviewDone }))
  const toggleMain = () =>
    updateLog(date, (l) =>
      k.main.kind === 'new'
        ? { kinfreNew: l.kinfreNew > 0 ? 0 : k.main.words }
        : { kinfreTotal: l.kinfreTotal > 0 ? 0 : k.main.words },
    )
  const extraNew = Math.min(plan.kinfre.dailyNew, total - k.learned)
  const addExtra = () => updateLog(date, (l) => ({ kinfreNew: l.kinfreNew + extraNew }))
  const removeExtra = () => updateLog(date, (l) => ({ kinfreNew: Math.max(plan.kinfre.dailyNew, l.kinfreNew - plan.kinfre.dailyNew) }))
  const toggleDeru = () => updateLog(date, (l) => ({ deru: d.checked ? 0 : Math.max(l.deru, d.quota) }))
  const stepDeru = (n: number) => updateLog(date, (l) => ({ deru: Math.max(0, l.deru + n) }))
  const toggleListening = () => updateLog(date, (l) => ({ listeningDone: !l.listeningDone }))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {(
          [
            ['standard', '標準'],
            ['minimum', '忙しい日（最低ライン）'],
          ] as const
        ).map(([m, text]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              mode === m ? 'bg-white shadow-sm dark:bg-slate-700' : 'muted'
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {k.review && (
        <TaskCard
          done={k.reviewDone}
          onToggle={toggleReview}
          label="金フレ①　前日の分を復習"
          title={describeRanges(sections, k.review.ranges)}
        >
          <p className="muted">
            {formatMD(k.review.date)}にやった{k.review.words}語をもう一度
          </p>
        </TaskCard>
      )}

      <TaskCard
        done={k.mainDone}
        onToggle={toggleMain}
        label={k.main.kind === 'new' ? `金フレ${k.review ? '②' : ''}　今日の新しい${k.main.words}語` : `金フレ${k.review ? '②' : ''}　総復習 ${k.main.words}語`}
        title={describeRanges(sections, k.main.ranges)}
      >
        <p className="muted">音声を流して、発音を口に出しながら</p>
        {k.main.kind === 'new' && k.mainDone && extraNew > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={addExtra} className="btn-ghost py-2 text-sm">
              {pace.behind > 0 ? `借金返済：さらに${extraNew}語やった` : `先取り：さらに${extraNew}語やった`}
            </button>
            {(log?.kinfreNew ?? 0) > plan.kinfre.dailyNew && (
              <button type="button" onClick={removeExtra} className="text-sm underline muted">
                1回分取り消す
              </button>
            )}
          </div>
        )}
      </TaskCard>

      <TaskCard
        done={d.checked}
        onToggle={toggleDeru}
        label={`でる1000問　${d.quota}問`}
        title={d.firstPass ? `${d.from}〜${d.to}問目` : '1周目で間違えた問題の解き直し'}
      >
        <div className="flex items-center gap-3">
          <span className="muted">今日解いた数</span>
          <button type="button" onClick={() => stepDeru(-1)} className="btn-ghost h-9 w-9 p-0" aria-label="1問減らす">
            −
          </button>
          <span className="w-10 text-center text-lg font-bold tabular-nums">{d.doneToday}</span>
          <button type="button" onClick={() => stepDeru(1)} className="btn-ghost h-9 w-9 p-0" aria-label="1問増やす">
            ＋
          </button>
        </div>
      </TaskCard>

      {li && (
        <TaskCard
          done={li.done}
          onToggle={toggleListening}
          label={li.phase.mock ? `${li.phase.title}` : `リスニング　${li.repeatOnly ? '10分' : '20分'}`}
          title={li.item}
        >
          {li.phase.mock ? (
            <p className="muted">本番と同じように時間を計り、途中で止めずに解く。答え合わせまでやる。</p>
          ) : li.repeatOnly ? (
            <p className="muted">前回の音声で、オーバーラッピング ×3回 と シャドーイング ×2回 だけやる</p>
          ) : (
            <>
              <button type="button" onClick={() => setShowSteps((v) => !v)} className="text-indigo-600 underline dark:text-indigo-400">
                {showSteps ? 'やり方を閉じる' : 'やり方を見る'}
              </button>
              {showSteps && (
                <ol className="mt-2 list-decimal space-y-1 pl-5 muted">
                  {LISTENING_STEPS.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              )}
            </>
          )}
        </TaskCard>
      )}
    </div>
  )
}
