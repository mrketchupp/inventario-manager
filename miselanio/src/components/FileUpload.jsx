import { useState, useRef } from 'react'

export default function FileUpload({ label, description, onFile, loaded, summary }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
        dragging
          ? 'border-blue-400 bg-blue-400/10'
          : loaded
          ? 'border-green-500/50 bg-green-500/5'
          : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />
      <div className="text-3xl mb-2">{loaded ? '✅' : '📁'}</div>
      <h3 className="text-white font-semibold mb-1">{label}</h3>
      <p className="text-gray-400 text-sm mb-2">{description}</p>
      {loaded && summary && (
        <p className="text-green-400 text-sm font-medium">{summary}</p>
      )}
      {!loaded && (
        <p className="text-gray-500 text-xs">Arrastra un archivo .xlsx aquí o haz clic para seleccionar</p>
      )}
    </div>
  )
}
