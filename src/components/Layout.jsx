import { useInventory } from '../context/InventoryContext'

const TABS = [
  { id: 'home', label: 'Inicio', icon: '📋' },
  { id: 'count', label: 'Conteo', icon: '🔢' },
  { id: 'correction', label: 'Corrección', icon: '🔧' },
  { id: 'comparison', label: 'Comparación', icon: '📊' },
  { id: 'settings', label: 'Ajustes', icon: '⚙️' },
]

export default function Layout({ activePage, onNavigate, children }) {
  const { undo, canUndo } = useInventory()

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-white">Inventario Pozo</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              canUndo
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
            title="Deshacer (Ctrl+Z)"
          >
            ↩ Deshacer
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop only */}
        <nav className="hidden md:flex flex-col w-48 bg-gray-900 border-r border-gray-800 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                tab.disabled
                  ? 'text-gray-600 cursor-default'
                  : activePage === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.disabled && <span className="text-[10px] text-gray-600 ml-auto">Pronto</span>}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav - mobile, fixed at bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-gray-900 border-t border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              tab.disabled
                ? 'text-gray-700'
                : activePage === tab.id ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
