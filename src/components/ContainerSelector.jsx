export default function ContainerSelector({ container, type, onContainerChange, onTypeChange, materialCounts }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => {
          const count = materialCounts?.[`${n}-${type}`] || 0
          return (
            <button
              key={n}
              onClick={() => onContainerChange(n)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors relative ${
                container === n
                  ? 'bg-blue-600 text-white'
                  : count > 0
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
              }`}
            >
              #{n}
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gray-600 text-[10px] text-gray-300 rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex gap-1 bg-gray-800 rounded p-0.5">
        {['inventariable', 'consumible'].map(t => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className={`px-3 py-1 rounded text-sm font-medium capitalize transition-colors ${
              type === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
