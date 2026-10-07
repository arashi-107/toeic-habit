import Dexie, { type EntityTable } from 'dexie'
import type { UserSettings } from './data/plan'
import type { DateStr } from './lib/date'
import { emptyLog, type DayLog } from './lib/types'

interface SettingRow {
  key: keyof UserSettings
  value: unknown
}

class AppDB extends Dexie {
  logs!: EntityTable<DayLog, 'date'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor() {
    super('toeic-habit')
    // スキーマを変えるときは version を上げ、既存データを消さないように upgrade を書く
    this.version(1).stores({ logs: 'date', settings: 'key' })
  }
}

export const db = new AppDB()

export async function updateLog(date: DateStr, patch: Partial<DayLog> | ((log: DayLog) => Partial<DayLog>)) {
  await db.transaction('rw', db.logs, async () => {
    const current = (await db.logs.get(date)) ?? emptyLog(date)
    const p = typeof patch === 'function' ? patch(current) : patch
    await db.logs.put({ ...current, ...p, date })
  })
}

export async function loadSettings(): Promise<UserSettings> {
  const rows = await db.settings.toArray()
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as UserSettings
}

export async function saveSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
  if (value === undefined) await db.settings.delete(key)
  else await db.settings.put({ key, value })
}

interface Backup {
  app: 'toeic-habit'
  version: 1
  exportedAt: string
  logs: DayLog[]
  settings: UserSettings
}

export async function exportBackup(): Promise<string> {
  const backup: Backup = {
    app: 'toeic-habit',
    version: 1,
    exportedAt: new Date().toISOString(),
    logs: await db.logs.toArray(),
    settings: await loadSettings(),
  }
  return JSON.stringify(backup, null, 2)
}

export async function importBackup(json: string) {
  const data = JSON.parse(json) as Backup
  if (data.app !== 'toeic-habit' || !Array.isArray(data.logs)) throw new Error('このアプリのバックアップファイルではありません')
  await db.transaction('rw', db.logs, db.settings, async () => {
    await db.logs.clear()
    await db.settings.clear()
    await db.logs.bulkPut(data.logs.map((l) => ({ ...emptyLog(l.date), ...l })))
    await db.settings.bulkPut(Object.entries(data.settings ?? {}).map(([key, value]) => ({ key: key as keyof UserSettings, value })))
  })
}
