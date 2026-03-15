import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import { saveState, loadState } from '../utils/storage'

const InventoryContext = createContext()

const initialState = {
  physicalInventory: [],
  axInventory: [],
  physicalLoaded: false,
  axLoaded: false,
  countState: {
    currentContainer: 1,
    currentType: 'inventariable',
    currentIndex: 0,
    reviews: {},
    searchQuery: '',
  },
  corrections: {
    applied: {},
    ignored: {},
    hasRun: false,
  },
  comparisonResults: null,
  nextPhysicalId: 1,
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_PHYSICAL': {
      const maxId = action.payload.reduce((max, m) => Math.max(max, m.id || 0), 0)
      return {
        ...state,
        physicalInventory: action.payload,
        physicalLoaded: true,
        nextPhysicalId: maxId + 1,
        corrections: { ...state.corrections, hasRun: false },
        comparisonResults: null,
      }
    }
    case 'LOAD_AX':
      return {
        ...state,
        axInventory: action.payload,
        axLoaded: true,
        corrections: { ...state.corrections, hasRun: false },
        comparisonResults: null,
      }
    case 'SET_COUNT_NAV':
      return {
        ...state,
        countState: { ...state.countState, ...action.payload },
      }
    case 'REVIEW_MATERIAL': {
      const { key, review } = action.payload
      return {
        ...state,
        countState: {
          ...state.countState,
          reviews: {
            ...state.countState.reviews,
            [key]: { ...state.countState.reviews[key], ...review },
          },
        },
      }
    }
    case 'ADD_MATERIAL': {
      const newMaterial = { ...action.payload, id: state.nextPhysicalId }
      return {
        ...state,
        physicalInventory: [...state.physicalInventory, newMaterial],
        nextPhysicalId: state.nextPhysicalId + 1,
      }
    }
    case 'APPLY_CORRECTION': {
      const { physicalKey, newTamano, newColor } = action.payload
      return {
        ...state,
        corrections: {
          ...state.corrections,
          applied: {
            ...state.corrections.applied,
            [physicalKey]: { newTamano, newColor },
          },
        },
      }
    }
    case 'APPLY_CORRECTIONS_BATCH': {
      const newApplied = { ...state.corrections.applied }
      for (const { physicalKey, newTamano, newColor } of action.payload) {
        newApplied[physicalKey] = { newTamano, newColor }
      }
      return {
        ...state,
        corrections: { ...state.corrections, applied: newApplied },
      }
    }
    case 'IGNORE_CORRECTION': {
      return {
        ...state,
        corrections: {
          ...state.corrections,
          ignored: { ...state.corrections.ignored, [action.payload]: true },
        },
      }
    }
    case 'MARK_CORRECTIONS_RUN':
      return {
        ...state,
        corrections: { ...state.corrections, hasRun: true },
      }
    case 'SET_COMPARISON_RESULTS':
      return { ...state, comparisonResults: action.payload }
    case 'RESTORE_STATE':
      return { ...action.payload }
    case 'RESET_ALL':
      return { ...initialState }
    case 'UNDO_RESTORE':
      return { ...action.payload }
    default:
      return state
  }
}

export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    const saved = loadState()
    return saved ? { ...initialState, ...saved } : initialState
  })

  const undoStack = useRef([])
  const maxUndo = 30

  const saveTimer = useRef(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveState(state), 500)
    return () => clearTimeout(saveTimer.current)
  }, [state])

  const dispatchWithUndo = useCallback((action) => {
    const snapshot = { ...state }
    undoStack.current = [...undoStack.current.slice(-(maxUndo - 1)), snapshot]
    dispatch(action)
  }, [state])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return false
    const prev = undoStack.current.pop()
    undoStack.current = [...undoStack.current]
    dispatch({ type: 'UNDO_RESTORE', payload: prev })
    return true
  }, [])

  const canUndo = undoStack.current.length > 0

  return (
    <InventoryContext.Provider value={{ state, dispatch: dispatchWithUndo, undo, canUndo }}>
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider')
  return ctx
}
