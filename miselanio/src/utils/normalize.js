export function normalize(s) {
  return (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

export function normalizeKey(codigoAx, tamano, color) {
  return `${normalize(codigoAx)}|${normalize(tamano)}|${normalize(color)}`
}

export function materialKey(m) {
  return normalizeKey(m.codigoAx, m.tamano, m.color)
}
