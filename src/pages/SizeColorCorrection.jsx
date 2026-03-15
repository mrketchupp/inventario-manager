import { useState, useMemo } from 'react'
import { useInventory } from '../context/InventoryContext'
import { normalize, normalizeKey } from '../utils/normalize'
import { compositeSimlarity } from '../utils/similarity'

const THRESHOLD_AUTO = 0.7
const THRESHOLD_SUGGEST = 0.3

export default function SizeColorCorrection() {
  const { state, dispatch } = useInventory()
  const [filter, setFilter] = useState('all') // 'all' | 'exact' | 'suggested' | 'manual' | 'noMatch'
  const [codeFilter, setCodeFilter] = useState('')

  const analysis = useMemo(() => {
    if (!state.physicalLoaded || !state.axLoaded) return null

    const physicals = state.physicalInventory.filter(m => m.type === 'inventariable')
    const axItems = state.axInventory

    // Group by normalized codigo
    const axByCode = {}
    for (const ax of axItems) {
      const code = normalize(ax.codigoAx)
      if (!axByCode[code]) axByCode[code] = []
      axByCode[code].push(ax)
    }

    const physByCode = {}
    for (const p of physicals) {
      const code = normalize(p.codigoAx)
      if (!physByCode[code]) physByCode[code] = []
      physByCode[code].push(p)
    }

    const exactMatches = []
    const suggestions = []
    const manualReview = []
    const noMatchPhysical = []
    const noMatchAx = []

    const allCodes = new Set([...Object.keys(axByCode), ...Object.keys(physByCode)])

    for (const code of allCodes) {
      const axGroup = axByCode[code] || []
      const physGroup = physByCode[code] || []

      if (axGroup.length === 0) {
        for (const p of physGroup) noMatchPhysical.push({ physical: p, type: 'noMatchPhysical' })
        continue
      }
      if (physGroup.length === 0) {
        for (const ax of axGroup) noMatchAx.push({ ax, type: 'noMatchAx' })
        continue
      }

      const matchedAx = new Set()
      const matchedPhys = new Set()

      // Phase 1: exact matches
      for (const p of physGroup) {
        const pKey = normalizeKey(p.codigoAx, p.tamano, p.color)
        for (const ax of axGroup) {
          const axKey = normalizeKey(ax.codigoAx, ax.tamano, ax.color)
          if (pKey === axKey && !matchedAx.has(ax.id) && !matchedPhys.has(p.id)) {
            exactMatches.push({ physical: p, ax, similarity: 1, type: 'exact' })
            matchedAx.add(ax.id)
            matchedPhys.add(p.id)
            break
          }
        }
      }

      // Phase 2: remaining — find best suggestions
      const unmatchedAx = axGroup.filter(ax => !matchedAx.has(ax.id))
      const unmatchedPhys = physGroup.filter(p => !matchedPhys.has(p.id))

      // Check corrections already applied
      for (const ax of unmatchedAx) {
        const candidates = unmatchedPhys
          .filter(p => !matchedPhys.has(p.id))
          .map(p => {
            // Check if correction already applied
            const pKey = `${normalize(p.codigoAx)}|${normalize(p.tamano)}|${normalize(p.color)}`
            const correction = state.corrections.applied[pKey]
            const ignored = state.corrections.ignored[pKey]

            const sim = compositeSimlarity(
              correction?.newTamano ?? p.tamano,
              correction?.newColor ?? p.color,
              ax.tamano,
              ax.color
            )
            return { physical: p, ax, similarity: sim, correction, ignored }
          })
          .sort((a, b) => b.similarity - a.similarity)

        if (candidates.length > 0) {
          const best = candidates[0]
          if (best.similarity >= THRESHOLD_AUTO) {
            suggestions.push({ ...best, type: 'suggested' })
            matchedPhys.add(best.physical.id)
          } else if (best.similarity >= THRESHOLD_SUGGEST) {
            manualReview.push({ ...best, type: 'manual' })
            matchedPhys.add(best.physical.id)
          } else {
            noMatchAx.push({ ax, type: 'noMatchAx' })
          }
        } else {
          noMatchAx.push({ ax, type: 'noMatchAx' })
        }
      }

      // Remaining unmatched physicals
      for (const p of unmatchedPhys) {
        if (!matchedPhys.has(p.id)) {
          noMatchPhysical.push({ physical: p, type: 'noMatchPhysical' })
        }
      }
    }

    return { exactMatches, suggestions, manualReview, noMatchPhysical, noMatchAx }
  }, [state.physicalInventory, state.axInventory, state.physicalLoaded, state.axLoaded, state.corrections.applied, state.corrections.ignored])

  if (!state.physicalLoaded || !state.axLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg mb-2">Datos incompletos</p>
        <p className="text-sm">Carga tanto el inventario físico como el inventario AX desde Inicio</p>
      </div>
    )
  }

  if (!analysis) return null

  const applyCorrection = (item) => {
    const pKey = `${normalize(item.physical.codigoAx)}|${normalize(item.physical.tamano)}|${normalize(item.physical.color)}`
    dispatch({
      type: 'APPLY_CORRECTION',
      payload: { physicalKey: pKey, newTamano: item.ax.tamano, newColor: item.ax.color },
    })
  }

  const ignoreCorrection = (item) => {
    const pKey = `${normalize(item.physical.codigoAx)}|${normalize(item.physical.tamano)}|${normalize(item.physical.color)}`
    dispatch({ type: 'IGNORE_CORRECTION', payload: pKey })
  }

  const applyAllSuggested = () => {
    const batch = analysis.suggestions
      .filter(item => {
        const pKey = `${normalize(item.physical.codigoAx)}|${normalize(item.physical.tamano)}|${normalize(item.physical.color)}`
        return !state.corrections.applied[pKey] && !state.corrections.ignored[pKey]
      })
      .map(item => ({
        physicalKey: `${normalize(item.physical.codigoAx)}|${normalize(item.physical.tamano)}|${normalize(item.physical.color)}`,
        newTamano: item.ax.tamano,
        newColor: item.ax.color,
      }))
    if (batch.length > 0) {
      dispatch({ type: 'APPLY_CORRECTIONS_BATCH', payload: batch })
    }
  }

  const markDone = () => {
    dispatch({ type: 'MARK_CORRECTIONS_RUN' })
  }

  const allItems = [
    ...analysis.exactMatches,
    ...analysis.suggestions,
    ...analysis.manualReview,
    ...analysis.noMatchPhysical,
    ...analysis.noMatchAx,
  ]

  const filteredItems = allItems.filter(item => {
    if (filter !== 'all' && item.type !== filter) return false
    if (codeFilter) {
      const code = normalize(item.physical?.codigoAx || item.ax?.codigoAx || '')
      if (!code.includes(normalize(codeFilter))) return false
    }
    return true
  })

  const pendingSuggestions = analysis.suggestions.filter(item => {
    const pKey = `${normalize(item.physical.codigoAx)}|${normalize(item.physical.tamano)}|${normalize(item.physical.color)}`
    return !state.corrections.applied[pKey] && !state.corrections.ignored[pKey]
  }).length

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Corrección Tamaño / Color</h2>
        <div className="flex gap-2">
          {pendingSuggestions > 0 && (
            <button onClick={applyAllSuggested}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors">
              Aplicar todas ({pendingSuggestions})
            </button>
          )}
          <button onClick={markDone}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              state.corrections.hasRun
                ? 'bg-green-700 text-green-300'
                : 'bg-yellow-600 hover:bg-yellow-500 text-white'
            }`}>
            {state.corrections.hasRun ? '✓ Corrección completada' : 'Marcar como completada'}
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Coincidencias" value={analysis.exactMatches.length} color="green" onClick={() => setFilter('exact')} active={filter === 'exact'} />
        <StatCard label="Sugerencias" value={analysis.suggestions.length} color="blue" onClick={() => setFilter('suggested')} active={filter === 'suggested'} />
        <StatCard label="Rev. Manual" value={analysis.manualReview.length} color="yellow" onClick={() => setFilter('manual')} active={filter === 'manual'} />
        <StatCard label="Sin match (fís.)" value={analysis.noMatchPhysical.length} color="red" onClick={() => setFilter('noMatchPhysical')} active={filter === 'noMatchPhysical'} />
        <StatCard label="Sin match (AX)" value={analysis.noMatchAx.length} color="purple" onClick={() => setFilter('noMatchAx')} active={filter === 'noMatchAx'} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filter === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          Todos
        </button>
        <input
          placeholder="Filtrar por código..."
          value={codeFilter}
          onChange={e => setCodeFilter(e.target.value)}
          className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800/80 text-gray-300 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Tamaño Físico</th>
              <th className="px-3 py-2">→</th>
              <th className="px-3 py-2">Tamaño AX</th>
              <th className="px-3 py-2">Color Físico</th>
              <th className="px-3 py-2">→</th>
              <th className="px-3 py-2">Color AX</th>
              <th className="px-3 py-2">%</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredItems.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-500">Sin datos</td></tr>
            ) : (
              filteredItems.map((item, i) => {
                const p = item.physical
                const ax = item.ax
                const pKey = p ? `${normalize(p.codigoAx)}|${normalize(p.tamano)}|${normalize(p.color)}` : null
                const isApplied = pKey && state.corrections.applied[pKey]
                const isIgnored = pKey && state.corrections.ignored[pKey]

                return (
                  <tr key={i} className="hover:bg-gray-800/40">
                    <td className="px-3 py-2 text-gray-300 font-mono text-xs">{p?.codigoAx || ax?.codigoAx}</td>
                    <td className="px-3 py-2 text-gray-300 max-w-48 truncate">{p?.descripcion || ax?.descripcion}</td>
                    <td className="px-3 py-2 text-gray-300">{p?.tamano || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">→</td>
                    <td className="px-3 py-2 text-gray-300">{ax?.tamano || '—'}</td>
                    <td className="px-3 py-2 text-gray-300">{p?.color || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">→</td>
                    <td className="px-3 py-2 text-gray-300">{ax?.color || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium ${
                        item.similarity >= 0.8 ? 'text-green-400' : item.similarity >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {item.similarity !== undefined ? `${Math.round(item.similarity * 100)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {item.type === 'exact' && <Badge color="green">Exacto</Badge>}
                      {item.type === 'suggested' && !isApplied && !isIgnored && <Badge color="blue">Sugerido</Badge>}
                      {item.type === 'manual' && !isApplied && !isIgnored && <Badge color="yellow">Manual</Badge>}
                      {item.type === 'noMatchPhysical' && <Badge color="red">Sin match</Badge>}
                      {item.type === 'noMatchAx' && <Badge color="purple">Sin match AX</Badge>}
                      {isApplied && <Badge color="green">Aplicado</Badge>}
                      {isIgnored && <Badge color="gray">Ignorado</Badge>}
                    </td>
                    <td className="px-3 py-2">
                      {(item.type === 'suggested' || item.type === 'manual') && !isApplied && !isIgnored && (
                        <div className="flex gap-1">
                          <button onClick={() => applyCorrection(item)}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition-colors">
                            Aplicar
                          </button>
                          <button onClick={() => ignoreCorrection(item)}
                            className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors">
                            Ignorar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, onClick, active }) {
  const colors = {
    green: 'border-green-500/30 bg-green-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
  }
  const textColors = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  }
  return (
    <button
      onClick={onClick}
      className={`border rounded-lg p-3 text-center transition-colors cursor-pointer ${colors[color]} ${active ? 'ring-2 ring-white/20' : ''}`}
    >
      <div className={`text-2xl font-bold ${textColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </button>
  )
}

function Badge({ color, children }) {
  const styles = {
    green: 'bg-green-600/20 text-green-400',
    blue: 'bg-blue-600/20 text-blue-400',
    yellow: 'bg-yellow-600/20 text-yellow-400',
    red: 'bg-red-600/20 text-red-400',
    purple: 'bg-purple-600/20 text-purple-400',
    gray: 'bg-gray-600/20 text-gray-400',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[color]}`}>{children}</span>
}
