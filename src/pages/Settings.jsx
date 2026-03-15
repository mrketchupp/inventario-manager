import { useState } from 'react'
import { useInventory } from '../context/InventoryContext'
import { clearState } from '../utils/storage'
import { exportPhysicalInventory } from '../utils/excelExporter'

export default function Settings() {
  const { state, dispatch } = useInventory()
  const [confirmReset, setConfirmReset] = useState(false)

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    clearState()
    dispatch({ type: 'RESET_ALL' })
    setConfirmReset(false)
  }

  const reviewCount = Object.values(state.countState.reviews).filter(r => r.status).length
  const correctionCount = Object.keys(state.corrections.applied).length
  const labelCount = Object.values(state.countState.reviews).filter(r => r.labels?.length > 0).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">Ajustes</h2>

      {/* Status */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-white">Estado del Trabajo</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Inventario físico:</span>
            <span className={state.physicalLoaded ? 'text-green-400' : 'text-gray-500'}>
              {state.physicalLoaded ? `${state.physicalInventory.length} materiales` : 'No cargado'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Inventario AX:</span>
            <span className={state.axLoaded ? 'text-green-400' : 'text-gray-500'}>
              {state.axLoaded ? `${state.axInventory.length} materiales` : 'No cargado'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Materiales revisados:</span>
            <span className="text-blue-400">{reviewCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Correcciones aplicadas:</span>
            <span className="text-blue-400">{correctionCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Materiales etiquetados:</span>
            <span className="text-yellow-400">{labelCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Corrección ejecutada:</span>
            <span className={state.corrections.hasRun ? 'text-green-400' : 'text-gray-500'}>
              {state.corrections.hasRun ? 'Sí' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-white">Exportar Datos</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportPhysicalInventory(state.physicalInventory, state.countState.reviews)}
            disabled={!state.physicalLoaded}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm font-medium transition-colors"
          >
            📥 Exportar Inventario Físico
          </button>
        </div>
      </div>

      {/* Reset */}
      <div className="bg-gray-900 border border-red-900/30 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-red-400">Zona de Peligro</h3>
        <p className="text-gray-400 text-sm">
          Esto eliminará todos los datos cargados, conteos, correcciones y resultados de comparación.
        </p>
        <button
          onClick={handleReset}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            confirmReset
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
              : 'bg-red-900/50 hover:bg-red-900 text-red-400'
          }`}
        >
          {confirmReset ? '⚠️ Confirmar: Borrar todo' : 'Reiniciar aplicación'}
        </button>
        {confirmReset && (
          <button onClick={() => setConfirmReset(false)}
            className="ml-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors">
            Cancelar
          </button>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-gray-400 text-xs space-y-1">
        <p>Los datos se guardan automáticamente en el navegador (localStorage).</p>
        <p>Al recargar la página, el trabajo se restaura automáticamente.</p>
        <p>Atajos: Ctrl+Z para deshacer</p>
      </div>
    </div>
  )
}
