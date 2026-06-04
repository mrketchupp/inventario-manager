import { useState, useMemo } from 'react'

export default function SortableTable({ columns, data, onRowClick, rowClassName }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (colKey) => {
    if (sortCol === colKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colKey)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortCol) return data
    return [...data].sort((a, b) => {
      const va = a[sortCol] ?? ''
      const vb = b[sortCol] ?? ''
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortCol, sortDir])

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-800/80 text-gray-300 text-xs uppercase tracking-wider">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="px-3 py-2 cursor-pointer hover:text-white transition-colors whitespace-nowrap select-none"
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                {col.label}
                {sortCol === col.key && (
                  <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-500">
                Sin datos
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={row._key || i}
                className={`hover:bg-gray-800/40 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowClassName ? rowClassName(row) : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
