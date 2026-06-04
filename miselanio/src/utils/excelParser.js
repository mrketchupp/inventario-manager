import * as XLSX from 'xlsx'

const SHEET_REGEX = /CONTENEDOR\s*#?\s*(\d+)\s+(INVENTARIABLE|CONSUMIBLE)/i

const PHYSICAL_COLUMN_MAP = {
  'item': 'item',
  'codigo ax': 'codigoAx',
  'codigo_ax': 'codigoAx',
  'codigoax': 'codigoAx',
  'descripcion': 'descripcion',
  'descripción': 'descripcion',
  'tamano': 'tamano',
  'tamaño': 'tamano',
  'color': 'color',
  'np': 'np',
  'cantidad': 'cantidad',
  'um': 'um',
  'consumo': 'consumo',
  'ingreso': 'ingreso',
  'total': 'total',
}

const AX_COLUMN_MAP = {
  'codigo de articulo': 'codigoAx',
  'código de artículo': 'codigoAx',
  'codigo de artículo': 'codigoAx',
  'código de articulo': 'codigoAx',
  'nombre del articulo': 'descripcion',
  'nombre del artículo': 'descripcion',
  'tamano': 'tamano',
  'tamaño': 'tamano',
  'color': 'color',
  'disponible': 'cantidad',
}

function normalizeHeader(h) {
  return (h ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

function mapHeaders(row, columnMap) {
  const mapping = {}
  for (let i = 0; i < row.length; i++) {
    const normalized = normalizeHeader(row[i])
    if (columnMap[normalized]) {
      mapping[i] = columnMap[normalized]
    }
  }
  return mapping
}

function parseValue(val) {
  if (val === undefined || val === null) return ''
  return String(val).trim()
}

function parseNumber(val) {
  if (val === undefined || val === null || val === '') return 0
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

export function parsePhysicalInventory(fileBuffer) {
  const wb = XLSX.read(fileBuffer, { type: 'array', codepage: 65001 })
  const materials = []
  let id = 1

  for (const sheetName of wb.SheetNames) {
    const match = SHEET_REGEX.exec(sheetName)
    if (!match) continue

    const container = parseInt(match[1])
    const type = match[2].toUpperCase() === 'INVENTARIABLE' ? 'inventariable' : 'consumible'
    const sheet = wb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (data.length < 2) continue

    const headerRow = data[0]
    const headerMapping = mapHeaders(headerRow, PHYSICAL_COLUMN_MAP)

    for (let r = 1; r < data.length; r++) {
      const row = data[r]
      const record = { id: id++, container, type }

      for (const [colIdx, fieldName] of Object.entries(headerMapping)) {
        const val = row[parseInt(colIdx)]
        if (fieldName === 'cantidad' || fieldName === 'consumo' || fieldName === 'ingreso' || fieldName === 'total' || fieldName === 'item') {
          record[fieldName] = parseNumber(val)
        } else {
          record[fieldName] = parseValue(val)
        }
      }

      if (!record.codigoAx && !record.descripcion) continue
      materials.push(record)
    }
  }

  return materials
}

export function parseAXInventory(fileBuffer) {
  const wb = XLSX.read(fileBuffer, { type: 'array', codepage: 65001 })
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (data.length < 2) return []

  const headerRow = data[0]
  const headerMapping = mapHeaders(headerRow, AX_COLUMN_MAP)
  const materials = []
  let id = 1

  for (let r = 1; r < data.length; r++) {
    const row = data[r]
    const record = { id: id++ }

    for (const [colIdx, fieldName] of Object.entries(headerMapping)) {
      const val = row[parseInt(colIdx)]
      if (fieldName === 'cantidad') {
        record[fieldName] = parseNumber(val)
      } else {
        record[fieldName] = parseValue(val)
      }
    }

    if (!record.codigoAx) continue
    record.tamano = record.tamano || ''
    record.color = record.color || ''
    materials.push(record)
  }

  return materials
}

export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(new Uint8Array(e.target.result))
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
