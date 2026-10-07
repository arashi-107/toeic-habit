import { Bar, LEVEL_TEXT, SectionTitle, type AppCtx } from '../components/ui'
import { diffDays, formatMD, type DateStr } from '../lib/date'
import { deruTargetEnd, deruToday } from '../lib/deru'
import { kinfreTargetEnd, kinfreToday, sectionSchedule, totalWords } from '../lib/kinfre'
import type { Pace } from '../lib/pace'
import { deruPace, kinfrePace } from '../lib/progress'

function PaceDetail({ pace, targetEnd, unit }: { pace: Pace; targetEnd: DateStr; unit: string }) {
  if (!pace.started) return <p className="muted">まだ始まっていません</p>
  if (pace.finished) return <p className="font-bold text-emerald-600 dark:text-emerald-400">1周目完了</p>
  const late = pace.projectedEnd ? diffDays(targetEnd, pace.projectedEnd) : null
  return (
    <dl className="space-y-2 text-sm">
      <div>
        <dt className="muted">予定との差（{formatMD(pace.compDate)}時点）</dt>
        <dd className={`text-lg font-bold ${LEVEL_TEXT[pace.level]}`}>
          {pace.behind > 0
            ? `${pace.behind}${unit}（${pace.behindDays.toFixed(1)}日分）遅れ`
            : pace.behind < 0
              ? `${-pace.behind}${unit} 先行`
              : '予定どおり'}
        </dd>
        <dd className="muted">
          予定 {pace.planned}
          {unit} ／ 実績 {pace.planned - pace.behind}
          {unit}
        </dd>
      </div>
      <div>
        <dt className="muted">終わる日の予測（直近7日の平均 1日{pace.avg7.toFixed(1)}{unit}）</dt>
        <dd className="font-bold">
          {pace.projectedEnd ? (
            <>
              {formatMD(pace.projectedEnd)}
              <span className={`ml-2 ${late !== null && late > 0 ? LEVEL_TEXT.red : LEVEL_TEXT.green}`}>
                {late !== null && late > 0 ? `予定より${late}日遅い` : '予定に間に合う'}
              </span>
            </>
          ) : (
            <span className={LEVEL_TEXT.red}>このままでは終わりません</span>
          )}
        </dd>
      </div>
      <div>
        <dt className="muted">挽回ペース（予定 {formatMD(targetEnd)} に終えるには）</dt>
        <dd className="font-bold">
          1日 {pace.catchUpPerDay}
          {unit}
        </dd>
      </div>
    </dl>
  )
}

export function ProgressView({ ctx }: { ctx: AppCtx }) {
  const { plan, logs, today } = ctx
  const total = totalWords(plan)
  const k = kinfreToday(plan, logs, today)
  const kp = kinfrePace(plan, logs, today)
  const mode = logs.find((l) => l.date === today)?.mode ?? 'standard'
  const d = deruToday(plan, logs, today, mode)
  const dp = deruPace(plan, logs, today)
  const deruAll = logs.reduce((s, l) => s + l.deru, 0)

  return (
    <div>
      <h1 className="px-1 text-2xl font-bold">進捗</h1>

      <SectionTitle>金のフレーズ</SectionTitle>
      <div className="card space-y-4">
        <div>
          <p className="text-3xl font-bold tabular-nums">
            {k.learned}
            <span className="text-base font-normal muted"> / {total}語</span>
          </p>
          <div className="mt-2">
            <Bar value={k.learned} max={total} />
          </div>
        </div>
        <PaceDetail pace={kp} targetEnd={kinfreTargetEnd(plan)} unit="語" />
      </div>

      <div className="card mt-3 space-y-3">
        {sectionSchedule(plan).map((s) => {
          const done = Math.max(0, Math.min(s.words, k.learned - s.firstWord + 1))
          return (
            <div key={s.name}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-bold">
                  {s.level && <span className="mr-1 text-xs muted">{s.level}</span>}
                  {s.name}
                </span>
                <span className="tabular-nums muted">
                  {done}/{s.words}
                </span>
              </div>
              <div className="mt-1">
                <Bar value={done} max={s.words} className={done === s.words ? 'bg-emerald-500' : 'bg-indigo-500'} />
              </div>
              <p className="mt-0.5 text-xs muted">
                予定 {formatMD(s.from)}〜{formatMD(s.to)}
              </p>
            </div>
          )
        })}
      </div>

      <SectionTitle>でる1000問</SectionTitle>
      <div className="card space-y-4">
        <div>
          <p className="text-3xl font-bold tabular-nums">
            {d.firstPassDone}
            <span className="text-base font-normal muted"> / {plan.deru.total}問</span>
          </p>
          <div className="mt-2">
            <Bar value={d.firstPassDone} max={plan.deru.total} />
          </div>
          {deruAll > plan.deru.total && <p className="mt-1 text-sm muted">解き直し {deruAll - plan.deru.total}問</p>}
        </div>
        <PaceDetail pace={dp} targetEnd={deruTargetEnd(plan)} unit="問" />
      </div>
    </div>
  )
}
