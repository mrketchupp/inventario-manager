import { useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-gray-400 hover:text-white p-1"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Inventario Pozo</h1>
        </div>
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
        {/* Sidebar - desktop */}
        <nav className="hidden md:flex flex-col w-48 bg-gray-900 border-r border-gray-800 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                activePage === tab.id
                  ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Mobile menu overlay */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <nav className="absolute left-0 top-0 bottom-0 w-56 bg-gray-900 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-white font-bold">Navegación</h2>
              </div>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { onNavigate(tab.id); setMenuOpen(false) }}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activePage === tab.id
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden flex bg-gray-900 border-t border-gray-800 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              activePage === tab.id ? 'text-blue-400' : 'text-gray-500'
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
