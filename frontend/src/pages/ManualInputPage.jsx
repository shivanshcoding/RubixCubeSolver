import { useMemo, useState } from 'react'
import CubeNet from '../components/CubeNet.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { solveCube } from '../services/api.js'
import { useNavigate } from 'react-router-dom'

const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B']

const DEFAULT_FACE_GRIDS = {
  U: [['U','U','U'],['U','U','U'],['U','U','U']],
  R: [['R','R','R'],['R','R','R'],['R','R','R']],
  F: [['F','F','F'],['F','F','F'],['F','F','F']],
  D: [['D','D','D'],['D','D','D'],['D','D','D']],
  L: [['L','L','L'],['L','L','L'],['L','L','L']],
  B: [['B','B','B'],['B','B','B'],['B','B','B']],
}

const COLOR_PALETTE = [
  { face: 'U', color: '#ffffff', label: 'U - White' },
  { face: 'R', color: '#ff0000', label: 'R - Red' },
  { face: 'F', color: '#00ff00', label: 'F - Green' },
  { face: 'D', color: '#ffff00', label: 'D - Yellow' },
  { face: 'L', color: '#ffa500', label: 'L - Orange' },
  { face: 'B', color: '#0000ff', label: 'B - Blue' },
]

export default function ManualInputPage() {
  const navigate = useNavigate()
  const [faces, setFaces] = useState(DEFAULT_FACE_GRIDS)
  const [activeColor, setActiveColor] = useState('U')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const counts = useMemo(() => {
    const c = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
    FACE_NAMES.forEach((f) => {
      faces[f].flat().forEach((v) => {
        c[v] = (c[v] || 0) + 1
      })
    })
    return c
  }, [faces])

  function isCountsValid() {
    return FACE_NAMES.every((f) => counts[f] === 9)
  }

  function flattenFace(faceGrid) {
    return faceGrid.flat()
  }

  function buildCubeString() {
    const order = ['U','R','F','D','L','B']
    return order.map((f) => flattenFace(faces[f]).join('')).join('')
  }

  async function onSolve() {
    setError('')
    if (!isCountsValid()) {
      setError('Each face letter must appear exactly 9 times.')
      return
    }
    const cubeString = buildCubeString()
    setLoading(true)
    try {
      const res = await solveCube(cubeString)
      navigate('/solution', { state: { cubeString, ...res } })
    } catch (e) {
      setError(e?.response?.data?.detail?.error || 'Failed to solve.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Manual Input</h2>
      <p className="text-sm text-gray-600">Select a color and click stickers to paint. Centers are locked to canonical faces.</p>

      <div className="flex flex-wrap gap-2 items-center">
        {COLOR_PALETTE.map((item) => (
          <button
            key={item.face}
            className={`px-3 py-2 rounded border ${activeColor === item.face ? 'ring-2 ring-blue-600' : ''}`}
            onClick={() => setActiveColor(item.face)}
            style={{ backgroundColor: item.color }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <CubeNet faces={faces} setFaces={setFaces} activeColor={activeColor} />

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="mt-2">
        <button
          onClick={onSolve}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Solve Cube
        </button>
      </div>

      <LoadingOverlay visible={loading} messages={["Computing solution"]} />
    </div>
  )
}

