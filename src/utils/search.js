import { normalize } from './normalize'

export function searchMaterials(materials, query) {
  if (!query || !query.trim()) return materials
  const q = normalize(query)
  return materials.filter(m => {
    const fields = [m.codigoAx, m.descripcion, m.tamano, m.color, m.np, m.um]
    return fields.some(f => normalize(f).includes(q))
  })
}
