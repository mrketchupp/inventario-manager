const STORAGE_KEY = 'inventario-pozo-state'

export function saveState(state) {
  try {
    const serialized = JSON.stringify(state, (key, value) => {
      if (value instanceof Set) return { __type: 'Set', values: [...value] }
      return value
    })
    localStorage.setItem(STORAGE_KEY, serialized)
  } catch (e) {
    console.warn('Error saving state:', e)
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw, (key, value) => {
      if (value && value.__type === 'Set') return new Set(value.values)
      return value
    })
  } catch (e) {
    console.warn('Error loading state:', e)
    return null
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}
