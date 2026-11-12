export default function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-surface-border bg-surface px-3 py-1.5">
      {Icon && <Icon size={20} strokeWidth={1.75} className="shrink-0 text-accent-cyan" aria-hidden="true" />}
      <div className="leading-tight">
        <div className="text-sm font-semibold tabular-nums text-text-main">{value ?? '—'}</div>
        <div className="text-xs text-text-muted">{label}</div>
      </div>
    </div>
  )
}
