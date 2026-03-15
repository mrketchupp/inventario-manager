export default function ProgressBar({ reviewed, total, label }) {
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0
  return (
    <div className="w-full">
      {label && <div className="text-xs text-gray-400 mb-1">{label}</div>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? '#22c55e' : pct > 50 ? '#3b82f6' : '#f59e0b',
            }}
          />
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">{reviewed}/{total} ({pct}%)</span>
      </div>
    </div>
  )
}
