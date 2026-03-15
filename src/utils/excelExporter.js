import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

function formatDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function exportPhysicalInventory(materials, reviews = {}, filename) {
  const wb = XLSX.utils.book_new()
  const groups = {}

  for (const m of materials) {
    const key = `CONTENEDOR #${m.container} ${m.type.toUpperCase()}`
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }

  const sheetOrder = []
  for (let c = 1; c <= 5; c++) {
    for (const t of ['INVENTARIABLE', 'CONSUMIBLE']) {
      sheetOrder.push(`CONTENEDOR #${c} ${t}`)
    }
  }

  for (const sheetName of sheetOrder) {
    const items = groups[sheetName]
    if (!items || items.length === 0) continue

    const rows = items.map((m, idx) => {
      const review = reviews[`${m.codigoAx}|${m.tamano}|${m.color}`] || {}
      const cantidad = review.newQty !== undefined ? review.newQty : m.cantidad
      return {
        'ITEM': idx + 1,
        'CODIGO AX': m.codigoAx,
        'DESCRIPCION': m.descripcion,
        'TAMAÑO': m.tamano,
        'COLOR': m.color,
        'NP': m.np || '',
        'CANTIDAD': cantidad,
        'UM': m.um || '',
        'ESTADO': review.status === 'confirmed' ? 'Confirmado' : review.status === 'modified' ? 'Modificado' : 'Pendiente',
        'ETIQUETAS': (review.labels || []).join(', '),
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const colWidths = [6, 12, 40, 15, 15, 15, 10, 8, 12, 25]
    ws['!cols'] = colWidths.map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  saveAs(blob, filename || `Inventario_Fisico_${formatDate()}.xlsx`)
}

export function exportComparisonReport(results, filename) {
  const wb = XLSX.utils.book_new()

  const categories = [
    { key: 'matches', label: 'Coincidencias' },
    { key: 'differences', label: 'Diferencias' },
    { key: 'onlyPhysical', label: 'Solo en Fisico' },
    { key: 'onlyAx', label: 'Solo en AX' },
  ]

  for (const { key, label } of categories) {
    const items = results[key] || []
    if (items.length === 0) continue

    const rows = items.map(item => ({
      'CODIGO AX': item.codigoAx,
      'DESCRIPCION': item.descripcion,
      'TAMAÑO': item.tamano,
      'COLOR': item.color,
      'CANT. FISICA': item.cantidadFisica ?? '',
      'CANT. AX': item.cantidadAx ?? '',
      'DIFERENCIA': item.diferencia ?? '',
      'CONTENEDOR': item.container ?? '',
      'ESTADO': label,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [12, 40, 15, 15, 12, 12, 12, 12, 15].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31))
  }

  const allRows = []
  for (const { key, label } of categories) {
    for (const item of (results[key] || [])) {
      allRows.push({
        'CODIGO AX': item.codigoAx,
        'DESCRIPCION': item.descripcion,
        'TAMAÑO': item.tamano,
        'COLOR': item.color,
        'CANT. FISICA': item.cantidadFisica ?? '',
        'CANT. AX': item.cantidadAx ?? '',
        'DIFERENCIA': item.diferencia ?? '',
        'CONTENEDOR': item.container ?? '',
        'ESTADO': label,
      })
    }
  }
  if (allRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(allRows)
    ws['!cols'] = [12, 40, 15, 15, 12, 12, 12, 12, 15].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen General')
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  saveAs(blob, filename || `Comparacion_Inventarios_${formatDate()}.xlsx`)
}
