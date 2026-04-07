import { useState, useMemo, useEffect } from 'react'
import { useInventory } from '../context/InventoryContext'
import { normalize, normalizeKey } from '../utils/normalize'
import { compositeSimlarity } from '../utils/similarity'
import ProgressBar from '../components/ProgressBar'

export default function SizeColorCorrection() {
  const { state, dispatch } = useInventory()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidateId, setSelectedCandidateId] = useState(null)

  // --- Analysis pipeline ---
  const analysis = useMemo(() => {
    if (!state.physicalLoaded || !state.axLoaded) return null

    const physicals = state.physicalInventory.filter(m => m.type === 'inventariable')
    const axItems = state.axInventory

    // Group by normalized codigo
    const physByCode = {}
    for (const p of physicals) {
      const code = normalize(p.codigoAx)
      if (!physByCode[code]) physByCode[code] = []
      physByCode[code].push(p)
    }

    const axByCode = {}
    for (const ax of axItems) {
      const code = normalize(ax.codigoAx)
      if (!axByCode[code]) axByCode[code] = []
      axByCode[code].push(ax)
    }

    // Phase 1: Exact matches
    const matchedAxIds = new Set()
    const matchedPhysIds = new Set()
    const exactMatches = []

    const allCodes = new Set([...Object.keys(axByCode), ...Object.keys(physByCode)])
    for (const code of allCodes) {
      const axGroup = axByCode[code] || []
      const physGroup = physByCode[code] || []
      for (const ax of axGroup) {
        if (matchedAxIds.has(ax.id)) continue
        const axKey = normalizeKey(ax.codigoAx, ax.tamano, ax.color)
        for (const p of physGroup) {
          if (matchedPhysIds.has(p.id)) continue
          const pKey = normalizeKey(p.codigoAx, p.tamano, p.color)
          if (axKey === pKey) {
            exactMatches.push({ ax, physical: p })
            matchedAxIds.add(ax.id)
            matchedPhysIds.add(p.id)
            break
          }
        }
      }
    }

    // Set of physical keys already used by corrections (assigned to some AX)
    const appliedPhysKeys = new Set(Object.keys(state.corrections.applied))

    // Phase 2: Build AX items list with candidates
    const axItemsList = []
    for (const ax of axItems) {
      if (matchedAxIds.has(ax.id)) continue

      const code = normalize(ax.codigoAx)
      const physGroup = (physByCode[code] || []).filter(p => !matchedPhysIds.has(p.id))

      // Determine if this AX item was skipped
      const axKey = `ax:${normalizeKey(ax.codigoAx, ax.tamano, ax.color)}`
      const isSkipped = !!state.corrections.ignored[axKey]

      // Build candidates - exclude physicals already assigned via corrections
      const candidates = physGroup
        .map(p => {
          const pKey = normalizeKey(p.codigoAx, p.tamano, p.color)
          const isAssigned = appliedPhysKeys.has(pKey)
          if (isAssigned) return null
          const similarity = compositeSimlarity(p.tamano, p.color, ax.tamano, ax.color)
          return { physical: p, similarity, pKey }
        })
        .filter(Boolean)
        .sort((a, b) => b.similarity - a.similarity)

      // Determine if this AX was already corrected (one of its candidates was applied with matching values)
      let isCorrected = false
      for (const pKey of appliedPhysKeys) {
        const correction = state.corrections.applied[pKey]
        // Check if this correction matches this AX item
        if (
          normalize(correction.newTamano) === normalize(ax.tamano) &&
          normalize(correction.newColor) === normalize(ax.color)
        ) {
          // Check the physical belongs to the same codigo
          const parts = pKey.split('|')
          if (parts[0] === code) {
            isCorrected = true
            break
          }
        }
      }

      const status = isCorrected ? 'corrected' : isSkipped ? 'skipped' : candidates.length === 0 ? 'noCandidates' : 'pending'
      axItemsList.push({ ax, candidates, status, axKey })
    }

    const correctedCount = axItemsList.filter(i => i.status === 'corrected').length
    const skippedCount = axItemsList.filter(i => i.status === 'skipped').length
    const pendingCount = axItemsList.filter(i => i.status === 'pending' || i.status === 'noCandidates').length

    return { exactMatches, axItemsList, correctedCount, skippedCount, pendingCount }
  }, [state.physicalInventory, state.axInventory, state.physicalLoaded, state.axLoaded, state.corrections.applied, state.corrections.ignored])

  // --- Filtered list for navigation (only pending items) ---
  const pendingItems = useMemo(() => {
    if (!analysis) return []
    let items = analysis.axItemsList.filter(i => i.status === 'pending' || i.status === 'noCandidates')
    if (searchQuery) {
      const q = normalize(searchQuery)
      items = items.filter(i => {
        const code = normalize(i.ax.codigoAx)
        const desc = normalize(i.ax.descripcion)
        return code.includes(q) || desc.includes(q)
      })
    }
    return items
  }, [analysis, searchQuery])

  // Adjust currentIndex if out of bounds
  useEffect(() => {
    if (currentIndex >= pendingItems.length && pendingItems.length > 0) {
      setCurrentIndex(pendingItems.length - 1)
    }
  }, [pendingItems.length, currentIndex])

  // Reset selection when navigating
  const currentItem = pendingItems[currentIndex] || null

  // --- Loading state ---
  if (!state.physicalLoaded || !state.axLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg mb-2">Datos incompletos</p>
        <p className="text-sm">Carga tanto el inventario fisico como el inventario AX desde Inicio</p>
      </div>
    )
  }

  if (!analysis) return null

  const { exactMatches, correctedCount, skippedCount, pendingCount } = analysis
  const totalNonExact = analysis.axItemsList.length
  const reviewed = correctedCount + skippedCount

  // --- Navigation ---
  const nav = (dir) => {
    const next = currentIndex + dir
    if (next >= 0 && next < pendingItems.length) {
      setCurrentIndex(next)
      setSelectedCandidateId(null)
    }
  }

  // --- Actions ---
  const applyCorrection = () => {
    if (!selectedCandidateId || !currentItem) return
    const candidate = currentItem.candidates.find(c => c.physical.id === selectedCandidateId)
    if (!candidate) return
    dispatch({
      type: 'APPLY_CORRECTION',
      payload: {
        physicalKey: candidate.pKey,
        newTamano: currentItem.ax.tamano,
        newColor: currentItem.ax.color,
      },
    })
    setSelectedCandidateId(null)
    // Item will disappear from pending list; currentIndex stays or adjusts via useEffect
  }

  const skipItem = () => {
    if (!currentItem) return
    dispatch({ type: 'IGNORE_CORRECTION', payload: currentItem.axKey })
    setSelectedCandidateId(null)
  }

  const markDone = () => {
    dispatch({ type: 'MARK_CORRECTIONS_RUN' })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Correccion Tamano / Color</h2>
        <button
          onClick={markDone}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            state.corrections.hasRun
              ? 'bg-green-700 text-green-300'
              : 'bg-yellow-600 hover:bg-yellow-500 text-white'
          }`}
        >
          {state.corrections.hasRun ? 'Correccion completada' : 'Marcar como completada'}
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por codigo o descripcion..."
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); setSelectedCandidateId(null) }}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
      />

      {/* Progress */}
      <ProgressBar reviewed={reviewed} total={totalNonExact} label="Progreso de correccion" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Exactos" value={exactMatches.length} color="green" />
        <StatCard label="Corregidos" value={correctedCount} color="blue" />
        <StatCard label="Saltados" value={skippedCount} color="gray" />
        <StatCard label="Pendientes" value={pendingCount} color="yellow" />
      </div>

      {/* Card navigation */}
      {pendingItems.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-500">
          {searchQuery
            ? 'No se encontraron resultados'
            : totalNonExact === 0
              ? 'Todos los elementos coinciden exactamente'
              : 'Todos los elementos han sido procesados'}
        </div>
      ) : currentItem && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          {/* Navigation controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => nav(-1)}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
            >
              Anterior
            </button>
            <span className="text-gray-400 text-sm font-medium">
              {currentIndex + 1} de {pendingItems.length}
            </span>
            <button
              onClick={() => nav(1)}
              disabled={currentIndex >= pendingItems.length - 1}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
            >
              Siguiente
            </button>
          </div>

          {/* AX item card */}
          <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-4">
            <div className="text-xs text-blue-400 uppercase tracking-wide mb-2 font-medium">Elemento AX (fuente de verdad)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Codigo AX" value={currentItem.ax.codigoAx} large />
              <Field label="Descripcion" value={currentItem.ax.descripcion} className="col-span-2 md:col-span-3" />
              <Field label="Tamano" value={currentItem.ax.tamano || '\u2014'} highlight />
              <Field label="Color" value={currentItem.ax.color || '\u2014'} highlight />
            </div>
          </div>

          {/* Candidates list */}
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-medium">
              Candidatos del inventario fisico ({currentItem.candidates.length})
            </div>

            {currentItem.candidates.length === 0 ? (
              <div className="bg-gray-800/50 rounded-lg p-4 text-center text-gray-500 text-sm">
                No hay candidatos fisicos con este codigo.
                <br />
                Este material aparecera como faltante en la comparacion.
              </div>
            ) : (
              <div className="space-y-2">
                {currentItem.candidates.map((candidate) => {
                  const p = candidate.physical
                  const isSelected = selectedCandidateId === p.id
                  const pct = Math.round(candidate.similarity * 100)
                  const simColor = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedCandidateId(isSelected ? null : p.id)}
                      className={`w-full text-left rounded-lg p-3 transition-colors border ${
                        isSelected
                          ? 'bg-blue-900/30 border-blue-500'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-500' : 'border-gray-600'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                          </div>
                          <span className="text-gray-300 text-sm font-medium">Contenedor #{p.container}</span>
                        </div>
                        <span className={`text-sm font-bold ${simColor}`}>{pct}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm ml-6">
                        <div>
                          <span className="text-gray-500">Tamano: </span>
                          <span className={normalize(p.tamano) !== normalize(currentItem.ax.tamano) ? 'text-red-400' : 'text-green-400'}>
                            {p.tamano || '\u2014'}
                          </span>
                          {normalize(p.tamano) !== normalize(currentItem.ax.tamano) && (
                            <span className="text-gray-500"> &rarr; </span>
                          )}
                          {normalize(p.tamano) !== normalize(currentItem.ax.tamano) && (
                            <span className="text-blue-400">{currentItem.ax.tamano || '\u2014'}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500">Color: </span>
                          <span className={normalize(p.color) !== normalize(currentItem.ax.color) ? 'text-red-400' : 'text-green-400'}>
                            {p.color || '\u2014'}
                          </span>
                          {normalize(p.color) !== normalize(currentItem.ax.color) && (
                            <span className="text-gray-500"> &rarr; </span>
                          )}
                          {normalize(p.color) !== normalize(currentItem.ax.color) && (
                            <span className="text-blue-400">{currentItem.ax.color || '\u2014'}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={applyCorrection}
              disabled={!selectedCandidateId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm font-medium transition-colors"
            >
              Aplicar correccion
            </button>
            <button
              onClick={skipItem}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-medium transition-colors"
            >
              Saltar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, large, highlight, className = '' }) {
  return (
    <div className={className}>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`${large ? 'text-lg font-semibold' : 'text-sm'} ${highlight ? 'text-blue-300 font-medium' : 'text-gray-200'}`}>
        {value}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    green: 'border-green-500/30 bg-green-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    gray: 'border-gray-500/30 bg-gray-500/5',
  }
  const textColors = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    gray: 'text-gray-400',
  }
  return (
    <div className={`border rounded-lg p-3 text-center ${colors[color]}`}>
      <div className={`text-2xl font-bold ${textColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
