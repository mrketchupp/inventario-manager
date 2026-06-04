import { useInventory } from '../context/InventoryContext'
import FileUpload from '../components/FileUpload'
import { parsePhysicalInventory, parseAXInventory, readFileAsArrayBuffer } from '../utils/excelParser'
import { useState } from 'react'

export default function Home({ onNavigate }) {
  const { state, dispatch } = useInventory()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handlePhysicalFile = async (file) => {
    try {
      setLoading(true)
      setError(null)
      const buf = await readFileAsArrayBuffer(file)
      const materials = parsePhysicalInventory(buf)
      if (materials.length === 0) {
        setError('No se encontraron materiales. Verifica que las hojas sigan el formato "CONTENEDOR #N INVENTARIABLE/CONSUMIBLE".')
        return
      }
      dispatch({ type: 'LOAD_PHYSICAL', payload: materials })
    } catch (e) {
      setError(`Error al leer archivo: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAXFile = async (file) => {
    try {
      setLoading(true)
      setError(null)
      const buf = await readFileAsArrayBuffer(file)
      const materials = parseAXInventory(buf)
      if (materials.length === 0) {
        setError('No se encontraron materiales en el archivo AX. Verifica las columnas.')
        return
      }
      dispatch({ type: 'LOAD_AX', payload: materials })
    } catch (e) {
      setError(`Error al leer archivo AX: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const physicalSummary = state.physicalLoaded
    ? (() => {
        const containers = new Set(state.physicalInventory.map(m => m.container))
        const inv = state.physicalInventory.filter(m => m.type === 'inventariable').length
        const con = state.physicalInventory.filter(m => m.type === 'consumible').length
        return `${state.physicalInventory.length} materiales | ${containers.size} contenedores | ${inv} inv. / ${con} cons.`
      })()
    : null

  const axSummary = state.axLoaded
    ? `${state.axInventory.length} materiales cargados`
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Gestión de Inventario</h2>
        <p className="text-gray-400 text-sm">Carga los archivos Excel para comenzar a trabajar con las herramientas de inventario.</p>
      </div>

      {loading && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Procesando archivo...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FileUpload
          label="Inventario Físico"
          description="Archivo Excel con hojas por contenedor"
          onFile={handlePhysicalFile}
          loaded={state.physicalLoaded}
          summary={physicalSummary}
        />
        <FileUpload
          label="Inventario AX"
          description="Archivo del sistema AX (solo inventariables)"
          onFile={handleAXFile}
          loaded={state.axLoaded}
          summary={axSummary}
        />
      </div>

      {/* Quick actions */}
      {state.physicalLoaded && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Herramientas</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <button
              onClick={() => onNavigate('count')}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-left transition-colors"
            >
              <div className="text-2xl mb-2">🔢</div>
              <h4 className="text-white font-medium mb-1">Conteo Físico</h4>
              <p className="text-gray-400 text-xs">Verificar cantidades material por material</p>
            </button>
            <button
              onClick={() => onNavigate('correction')}
              disabled={!state.axLoaded}
              className={`border rounded-lg p-4 text-left transition-colors ${
                state.axLoaded
                  ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                  : 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-2xl mb-2">🔧</div>
              <h4 className="text-white font-medium mb-1">Corrección Tamaño/Color</h4>
              <p className="text-gray-400 text-xs">
                {state.axLoaded ? 'Normalizar datos antes de comparar' : 'Requiere cargar inventario AX'}
              </p>
            </button>
            <button
              onClick={() => onNavigate('comparison')}
              disabled={!state.axLoaded}
              className={`border rounded-lg p-4 text-left transition-colors ${
                state.axLoaded
                  ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                  : 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-2xl mb-2">📊</div>
              <h4 className="text-white font-medium mb-1">Comparación</h4>
              <p className="text-gray-400 text-xs">
                {state.axLoaded ? 'Comparar físico vs AX' : 'Requiere cargar inventario AX'}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {state.physicalLoaded && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumen de Datos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5].map(c => {
              const count = state.physicalInventory.filter(m => m.container === c).length
              if (count === 0) return null
              return (
                <div key={c} className="text-center">
                  <div className="text-xl font-bold text-white">{count}</div>
                  <div className="text-xs text-gray-500">Contenedor #{c}</div>
                </div>
              )
            })}
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{state.physicalInventory.length}</div>
              <div className="text-xs text-gray-500">Total físico</div>
            </div>
            {state.axLoaded && (
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{state.axInventory.length}</div>
                <div className="text-xs text-gray-500">Total AX</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
