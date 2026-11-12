import { describe, it, expect } from 'vitest'
import {
  fastestWindow, bestEffortFromRecords, bestEffortFromSummary, collectBestEfforts, personalBests, pbHistory,
  riegelTime, riegelCandidates, defaultRiegelReference, riegelPredict, splitsPerKm, cardiacDrift, buildSeries,
} from '../utils/runAnalytics.js'
import { profileStream, constStream } from './helpers/streams.js'

describe('best effort', () => {
  it('stream 4 m/s sepanjang 6.000 m: 5K = 1250 detik', () => {
    const r = bestEffortFromRecords(constStream(6000), 5000)
    expect(r.timeSec).toBeCloseTo(1250, 6)
    expect(r.paceSec).toBeCloseTo(250, 6)
  })
  it('stream 3.000 m: tidak ada kandidat 5K', () => expect(bestEffortFromRecords(constStream(3000), 5000)).toBeNull())
  it('menemukan 5K tercepat di tengah sesi, termasuk batas di antara dua sampel', () => {
    // 2.000 m pertama 3 m/s (batas jatuh di antara sampel), lalu 5,5 km pada 5 m/s
    const recs = profileStream([{ secs: 667, speed: 3, hr: 140 }, { secs: 1100, speed: 5, hr: 160 }])
    expect(bestEffortFromRecords(recs, 5000).timeSec).toBeCloseTo(1000, 6)
  })
  it('jeda tidak dihitung sebagai waktu bergerak', () => {
    const recs = profileStream([{ secs: 600, speed: 4, hr: 150 }, { pause: 60 }, { secs: 900, speed: 4, hr: 150 }])
    expect(bestEffortFromRecords(recs, 5000).timeSec).toBeCloseTo(1250, 6)
  })
  it('fastestWindow membuang sampel yang jarak kumulatifnya turun (noise)', () => {
    const dist = [0, 100, 90, 200, 300, 400, 500]
    const time = [0, 10, 11, 20, 30, 40, 50]
    expect(fastestWindow(dist, time, 400)).toBeCloseTo(40, 6)
  })
  it('jendela terbaik dimulai tepat di sampel dan berakhir di antara dua sampel', () => {
    // Jendela 1.500 m: mulai 0 m (t=0) berakhir 1.500 m (t=200, diinterpolasi) = 200 detik.
    // Jendela yang berakhir tepat di sampel paling cepat 250 detik, jadi hanya penelusuran dari awal yang menemukannya.
    expect(fastestWindow([0, 1000, 2000, 3000], [0, 100, 300, 700], 1500)).toBeCloseTo(200, 6)
  })
  it('jendela terbaik berakhir tepat di sampel dan dimulai di antara dua sampel', () => {
    // Cermin kasus di atas: lambat dulu lalu cepat.
    expect(fastestWindow([0, 1000, 2000, 3000], [0, 400, 600, 700], 1500)).toBeCloseTo(200, 6)
  })
  it('kalibrasi ke jarak sesi bila selisih kecil', () => {
    const recs = profileStream([{ secs: 1500, speed: 3.995, hr: 150 }]) // terintegrasi 5992,5 m
    expect(bestEffortFromRecords(recs, 5000, 6000).timeSec).toBeCloseTo(1250, 0)
  })
  it('aktivitas manual: kandidat hanya pada [0,995 D, 1,02 D], waktu diskalakan, ditandai perkiraan', () => {
    const act = (km) => ({ distanceKm: km, durationSec: 1500 })
    expect(bestEffortFromSummary(act(5.02), 5000).timeSec).toBeCloseTo((1500 * 5000) / 5020, 6)
    expect(bestEffortFromSummary(act(4.9), 5000)).toBeNull()
    expect(bestEffortFromSummary(act(5.11), 5000)).toBeNull()
    expect(bestEffortFromSummary(act(4.98), 5000)).toBeTruthy()
  })
})

describe('collectBestEfforts, PB, riwayat PB', () => {
  const mk = (id, date, ms, km, sec, type, stream) => ({
    activity: { id, date, startTimeMs: ms, distanceKm: km, durationSec: sec, workoutType: type, title: `Lari ${id}` },
    records: stream ?? null,
  })
  const items = [
    mk(1, '2026-09-01', 1, 5.0, 1560, 'Easy Run'),
    mk(2, '2026-10-01', 2, 5.0, 1500, 'Race'),
    mk(3, '2026-10-20', 3, 5.0, 1530, 'Tempo'),
    mk(4, '2026-11-01', 4, 5.0, 1480, 'Easy Run'),
    mk(5, '2026-11-05', 5, 6.0, 0, 'Easy Run', constStream(6000)),
  ]
  const efforts = collectBestEfforts(items)
  it('mengumpulkan kandidat; manual berstatus perkiraan, stream tidak', () => {
    expect(efforts).toHaveLength(5)
    expect(efforts.find((e) => e.activityId === 5).estimated).toBe(false)
    expect(efforts.find((e) => e.activityId === 4).estimated).toBe(true)
  })
  it('PB = waktu terkecil per jarak; jarak tanpa kandidat = null', () => {
    const pb = personalBests(efforts)
    expect(pb['5K'].activityId).toBe(5)
    expect(pb['5K'].timeSec).toBeCloseTo(1250, 6)
    expect(pb['10K']).toBeNull()
  })
  it('toggle hanya sesi Race', () => {
    const race = collectBestEfforts(items, { raceOnly: true })
    expect(race).toHaveLength(1)
    expect(personalBests(race)['5K'].activityId).toBe(2)
  })
  it('riwayat PB mencatat tiap rekor yang terpecahkan, berurutan waktu', () => {
    expect(pbHistory(efforts, '5K').map((e) => e.activityId)).toEqual([1, 2, 4, 5])
  })
})

describe('Riegel', () => {
  it('D1 = 5.000 m, T1 = 1500 detik: 10K = 3127 detik (52:07, toleransi 1 detik)', () => {
    expect(Math.abs(riegelTime(1500, 5000, 10000, 1.06) - 3127)).toBeLessThanOrEqual(1)
  })
  it('prediksi semua jarak dan peringatan bila D2/D1 > 2', () => {
    const p = riegelPredict({ timeSec: 1500, distanceM: 5000 }, 1.06)
    const by = Object.fromEntries(p.map((x) => [x.key, x]))
    expect(by['5K'].timeSec).toBeCloseTo(1500, 6)
    expect(Math.abs(by['10K'].timeSec - 3127)).toBeLessThanOrEqual(1)
    expect(Math.abs(by['21.1K'].timeSec - 6900.3)).toBeLessThanOrEqual(1)
    expect(Math.abs(by['42.2K'].timeSec - 14386.7)).toBeLessThanOrEqual(1)
    expect([by['5K'].unreliable, by['10K'].unreliable, by['21.1K'].unreliable, by['42.2K'].unreliable]).toEqual([false, false, true, true])
    expect(riegelPredict(null)).toEqual([])
  })
  it('eksponen k mengubah hasil', () => {
    expect(riegelTime(1500, 5000, 10000, 1.1)).toBeGreaterThan(riegelTime(1500, 5000, 10000, 1.06))
    expect(riegelTime(1500, 0, 10000)).toBeNull()
  })
  it('kandidat referensi: 90 hari terakhir, terbaru dulu; default terbaru dengan D >= 5 km', () => {
    const e = (id, date, ms, key, d) => ({ activityId: id, date, startTimeMs: ms, key, distanceM: d, timeSec: 1 })
    const efforts = [e(1, '2026-06-01', 1, '5K', 5000), e(2, '2026-10-01', 2, '5K', 5000), e(3, '2026-11-01', 3, '5K', 5000), e(3, '2026-11-01', 3, '10K', 10000)]
    const c = riegelCandidates(efforts, '2026-11-12')
    expect(c.map((x) => `${x.activityId}-${x.key}`)).toEqual(['3-10K', '3-5K', '2-5K'])
    expect(defaultRiegelReference(c).key).toBe('10K')
    expect(defaultRiegelReference([])).toBeNull()
  })
})

describe('split per km', () => {
  it('4 m/s sepanjang 2.500 m: dua km penuh dan km terakhir berlabel jarak aktual', () => {
    const s = splitsPerKm(constStream(2500, 4, { altPerM: 0.01 }))
    expect(s).toHaveLength(3)
    expect(s.map((x) => x.label)).toEqual(['1', '2', '0.50 km'])
    expect(s[0].timeSec).toBeCloseTo(250, 6)
    expect(s[0].paceSec).toBeCloseTo(250, 6)
    expect(s[2].timeSec).toBeCloseTo(125, 6)
    expect(s[2].paceSec).toBeCloseTo(250, 6)
    expect(s[2].partial).toBe(true)
    expect(s[0].avgHr).toBeCloseTo(150, 6)
    expect(s[1].elevDelta).toBeCloseTo(10, 0)
  })
  it('sisa kurang dari 10 m tidak dibuat split sendiri', () => expect(splitsPerKm(constStream(2004, 4))).toHaveLength(2))
  it('tanpa jarak (stream kosong atau diam) menghasilkan daftar kosong', () => {
    expect(splitsPerKm([])).toEqual([])
    expect(splitsPerKm(profileStream([{ secs: 60, speed: 0, hr: 100 }]))).toEqual([])
  })
  it('waktu split memakai waktu bergerak (jeda dibuang)', () => {
    const recs = profileStream([{ secs: 100, speed: 4, hr: 150 }, { pause: 120 }, { secs: 400, speed: 4, hr: 150 }])
    const s = splitsPerKm(recs)
    expect(s[0].timeSec).toBeCloseTo(250, 6)
  })
  it('elevDelta null bila tidak ada altitude', () => {
    const recs = constStream(1500).map((r) => ({ ...r, alt: null }))
    expect(splitsPerKm(recs)[0].elevDelta).toBeNull()
  })
})

describe('cardiac drift', () => {
  const act = { workoutType: 'Long Run', distanceKm: 10.8 }
  const run = (hr2) => profileStream([{ secs: 600, speed: 3, hr: 130 }, { secs: 1500, speed: 3, hr: 140 }, { secs: 1500, speed: 3, hr: hr2 }])
  it('HR naik 140 ke 154 pada kecepatan sama: drift 9,09% dan diberi label', () => {
    const d = cardiacDrift(act, run(154))
    expect(d.driftPct).toBeCloseTo(9.0909, 3)
    expect(d.ef1).toBeCloseTo(180 / 140, 6)
    expect(d.warning).toBe('ketahanan aerobik perlu diperhatikan')
  })
  it('drift kecil tidak diberi label', () => {
    const d = cardiacDrift(act, run(144))
    expect(d.driftPct).toBeCloseTo(2.7778, 3)
    expect(d.warning).toBeNull()
  })
  it('syarat tidak terpenuhi: null', () => {
    expect(cardiacDrift({ ...act, workoutType: 'Tempo' }, run(154))).toBeNull()
    expect(cardiacDrift(act, profileStream([{ secs: 1800, speed: 3, hr: 140 }]))).toBeNull()
    expect(cardiacDrift(act, run(154).map((r) => ({ ...r, hr: null })))).toBeNull()
    expect(cardiacDrift(act, run(154).map((r) => ({ ...r, speed: null })))).toBeNull()
    expect(cardiacDrift(act, null)).toBeNull()
  })
})

describe('buildSeries', () => {
  it('tanpa speed memakai jarak GPS; dt <= 0 diabaikan', () => {
    const recs = [{ t: 0, lat: 0, lng: 0 }, { t: 10, lat: 0.0001, lng: 0 }, { t: 10, lat: 0.5, lng: 0 }, { t: 20, lat: 0.0002, lng: 0 }]
    const s = buildSeries(recs)
    expect(s.t).toEqual([0, 10, 20])
    expect(s.dist[2]).toBeCloseTo(22.24, 1)
  })
})
