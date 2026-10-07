import { useRef, useState } from 'react'
import { SectionTitle, type AppCtx } from '../components/ui'
import { DEFAULT_PLAN } from '../data/plan'
import { exportBackup, importBackup, saveSetting } from '../db'
import { formatMD, toDateStr } from '../lib/date'
import { deruTargetEnd } from '../lib/deru'
import { kinfreTargetEnd } from '../lib/kinfre'

const isStandalone =
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches

async function shareOrDownload(name: string, text: string) {
  const file = new File([text], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch {
      // 共有をキャンセルしたときは何もしない
    }
    return
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function SettingsView({ ctx }: { ctx: AppCtx }) {
  const { plan } = ctx
  const [deruTotal, setDeruTotal] = useState(String(plan.deru.total))
  const fileRef = useRef<HTMLInputElement>(null)

  const saveDeruTotal = () => {
    const n = Number(deruTotal)
    if (Number.isInteger(n) && n > 0) saveSetting('deruTotal', n === DEFAULT_PLAN.deru.total ? undefined : n)
    else setDeruTotal(String(plan.deru.total))
  }

  const onImport = async (file: File) => {
    if (!confirm('今の記録をすべて消して、バックアップの内容に置き換えます。よろしいですか？')) return
    try {
      await importBackup(await file.text())
      alert('読み込みました')
    } catch (e) {
      alert(`読み込めませんでした：${e instanceof Error ? e.message : e}`)
    }
  }

  return (
    <div>
      <h1 className="px-1 text-2xl font-bold">設定</h1>

      {!isStandalone && (
        <>
          <SectionTitle>ホーム画面に追加する</SectionTitle>
          <div className="card text-sm">
            <ol className="list-decimal space-y-1 pl-5">
              <li>この画面を iPhone の Safari で開く</li>
              <li>下の共有ボタン（□に↑）をタップ</li>
              <li>「ホーム画面に追加」を選ぶ</li>
              <li>以後はホーム画面の「TOEIC600」から開く</li>
            </ol>
            <p className="mt-2 muted">Safari で開いた画面とホーム画面のアプリでは記録が別々になるので、必ずホーム画面から使ってください。</p>
          </div>
        </>
      )}

      <SectionTitle>毎晩の呼び出し（iPhone のリマインダー）</SectionTitle>
      <div className="card text-sm">
        <ol className="list-decimal space-y-1 pl-5">
          <li>iPhone の「リマインダー」アプリを開く</li>
          <li>「TOEIC：アプリを開いて4つチェック」というリマインダーを作る</li>
          <li>「日付」と「時刻」をオンにして、始める時刻（例：21:00）にする</li>
          <li>「繰り返し」を「毎日」にする</li>
        </ol>
        <p className="mt-2 muted">通知が来たら、ホーム画面の「TOEIC600」を開いてください。宣言した時刻が普段と違う日は、そのリマインダーの時刻も変えておくと確実です。</p>
      </div>

      <SectionTitle>計画</SectionTitle>
      <div className="card space-y-4 text-sm">
        <label className="block">
          <span className="font-bold">開始日</span>
          <input
            type="date"
            className="input mt-1"
            value={plan.startDate}
            onChange={(e) => {
              const v = e.target.value
              if (v && confirm(`開始日を ${formatMD(v)} に変えますか？ 金フレとでる1000問の予定がずれます。`)) {
                saveSetting('startDate', v === DEFAULT_PLAN.startDate ? undefined : v)
              }
            }}
          />
        </label>
        <label className="block">
          <span className="font-bold">でる1000問の総問題数</span>
          <input
            type="number"
            inputMode="numeric"
            className="input mt-1"
            value={deruTotal}
            onChange={(e) => setDeruTotal(e.target.value)}
            onBlur={saveDeruTotal}
          />
          <span className="mt-1 block muted">本の実際の問題数に合わせてください</span>
        </label>
        <div className="muted">
          <p>金フレを全部覚える予定日：{formatMD(kinfreTargetEnd(plan))}</p>
          <p>でる1000問の1周目が終わる予定日：{formatMD(deruTargetEnd(plan))}</p>
          <p>
            試験：{plan.exams.map((e) => `${e.label} ${formatMD(e.date)}`).join('、')}
          </p>
        </div>
      </div>

      <SectionTitle>バックアップ</SectionTitle>
      <div className="card space-y-3 text-sm">
        <p className="muted">記録はこの iPhone の中だけに保存されています。機種変更や Safari のデータ消去に備えて、ときどき書き出してください（ファイルAppに保存できます）。</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => shareOrDownload(`toeic-backup-${toDateStr(new Date())}.json`, await exportBackup())}
          >
            書き出す
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
            読み込む
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImport(f)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
