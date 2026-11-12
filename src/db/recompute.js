import { db, getAllSettings, setSetting } from './runDatabase.js'
import { calcTrimp } from '../utils/runAnalytics.js'

const BATCH = 50

/** Hitung ulang TRIMP semua aktivitas dari stream (atau avgHr), 50 aktivitas per transaksi. */
export async function recalculateAllTrimp(onProgress) {
  const profile = await getAllSettings()
  const ids = await db.activities.toCollection().primaryKeys()
  let done = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    await db.transaction('rw', db.activities, db.streams, async () => {
      const [acts, streams] = await Promise.all([db.activities.bulkGet(chunk), db.streams.bulkGet(chunk)])
      for (let j = 0; j < chunk.length; j += 1) {
        if (!acts[j]) continue
        await db.activities.update(chunk[j], { trimp: calcTrimp(acts[j], streams[j]?.records, profile) })
      }
    })
    done += chunk.length
    onProgress?.(done, ids.length)
  }
  await setSetting('trimpStale', false)
  return { total: ids.length }
}
