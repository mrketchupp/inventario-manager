import { normalize } from './normalize'

function bigrams(s) {
  const b = []
  for (let i = 0; i < s.length - 1; i++) b.push(s.slice(i, i + 2))
  return b
}

export function dice(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return 1
  if (!na && !nb) return 1
  if (!na || !nb) return 0
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0
  const ba = bigrams(na), bb = bigrams(nb)
  const set = new Set(ba)
  const inter = bb.filter(x => set.has(x)).length
  return ba.length + bb.length > 0 ? (2 * inter) / (ba.length + bb.length) : 0
}

export function compositeSimlarity(sizePhys, colorPhys, sizeAx, colorAx) {
  return 0.5 * dice(sizePhys, sizeAx) + 0.5 * dice(colorPhys, colorAx)
}
