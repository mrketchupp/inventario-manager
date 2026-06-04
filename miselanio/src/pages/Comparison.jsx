import { useState, useMemo } from 'react'
import { useInventory } from '../context/InventoryContext'
import { normalize, normalizeKey } from '../utils/normalize'
import SortableTable from '../components/SortableTable'
import { exportComparisonReport } from '../utils/excelExporter'

export default function Comparison() {
  const { state, dispatch } = useInventory()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [containerFilter, setContainerFilter] = useState('all')
  const [codeFilter, setCodeFilter] = useState('')

  const results = useMemo(() => {
    if (!state.physicalLoaded || !state.axLoaded) return null

    const physicals = state.physicalInventory.filter(m => m.type === 'inventariable')
    const axItems = state.axInventory
    const corrections = state.corrections.applied

    // Build maps with corrected values
    const physMap = new Map()
    for (const p of physicals) {
      const origKey = `${normalize(p.codigoAx)}|${normalize(p.tamano)}|${normalize(p.color)}`
      const correction = corrections[origKey]
      const tamano = correction?.newTamano ?? p.tamano
      const color = correction?.newColor ?? p.color
      const key = normalizeKey(p.codigoAx, tamano, color)

      if (physMap.has(key)) {
        const existing = physMap.get(key)
        existing.cantidad += (p.cantidad || 0)
        if (!existing.containers.includes(p.container)) existing.containers.push(p.container)
      } else {
        physMap.set(key, {
          codigoAx: p.codigoAx,
          descripcion: p.descripcion,
          tamano,
          color,
          cantidad: p.cantidad || 0,
          containers: [p.container],
        })
      }
    }

    const axMap = new Map()
    for (const ax of axItems) {
      const key = normalizeKey(ax.codigoAx, ax.tamano, ax.color)
      if (axMap.has(key)) {
        axMap.get(key).cantidad += (ax.cantidad || 0)
      } else {
        axMap.set(key, { ...ax })
      }
    }

    const matches = []
    const differences = []
    const onlyPhysical = []
    const onlyAx = []

    const processedAx = new Set()

    for (const [key, phys] of physMap) {
      const ax = axMap.get(key)
      if (ax) {
        processedAx.add(key)
        const diff = phys.cantidad - ax.cantidad
        const item = {
          codigoAx: phys.codigoAx,
          descripcion: phys.descripcion || ax.descripcion,
          tamano: phys.tamano,
          color: phys.color,
          cantidadFisica: phys.cantidad,
          cantidadAx: ax.cantidad,
          diferencia: diff,
          container: phys.containers.join(', '),
          _key: key,
        }
        if (diff === 0) {
          matches.push(item)
        } else {
          differences.push(item)
        }
      } else {
        onlyPhysical.push({
          codigoAx: phys.codigoAx,
          descripcion: phys.descripcion,
          tamano: phys.tamano,
          color: phys.color,
          cantidadFisica: phys.cantidad,
          cantidadAx: null,
          diferencia: null,
          container: phys.containers.join(', '),
          _key: key,
        })
      }
    }

    for (const [key, ax] of axMap) {
      if (!processedAx.has(key)) {
        onlyAx.push({
          codigoAx: ax.codigoAx,
          descripcion: ax.descripcion,
          tamano: ax.tamano,
          color: ax.color,
          cantidadFisica: null,
          cantidadAx: ax.cantidad,
          diferencia: null,
          container: '—',
          _key: key,
        })
      }
    }

    return { matches, differences, onlyPhysical, onlyAx }
  }, [state.physicalInventory, state.axInventory, state.physicalLoaded, state.axLoaded, state.corrections.applied])

  if (!state.physicalLoaded || !state.axLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg mb-2">Datos incompletos</p>
        <p className="text-sm">Carga ambos inventarios desde Inicio</p>
      </div>
    )
  }

  if (!results) return null

  const total = results.matches.length + results.differences.length + results.onlyPhysical.length + results.onlyAx.length

  const categories = [
    { key: 'matches', label: 'Coincidencias', data: results.matches, color: 'green' },
    { key: 'differences', label: 'Diferencias', data: results.differences, color: 'yellow' },
    { key: 'onlyPhysical', label: 'Solo Físico', data: results.onlyPhysical, color: 'blue' },
    { key: 'onlyAx', label: 'Solo AX', data: results.onlyAx, color: 'red' },
  ]

  let allData = []
  for (const cat of categories) {
    if (categoryFilter === 'all' || categoryFilter === cat.key) {
      allData.push(...cat.data.map(d => ({ ...d, estado: cat.label })))
    }
  }

  if (containerFilter !== 'all') {
    allData = allData.filter(d => String(d.container).includes(containerFilter))
  }
  if (codeFilter) {
    allData = allData.filter(d => normalize(d.codigoAx).includes(normalize(codeFilter)))
  }

  const columns = [
    { key: 'codigoAx', label: 'Código AX' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'tamano', label: 'Tamaño' },
    { key: 'color', label: 'Color' },
    { key: 'cantidadFisica', label: 'Cant. Física', render: v => v !== null ? v : '—' },
    { key: 'cantidadAx', label: 'Cant. AX', render: v => v !== null ? v : '—' },
    { key: 'diferencia', label: 'Diferencia', render: (v) => {
      if (v === null || v === undefined) return '—'
      return <span className={v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-400'}>{v > 0 ? '+' : ''}{v}</span>
    }},
    { key: 'container', label: 'Contenedor' },
    { key: 'estado', label: 'Estado', render: (v) => {
      const colors = { 'Coincidencias': 'green', 'Diferencias': 'yellow', 'Solo Físico': 'blue', 'Solo AX': 'red' }
      const c = colors[v] || 'gray'
      return <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${c}-600/20 text-${c}-400`}>{v}</span>
    }},
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Comparación de Inventarios</h2>
        <button
          onClick={() => exportComparisonReport(results)}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-medium transition-colors"
        >
          📥 Exportar Reporte
        </button>
      </div>

      {/* Warning if correction not run */}
      {!state.corrections.hasRun && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-sm">
          ⚠️ La herramienta de Corrección de Tamaño/Color no se ha ejecutado. Los resultados pueden contener falsos negativos por diferencias de formato.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(categoryFilter === cat.key ? 'all' : cat.key)}
            className={`border rounded-lg p-3 text-center transition-colors cursor-pointer border-${cat.color}-500/30 bg-${cat.color}-500/5 ${
              categoryFilter === cat.key ? 'ring-2 ring-white/20' : ''
            }`}
          >
            <div className={`text-2xl font-bold text-${cat.color}-400`}>{cat.data.length}</div>
            <div className="text-xs text-gray-400">{cat.label}</div>
          </button>
        ))}
      </div>

      {/* Visual distribution bar */}
      {total > 0 && (
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-2">Distribución ({total} materiales)</div>
          <div className="flex h-4 rounded-full overflow-hidden">
            {categories.map(cat => {
              const pct = (cat.data.length / total) * 100
              if (pct === 0) return null
              const bgColors = { green: 'bg-green-500', yellow: 'bg-yellow-500', blue: 'bg-blue-500', red: 'bg-red-500' }
              return (
                <div key={cat.key} className={`${bgColors[cat.color]} transition-all`} style={{ width: `${pct}%` }}
                  title={`${cat.label}: ${cat.data.length} (${Math.round(pct)}%)`} />
              )
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
            {categories.map(cat => {
              if (cat.data.length === 0) return null
              const dotColors = { green: 'bg-green-500', yellow: 'bg-yellow-500', blue: 'bg-blue-500', red: 'bg-red-500' }
              return (
                <span key={cat.key} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${dotColors[cat.color]}`} />
                  {cat.label}: {cat.data.length}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={containerFilter} onChange={e => setContainerFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="all">Todos los contenedores</option>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>Contenedor #{n}</option>)}
        </select>
        <input
          placeholder="Filtrar por código..."
          value={codeFilter}
          onChange={e => setCodeFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {categoryFilter !== 'all' && (
          <button onClick={() => setCategoryFilter('all')}
            className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600">
            Limpiar filtro
          </button>
        )}
      </div>

      {/* Table */}
      <SortableTable columns={columns} data={allData} />
    </div>
  )
}
