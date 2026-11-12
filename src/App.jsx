import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarCheck, History, Home, Menu, Plus, Settings, User } from 'lucide-react'
import GlassCard from './components/ui/GlassCard'
import GradientDefs from './components/ui/GradientDefs'
import Button from './components/ui/Button'
import BottomNav from './components/ui/BottomNav'
import RunFileUploader from './components/RunFileUploader'
import ManualRunModal from './components/ManualRunModal'
import ProfileSettings from './components/ProfileSettings'
import { db } from './db/runDatabase'
import { formatPace } from './utils/dateUtils'

const NAV = [
  { id: 'home', label: 'Beranda', icon: Home },
  { id: 'program', label: 'Program', icon: CalendarCheck },
  { id: 'history', label: 'Riwayat', icon: History },
  { id: 'backup', label: 'Backup', icon: Settings },
]

function Header() {
  return (
    <header className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-accent-cyan bg-surface">
        <User size={24} strokeWidth={1.75} className="text-accent-cyan" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="text-base font-semibold">Pelari</p>
        <p className="text-sm text-text-muted">
          Latihan <span className="text-accent-cyan">Lari</span>
        </p>
      </div>
      <button type="button" aria-label="Menu" className="grid h-11 w-11 place-items-center rounded-full">
        <Menu size={24} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </header>
  )
}

// Daftar sementara untuk memeriksa hasil simpan; digantikan RunHistoryWithModal di Fase 4.
function RecentRuns() {
  const rows = useLiveQuery(() => db.activities.orderBy('startTimeMs').reverse().limit(5).toArray(), [])
  return (
    <GlassCard>
      <h2 className="text-lg font-semibold">Lari terakhir</h2>
      {rows === undefined ? (
        <p className="mt-2 text-sm text-text-muted">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">
          Belum ada aktivitas. Unggah file .fit atau .gpx dari jam larimu, atau catat lari lewat Input Manual.
          Semua data tersimpan di perangkat ini.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-surface-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.title || 'Lari'}</p>
                <p className="text-text-muted">{r.date} · {r.distanceCategory ?? '—'}</p>
              </div>
              <p className="shrink-0 text-right tabular-nums">
                {r.distanceKm.toFixed(2).replace('.', ',')} km
                <span className="block text-text-muted">{formatPace(r.avgPaceSec)} /km</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}

function ComingSoon({ title, phase }) {
  return (
    <GlassCard>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-text-muted">Bagian ini dibangun pada Fase {phase}.</p>
    </GlassCard>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [manualOpen, setManualOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return undefined
    const id = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(id)
  }, [notice])

  return (
    <div className="min-h-dvh bg-app lg:pl-20">
      <GradientDefs />
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 p-4 pb-28 lg:max-w-5xl lg:pb-8">
        <Header />
        {notice && (
          <p role="status" className="rounded-xl border border-ok p-3 text-sm text-ok">{notice}</p>
        )}
        {tab === 'home' && (
          <>
            <GlassCard className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Catat lari</h2>
                <p className="text-sm text-text-muted">Untuk lari tanpa file, mis. treadmill.</p>
              </div>
              <Button onClick={() => setManualOpen(true)}>
                <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
                Input manual
              </Button>
            </GlassCard>
            <RunFileUploader />
            <RecentRuns />
          </>
        )}
        {tab === 'program' && <ComingSoon title="Program latihan" phase={7} />}
        {tab === 'history' && <ComingSoon title="Riwayat lari" phase={4} />}
        {tab === 'backup' && (
          <>
            <ProfileSettings />
            <ComingSoon title="Backup data" phase={5} />
          </>
        )}
      </main>
      <BottomNav items={NAV} active={tab} onChange={setTab} />
      <ManualRunModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaved={(res) => setNotice(res.status === 'saved' ? 'Lari tersimpan' : 'Lari ini sudah ada')}
      />
    </div>
  )
}
