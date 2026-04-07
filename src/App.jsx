import { useState, useEffect } from 'react'
import { InventoryProvider, useInventory } from './context/InventoryContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import PhysicalCount from './pages/PhysicalCount'
import SizeColorCorrection from './pages/SizeColorCorrection'
import Comparison from './pages/Comparison'
import Settings from './pages/Settings'

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
      {page === 'correction' && <SizeColorCorrection />}
      {page === 'comparison' && <Comparison />}
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
