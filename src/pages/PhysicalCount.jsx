import { useState, useMemo, useEffect } from 'react'
import { useInventory } from '../context/InventoryContext'
import ContainerSelector from '../components/ContainerSelector'
import ProgressBar from '../components/ProgressBar'
import SortableTable from '../components/SortableTable'
import { searchMaterials } from '../utils/search'
import { exportPhysicalInventory } from '../utils/excelExporter'

const LABELS = ['Falta etiquetar', 'Corregir etiqueta']

export default function PhysicalCount() {
  const { state, dispatch } = useInventory()
  const { countState, physicalInventory } = state
  const { currentContainer, currentType, currentIndex, reviews, searchQuery } = countState

  const [view, setView] = useState('card') // 'card' | 'labels' | 'add'
  const [addForm, setAddForm] = useState({
    codigoAx: '', descripcion: '', tamano: '', color: '', np: '', cantidad: '', um: 'PZA', container: currentContainer,
  })
  const [editQty, setEditQty] = useState('')
  const [editMode, setEditMode] = useState(false)

  const materialCounts = useMemo(() => {
    const counts = {}
    for (const m of physicalInventory) {
      const k = `${m.container}-${m.type}`
      counts[k] = (counts[k] || 0) + 1
    }
    return counts
  }, [physicalInventory])

  const filtered = useMemo(() => {
    let items = physicalInventory.filter(m => m.container === currentContainer && m.type === currentType)
    if (searchQuery) items = searchMaterials(items, searchQuery)
    return items
  }, [physicalInventory, currentContainer, currentType, searchQuery])

  const current = filtered[currentIndex] || null
  const currentKey = current ? String(current.id) : null
  const review = currentKey ? reviews[currentKey] : null

  useEffect(() => {
    if (currentIndex >= filtered.length && filtered.length > 0) {
      dispatch({ type: 'SET_COUNT_NAV', payload: { currentIndex: filtered.length - 1 } })
    }
  }, [filtered.length, currentIndex, dispatch])

  useEffect(() => {
    if (current && editMode) {
      setEditQty(review?.newQty !== undefined ? String(review.newQty) : String(current.cantidad))
    }
  }, [current, editMode, review])

  const reviewedCount = useMemo(() => {
    return filtered.filter(m => {
      const r = reviews[String(m.id)]
      return r && (r.status === 'confirmed' || r.status === 'modified')
    }).length
  }, [filtered, reviews])

  const labeledMaterials = useMemo(() => {
    return physicalInventory.filter(m => {
      const r = reviews[String(m.id)]
      return r?.labels?.length > 0
    })
  }, [physicalInventory, reviews])

  const nav = (dir) => {
    const next = currentIndex + dir
    if (next >= 0 && next < filtered.length) {
      dispatch({ type: 'SET_COUNT_NAV', payload: { currentIndex: next } })
      setEditMode(false)
    }
  }

  const confirm = () => {
    if (!currentKey) return
    dispatch({ type: 'REVIEW_MATERIAL', payload: { key: currentKey, review: { status: 'confirmed' } } })
    if (currentIndex < filtered.length - 1) nav(1)
  }

  const saveQty = () => {
    if (!currentKey) return
    const qty = parseFloat(editQty)
    if (isNaN(qty)) return
    dispatch({ type: 'REVIEW_MATERIAL', payload: { key: currentKey, review: { status: 'modified', newQty: qty } } })
    setEditMode(false)
    if (currentIndex < filtered.length - 1) nav(1)
  }

  const toggleLabel = (label) => {
    if (!currentKey) return
    const existing = review?.labels || []
    const newLabels = existing.includes(label)
      ? existing.filter(l => l !== label)
      : [...existing, label]
    dispatch({ type: 'REVIEW_MATERIAL', payload: { key: currentKey, review: { labels: newLabels } } })
  }

  const addMaterial = () => {
    if (!addForm.codigoAx || !addForm.descripcion || !addForm.cantidad || !addForm.um) return
    dispatch({
      type: 'ADD_MATERIAL',
      payload: {
        ...addForm,
        cantidad: parseFloat(addForm.cantidad) || 0,
        container: parseInt(addForm.container),
        type: currentType,
      },
    })
    setAddForm({ codigoAx: '', descripcion: '', tamano: '', color: '', np: '', cantidad: '', um: 'PZA', container: currentContainer })
    setView('card')
  }

  if (!state.physicalLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg mb-2">No hay inventario cargado</p>
        <p className="text-sm">Carga un archivo Excel desde la página de Inicio</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ContainerSelector
          container={currentContainer}
          type={currentType}
          onContainerChange={(c) => dispatch({ type: 'SET_COUNT_NAV', payload: { currentContainer: c, currentIndex: 0 } })}
          onTypeChange={(t) => dispatch({ type: 'SET_COUNT_NAV', payload: { currentType: t, currentIndex: 0 } })}
          materialCounts={materialCounts}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === 'labels' ? 'card' : 'labels')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              view === 'labels' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔔 Recordatorios {labeledMaterials.length > 0 && `(${labeledMaterials.length})`}
          </button>
          <button
            onClick={() => setView(view === 'add' ? 'card' : 'add')}
            className="px-3 py-1.5 rounded text-sm font-medium bg-green-700 text-white hover:bg-green-600 transition-colors"
          >
            + Agregar
          </button>
          <button
            onClick={() => exportPhysicalInventory(physicalInventory, reviews)}
            className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            📥 Exportar
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por código, descripción, tamaño, color, NP..."
        value={searchQuery}
        onChange={(e) => dispatch({ type: 'SET_COUNT_NAV', payload: { searchQuery: e.target.value, currentIndex: 0 } })}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
      />

      {/* Progress */}
      <ProgressBar reviewed={reviewedCount} total={filtered.length} label="Progreso de revisión" />

      {/* Labels view */}
      {view === 'labels' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Materiales con Recordatorios</h3>
          {labeledMaterials.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay materiales con recordatorios</p>
          ) : (
            <SortableTable
              columns={[
                { key: 'codigoAx', label: 'Código AX' },
                { key: 'descripcion', label: 'Descripción' },
                { key: 'tamano', label: 'Tamaño' },
                { key: 'color', label: 'Color' },
                { key: 'container', label: 'Cont.' },
                { key: 'labels', label: 'Recordatorios', render: (_, row) => {
                  const r = reviews[String(row.id)]
                  return (r?.labels || []).map(l => (
                    <span key={l} className="inline-block bg-yellow-600/30 text-yellow-300 px-2 py-0.5 rounded text-xs mr-1">{l}</span>
                  ))
                }},
              ]}
              data={labeledMaterials.map(m => ({ ...m, _key: String(m.id) }))}
            />
          )}
        </div>
      )}

      {/* Add form */}
      {view === 'add' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-semibold text-white">Agregar Material</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Código AX *</label>
              <input value={addForm.codigoAx} onChange={e => setAddForm({...addForm, codigoAx: e.target.value})}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Descripción *</label>
              <input value={addForm.descripcion} onChange={e => setAddForm({...addForm, descripcion: e.target.value})}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tamaño</label>
              <input value={addForm.tamano} onChange={e => setAddForm({...addForm, tamano: e.target.value})}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Color</label>
              <input value={addForm.color} onChange={e => setAddForm({...addForm, color: e.target.value})}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">NP</label>
              <input value={addForm.np} onChange={e => setAddForm({...addForm, np: e.target.value})}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cantidad *</label>
              <input type="number" value={addForm.cantidad} onChange={e => setAddForm({...addForm, cantidad: e.target.value})}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">UM *</label>
              <select value={addForm.um} onChange={e => setAddForm({...addForm, um: e.target.value})}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500">
                {['PZA', 'MTS', 'LTS', 'KGS', 'JGO', 'PAR', 'ROLLO', 'GALON', 'CAJA'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Contenedor *</label>
              <select value={addForm.container} onChange={e => setAddForm({...addForm, container: e.target.value})}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>#{n}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={addMaterial}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors">
              Guardar
            </button>
            <button onClick={() => setView('card')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-medium transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Material card */}
      {view === 'card' && (
        <>
          {filtered.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-500">
              {searchQuery ? 'No se encontraron resultados' : 'No hay materiales en este contenedor'}
            </div>
          ) : current && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button onClick={() => nav(-1)} disabled={currentIndex === 0}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors">
                  ← Anterior
                </button>
                <span className="text-gray-400 text-sm font-medium">{currentIndex + 1} de {filtered.length}</span>
                <button onClick={() => nav(1)} disabled={currentIndex >= filtered.length - 1}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors">
                  Siguiente →
                </button>
              </div>

              {/* Material info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Código AX" value={current.codigoAx} large />
                <Field label="Descripción" value={current.descripcion} className="col-span-2" large />
                <Field label="Tamaño" value={current.tamano || '—'} />
                <Field label="Color" value={current.color || '—'} />
                <Field label="NP" value={current.np || '—'} />
                <Field label="UM" value={current.um || '—'} />
              </div>

              {/* Quantity */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Cantidad</div>
                    <div className="text-3xl font-bold text-white">
                      {review?.newQty !== undefined ? review.newQty : current.cantidad}
                      {review?.newQty !== undefined && review.newQty !== current.cantidad && (
                        <span className="text-sm text-gray-500 ml-2">(original: {current.cantidad})</span>
                      )}
                    </div>
                  </div>
                  {!editMode && (
                    <button onClick={() => { setEditMode(true); setEditQty(String(review?.newQty ?? current.cantidad)) }}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors">
                      Modificar
                    </button>
                  )}
                </div>
                {editMode && (
                  <div className="flex items-center gap-2 mt-3">
                    <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-lg focus:outline-none focus:border-blue-500"
                      autoFocus />
                    <button onClick={saveQty} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors">
                      Guardar
                    </button>
                    <button onClick={() => setEditMode(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {review?.status === 'confirmed' && <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">Confirmado</span>}
                {review?.status === 'modified' && <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium">Modificado</span>}
                {!review?.status && <span className="bg-gray-700 text-gray-400 px-3 py-1 rounded-full text-xs font-medium">Pendiente</span>}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={confirm}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors">
                  ✓ Confirmar Cantidad
                </button>
                {LABELS.map(label => (
                  <button key={label} onClick={() => toggleLabel(label)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      review?.labels?.includes(label)
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}>
                    🏷 {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Field({ label, value, large, className = '' }) {
  return (
    <div className={className}>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-gray-200 ${large ? 'text-lg font-semibold' : 'text-sm'}`}>{value}</div>
    </div>
  )
}
