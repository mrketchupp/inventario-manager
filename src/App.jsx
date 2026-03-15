import { useState, useEffect } from 'react'
import { InventoryProvider, useInventory } from './context/InventoryContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import PhysicalCount from './pages/PhysicalCount'
import SizeColorCorrection from './pages/SizeColorCorrection'
import Comparison from './pages/Comparison'
import Settings from './pages/Settings'

function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <div className="text-5xl mb-4">🚧</div>
      <h2 className="text-xl font-semibold text-gray-300 mb-2">{label}</h2>
      <p className="text-sm">Próximamente</p>
    </div>
  )
}

function AppContent() {
  const [page, setPage] = useState('home')
  const { undo } = useInventory()

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo])

  return (
    <Layout activePage={page} onNavigate={setPage}>
      {page === 'home' && <Home onNavigate={setPage} />}
      {page === 'count' && <PhysicalCount />}
      {page === 'correction' && <ComingSoon label="Corrección de Tamaño y Color" />}
      {page === 'comparison' && <ComingSoon label="Comparación de Inventarios" />}
      {page === 'settings' && <Settings />}
    </Layout>
  )
}

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  )
}
