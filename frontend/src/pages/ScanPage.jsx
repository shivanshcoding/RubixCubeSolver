import { useState } from 'react'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { scanFaces, solveCube } from '../services/api.js'
import { useNavigate } from 'react-router-dom'

export default function ScanPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState({ U: null, R: null, F: null, D: null, L: null, B: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function onFile(face, file) {
    setFiles((prev) => ({ ...prev, [face]: file }))
  }

  async function onScan() {
    setError('')
    if (Object.values(files).some((f) => !f)) {
      setError('Please upload all 6 face images.')
      return
    }
    setLoading(true)
    try {
      const scan = await scanFaces(files)
      const solve = await solveCube(scan.cubeString)
      navigate('/solution', { state: { cubeString: scan.cubeString, ...solve } })
    } catch (e) {
      setError(e?.response?.data?.detail?.error || 'Scan failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">AI (photo) Input</h2>
      <p className="text-sm text-gray-600">Upload face-on pictures of each face. We'll analyze colors and compute the cube string.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {['U','R','F','D','L','B'].map((f) => (
          <div key={f} className="bg-white rounded border p-3">
            <div className="mb-2 font-medium">Face {f}</div>
            <input type="file" accept="image/*" onChange={(e) => onFile(f, e.target.files?.[0] || null)} />
          </div>
        ))}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div>
        <button onClick={onScan} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Analyze & Solve</button>
      </div>

      <LoadingOverlay visible={loading} messages={["Analyzing cube", "Computing solution"]} />
    </div>
  )
}

